import { type Db, ensureUser, getUser, type Role, rateLimit } from "@iw3h/db";
import { getIronSession } from "iron-session";
import { isAddress } from "viem";
import { generateSiweNonce, parseSiweMessage } from "viem/siwe";
import { z } from "zod";
import { publicClient, SIWE_CHAIN_IDS } from "./chains";

/**
 * IP klien untuk rate-limit. `x-forwarded-for` paling kiri BISA di-spoof
 * (attacker inject header, proxy append IP asli di kanan) — jadi utamakan
 * header hop-tunggal yang di-set platform, dan ambil elemen paling KANAN
 * dari XFF (hop tepercaya terakhir) sebagai fallback.
 * ponytail: cocok untuk Vercel/Cloudflare; sesuaikan urutan header kalau proxy lain.
 */
export function clientIp(req: Request): string {
  // Hanya percaya header yang di-set edge/proxy platform (Vercel), bukan yang
  // bisa dikirim klien. cf-connecting-ip DIHAPUS: di luar Cloudflare ia
  // spoofable → penyerang bisa rotasi header untuk bypass rate-limit per-IP.
  const trusted = req.headers.get("x-vercel-forwarded-for") ?? req.headers.get("x-real-ip");
  if (trusted) return trusted.split(",")[0].trim();
  // Fallback (dev/platform lain): IP paling kiri = klien asli.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

export interface SessionData {
  address?: string;
  nonce?: string;
  chainId?: number;
}

/** Bentuk minimal cookie store Next (hasil `cookies()` dari next/headers). */
export interface CookieStore {
  get(name: string): { name: string; value: string } | undefined;
  // biome-ignore lint/suspicious/noExplicitAny: signature set() milik Next, kita hanya meneruskan
  set(...args: any[]): void;
}

export interface VerifySiweArgs {
  message: string;
  signature: `0x${string}`;
  chainId: number;
  nonce: string;
}

export interface AuthOptions {
  db: Db;
  /** () => cookies() dari next/headers — dioper supaya paket ini bebas dependensi Next. */
  cookies: () => CookieStore | Promise<CookieStore>;
  /** String atau thunk — thunk menunda baca env sampai request, bukan saat import. */
  password: string | (() => string);
  cookieName: string;
  /** Override untuk test; default verifikasi on-chain (EOA + smart account/ERC-6492). */
  verifySiwe?: (args: VerifySiweArgs) => Promise<boolean>;
}

const verifyBody = z.object({
  message: z.string().min(1).max(4096),
  signature: z.string().regex(/^0x[0-9a-fA-F]{2,10000}$/),
});

async function defaultVerifySiwe({ message, signature, chainId, nonce }: VerifySiweArgs) {
  return publicClient(chainId).verifySiweMessage({ message, signature, nonce });
}

export function createAuth(opts: AuthOptions) {
  const verifySiwe = opts.verifySiwe ?? defaultVerifySiwe;

  async function getSession() {
    return getIronSession<SessionData>(await opts.cookies(), {
      cookieName: opts.cookieName,
      password: typeof opts.password === "function" ? opts.password() : opts.password,
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 hari
      },
    });
  }

  /**
   * RBAC: satu-satunya pintu autentikasi + otorisasi untuk route handler.
   * Alamat SELALU dari session cookie (bukan body/query); role SELALU
   * dibaca segar dari DB (bukan claim yang bisa basi).
   */
  async function requireAuth(
    ...roles: Role[]
  ): Promise<{ address: string; role: Role } | Response> {
    const session = await getSession();
    if (!session.address) {
      return Response.json({ error: "Belum sign-in" }, { status: 401 });
    }
    const user = await getUser(opts.db, session.address);
    if (!user) {
      return Response.json({ error: "User tidak ditemukan" }, { status: 401 });
    }
    const role = user.role as Role;
    if (roles.length > 0 && !roles.includes(role)) {
      return Response.json({ error: "Tidak punya akses" }, { status: 403 });
    }
    return { address: user.address, role };
  }

  const handlers = {
    /** GET /api/auth/nonce — nonce sekali pakai, diikat ke session. */
    nonce: async (): Promise<Response> => {
      const session = await getSession();
      session.nonce = generateSiweNonce();
      await session.save();
      return new Response(session.nonce, { headers: { "content-type": "text/plain" } });
    },

    /** POST /api/auth/verify — verifikasi SIWE lalu terbitkan session. */
    verify: async (req: Request): Promise<Response> => {
      // Verifikasi signature itu mahal (RPC) — batasi per IP sebelum kerja apa pun.
      const limit = await rateLimit(opts.db, `auth:${clientIp(req)}`, 10);
      if (!limit.ok) {
        return Response.json({ error: "Terlalu banyak percobaan" }, { status: 429 });
      }

      const parsed = verifyBody.safeParse(await req.json().catch(() => null));
      if (!parsed.success) {
        return Response.json({ error: "Body tidak valid" }, { status: 400 });
      }
      const { message, signature } = parsed.data;

      const session = await getSession();
      const siwe = parseSiweMessage(message);
      if (!siwe.address || !isAddress(siwe.address) || !siwe.chainId || !siwe.nonce) {
        return Response.json({ error: "Pesan SIWE tidak valid" }, { status: 400 });
      }
      // Domain binding: pesan harus ditandatangani untuk domain kita, bukan situs lain
      // yang me-relay pesan SIWE milik kita (phishing). Sumber kebenaran = allowlist
      // dari env (AUTH_ALLOWED_DOMAINS), BUKAN header request yang bisa dipalsukan.
      // Fallback ke host header hanya kalau allowlist tak diset (dev), dan tetap reject
      // saat host tak diketahui (fail-closed) — bukan skip.
      const allowed = (process.env.AUTH_ALLOWED_DOMAINS ?? "")
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      if (allowed.length > 0) {
        if (!siwe.domain || !allowed.includes(siwe.domain)) {
          return Response.json({ error: "Domain pesan tidak diizinkan" }, { status: 422 });
        }
      } else {
        const host = req.headers.get("host");
        if (!host || siwe.domain !== host) {
          return Response.json({ error: "Domain pesan tidak cocok" }, { status: 422 });
        }
      }
      if (!SIWE_CHAIN_IDS.includes(siwe.chainId)) {
        return Response.json({ error: "Chain tidak didukung" }, { status: 400 });
      }
      // Nonce harus yang kita terbitkan di session ini — menutup replay attack.
      if (!session.nonce || siwe.nonce !== session.nonce) {
        return Response.json({ error: "Nonce tidak cocok" }, { status: 422 });
      }
      if (siwe.expirationTime && siwe.expirationTime.getTime() < Date.now()) {
        return Response.json({ error: "Pesan kedaluwarsa" }, { status: 422 });
      }

      let valid = false;
      try {
        valid = await verifySiwe({
          message,
          signature: signature as `0x${string}`,
          chainId: siwe.chainId,
          nonce: session.nonce,
        });
      } catch {
        valid = false;
      }
      if (!valid) {
        return Response.json({ error: "Signature tidak valid" }, { status: 422 });
      }

      await ensureUser(opts.db, siwe.address);
      session.address = siwe.address;
      session.chainId = siwe.chainId;
      session.nonce = undefined; // sekali pakai
      await session.save();
      return Response.json({ address: siwe.address, chainId: siwe.chainId });
    },

    /** GET /api/auth/session — dibaca modal AppKit. */
    session: async (): Promise<Response> => {
      const session = await getSession();
      if (!session.address) return Response.json(null);
      return Response.json({ address: session.address, chainId: session.chainId ?? 1 });
    },

    /** POST /api/auth/signout */
    signout: async (): Promise<Response> => {
      const session = await getSession();
      session.destroy();
      return Response.json({ ok: true });
    },
  };

  return { getSession, requireAuth, handlers };
}

export type Auth = ReturnType<typeof createAuth>;
