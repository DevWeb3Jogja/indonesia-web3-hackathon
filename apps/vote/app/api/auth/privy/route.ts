import { ensureUser, rateLimit } from "@iw3h/db";
import { NextResponse } from "next/server";
import { pickWalletAddress, privy } from "@/lib/privy";
import { auth } from "@/lib/session";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const BSC_CHAIN_ID = 56;

/**
 * POST /api/auth/privy — tukar access token Privy dengan session cookie kita.
 * Token diverifikasi di server (JWKS app Privy); alamat diambil dari data user di
 * server Privy, BUKAN dari body → klien tak bisa mengaku alamat orang lain.
 * Setelah itu sama persis dengan login SIWE: users + session.address, sehingga
 * aturan vote (sekali per alamat, bukan project sendiri) tak berubah.
 */
export async function POST(req: Request) {
  const client = privy();
  if (!client) {
    return NextResponse.json({ error: "Login belum dikonfigurasi" }, { status: 503 });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Token kosong" }, { status: 401 });

  let userId: string;
  try {
    userId = (await client.utils().auth().verifyAccessToken(token)).user_id;
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  // Per user Privy, BUKAN per IP: penonton demo day satu WiFi venue (satu IP publik).
  const limit = await rateLimit(db, `auth:privy:${userId}`, 10);
  if (!limit.ok) {
    return NextResponse.json({ error: "Terlalu banyak percobaan" }, { status: 429 });
  }

  let user = await client.users()._get(userId);
  let address = pickWalletAddress(user);
  if (!address) {
    // Login email/Google tanpa wallet → buatkan wallet embedded di server (klien
    // tak membuat wallet sendiri, jadi tak ada balapan dua wallet).
    user = await client.users().pregenerateWallets(userId, {
      wallets: [{ chain_type: "ethereum" }],
    });
    address = pickWalletAddress(user);
  }
  if (!address) {
    return NextResponse.json({ error: "Wallet belum siap, coba lagi" }, { status: 502 });
  }

  await ensureUser(db, address);
  const session = await auth.getSession();
  session.address = address;
  session.chainId = BSC_CHAIN_ID;
  session.nonce = undefined;
  await session.save();
  return NextResponse.json({ address });
}
