import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getUser, schema, updateProfile } from "@iw3h/db";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { recoverMessageAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createSiweMessage, parseSiweMessage } from "viem/siwe";
import { beforeEach, describe, expect, it } from "vitest";
import { type CookieStore, createAuth } from "../src/auth";

const PASSWORD = "test-password-panjang-minimal-32-karakter!!";
const account = privateKeyToAccount(
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
);

/** Skema persis produksi: migrasi asli @iw3h/db yang di-apply. */
async function testDb() {
  const client = createClient({ url: ":memory:" });
  const dir = join(__dirname, "..", "..", "db", "migrations");
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    for (const stmt of readFileSync(join(dir, file), "utf8").split("--> statement-breakpoint")) {
      if (stmt.trim()) await client.execute(stmt);
    }
  }
  return drizzle(client, { schema });
}

function cookieJar(): CookieStore {
  const jar = new Map<string, string>();
  return {
    get: (name) => (jar.has(name) ? { name, value: jar.get(name) as string } : undefined),
    set: (...args: unknown[]) => {
      const first = args[0];
      if (typeof first === "object" && first !== null) {
        const c = first as { name: string; value: string };
        jar.set(c.name, c.value);
      } else {
        jar.set(first as string, args[1] as string);
      }
    },
  };
}

/** Verifikasi EOA offline supaya test tidak menyentuh RPC. */
async function offlineVerify({
  message,
  signature,
}: {
  message: string;
  signature: `0x${string}`;
}) {
  const parsed = parseSiweMessage(message);
  const recovered = await recoverMessageAddress({ message, signature });
  return recovered.toLowerCase() === parsed.address?.toLowerCase();
}

async function signIn(auth: ReturnType<typeof createAuth>, chainId = 56, tamper = false) {
  const nonce = await (await auth.handlers.nonce()).text();
  const message = createSiweMessage({
    address: account.address,
    chainId,
    domain: "localhost:3000",
    nonce,
    uri: "http://localhost:3000",
    version: "1",
  });
  let signature = await account.signMessage({ message });
  if (tamper) signature = `${signature.slice(0, -4)}beef` as typeof signature;
  return auth.handlers.verify(
    new Request("http://x/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ message, signature }),
    })
  );
}

describe("SIWE auth (integration)", () => {
  let db: Awaited<ReturnType<typeof testDb>>;
  let auth: ReturnType<typeof createAuth>;

  beforeEach(async () => {
    db = await testDb();
    const cookies = cookieJar();
    auth = createAuth({
      db,
      cookies: () => cookies,
      password: PASSWORD,
      cookieName: "test_session",
      verifySiwe: offlineVerify,
    });
  });

  it("alur lengkap: nonce → sign → verify → session → requireAuth", async () => {
    expect((await signIn(auth)).status).toBe(200);
    const session = await (await auth.handlers.session()).json();
    expect(session.address).toBe(account.address);
    const who = await auth.requireAuth();
    expect(who).not.toBeInstanceOf(Response);
    expect((who as { address: string }).address).toBe(account.address);
    expect((await getUser(db, account.address))?.role).toBe("participant");
  });

  it("tanpa session: 401", async () => {
    const res = await auth.requireAuth();
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(401);
  });

  it("RBAC: participant ditolak dari route admin, admin lolos", async () => {
    await signIn(auth);
    const denied = await auth.requireAuth("admin");
    expect((denied as Response).status).toBe(403);
    await db.run(`UPDATE users SET role = 'admin' WHERE address = '${account.address}'`);
    const allowed = await auth.requireAuth("admin");
    expect(allowed).not.toBeInstanceOf(Response);
  });

  it("signature yang diubah ditolak", async () => {
    const res = await signIn(auth, 56, true);
    expect(res.status).toBe(422);
    expect(await auth.handlers.session().then((r) => r.json())).toBeNull();
  });

  it("replay: verify kedua dengan nonce yang sama ditolak (nonce sekali pakai)", async () => {
    const nonce = await (await auth.handlers.nonce()).text();
    const message = createSiweMessage({
      address: account.address,
      chainId: 56,
      domain: "localhost:3000",
      nonce,
      uri: "http://localhost:3000",
      version: "1",
    });
    const signature = await account.signMessage({ message });
    const body = JSON.stringify({ message, signature });
    const req = () => new Request("http://x", { method: "POST", body });
    expect((await auth.handlers.verify(req())).status).toBe(200);
    expect((await auth.handlers.verify(req())).status).toBe(422);
  });

  it("chain di luar BNB family ditolak", async () => {
    expect((await signIn(auth, 1)).status).toBe(400);
  });

  it("domain binding: pesan untuk domain lain ditolak", async () => {
    const nonce = await (await auth.handlers.nonce()).text();
    const message = createSiweMessage({
      address: account.address,
      chainId: 56,
      domain: "situs-jahat.example",
      nonce,
      uri: "https://situs-jahat.example",
      version: "1",
    });
    const signature = await account.signMessage({ message });
    const res = await auth.handlers.verify(
      new Request("http://x", {
        method: "POST",
        headers: { host: "localhost:3000" },
        body: JSON.stringify({ message, signature }),
      })
    );
    expect(res.status).toBe(422);
  });

  it("signout menghapus session", async () => {
    await signIn(auth);
    await auth.handlers.signout();
    expect(await (await auth.handlers.session()).json()).toBeNull();
  });

  it("sign-in ulang tidak menimpa profil yang sudah diisi", async () => {
    await signIn(auth);
    await updateProfile(db, account.address, { username: "yanuar" });
    await auth.handlers.signout();
    await signIn(auth);
    expect((await getUser(db, account.address))?.username).toBe("yanuar");
  });
});
