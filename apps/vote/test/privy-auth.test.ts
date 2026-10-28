import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createDb, type Db, getUser } from "@iw3h/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** DB in-memory dengan skema PERSIS produksi (migrasi asli @iw3h/db). */
async function makeDb(): Promise<Db> {
  const db = createDb(":memory:");
  const dir = join(__dirname, "..", "..", "..", "packages", "db", "migrations");
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    for (const stmt of readFileSync(join(dir, file), "utf8").split("--> statement-breakpoint")) {
      if (stmt.trim()) await db.$client.execute(stmt);
    }
  }
  return db;
}

type Account = Record<string, unknown>;
const store = vi.hoisted(() => ({
  db: null as unknown as Db,
  session: {} as Record<string, unknown>,
  configured: true,
  accounts: [] as Record<string, unknown>[],
  pregenerated: 0,
}));

vi.mock("@/lib/turso", () => ({
  db: new Proxy(
    {},
    {
      get(_t, prop) {
        const v = Reflect.get(store.db as object, prop, store.db);
        return typeof v === "function" ? v.bind(store.db) : v;
      },
    }
  ),
}));

vi.mock("@/lib/session", () => ({
  auth: {
    getSession: async () =>
      Object.assign(store.session, {
        save: async () => {},
      }),
  },
}));

// Klien Privy palsu: token "good" = user did:privy:u1; linked_accounts dari store.
vi.mock("@/lib/privy", async (orig) => {
  const real = await orig<typeof import("@/lib/privy")>();
  const fake = {
    utils: () => ({
      auth: () => ({
        verifyAccessToken: async (t: string) => {
          if (t !== "good") throw new Error("invalid");
          return { user_id: "did:privy:u1" };
        },
      }),
    }),
    users: () => ({
      _get: async () => ({ linked_accounts: store.accounts }),
      pregenerateWallets: async () => {
        store.pregenerated++;
        store.accounts.push(embedded(EMBEDDED));
        return { linked_accounts: store.accounts };
      },
    }),
  };
  return { ...real, privy: () => (store.configured ? fake : null) };
});

import { POST } from "@/app/api/auth/privy/route";
import { pickWalletAddress } from "@/lib/privy";

const EXTERNAL = "0x00000000000000000000000000000000000000Aa";
const EMBEDDED = "0x00000000000000000000000000000000000000Bb";
const external = (address: string): Account => ({
  type: "wallet",
  chain_type: "ethereum",
  address,
  wallet_client: "unknown",
  wallet_client_type: "metamask",
});
const embedded = (address: string): Account => ({
  type: "wallet",
  chain_type: "ethereum",
  address,
  wallet_client: "privy",
  wallet_client_type: "privy",
  connector_type: "embedded",
});
const email: Account = { type: "email", address: "a@b.co" };

const call = (token?: string) =>
  POST(
    new Request("http://test/api/auth/privy", {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
  );

beforeEach(async () => {
  store.db = await makeDb();
  store.session = {};
  store.configured = true;
  store.accounts = [];
  store.pregenerated = 0;
});

describe("pickWalletAddress", () => {
  const pick = (accounts: Account[]) =>
    pickWalletAddress({ linked_accounts: accounts } as unknown as Parameters<
      typeof pickWalletAddress
    >[0]);

  it("wallet eksternal didahulukan dari embedded", () => {
    expect(pick([email, embedded(EMBEDDED), external(EXTERNAL)])).toBe(EXTERNAL);
  });
  it("tanpa wallet eksternal → embedded", () => {
    expect(pick([email, embedded(EMBEDDED)])).toBe(EMBEDDED);
  });
  it("abaikan wallet non-EVM; tanpa wallet → null", () => {
    expect(pick([{ type: "wallet", chain_type: "solana", address: "So1" }, email])).toBeNull();
  });
});

describe("POST /api/auth/privy", () => {
  it("belum dikonfigurasi → 503", async () => {
    store.configured = false;
    expect((await call("good")).status).toBe(503);
  });

  it("tanpa token / token salah → 401, session tak tersentuh", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("bad")).status).toBe(401);
    expect(store.session.address).toBeUndefined();
  });

  it("login wallet eksternal → session = alamat itu, user dibuat, tanpa pregenerate", async () => {
    store.accounts = [external(EXTERNAL)];
    const res = await call("good");
    expect(res.status).toBe(200);
    expect(store.session.address).toBe(EXTERNAL);
    expect(store.session.chainId).toBe(56);
    expect(await getUser(store.db, EXTERNAL)).not.toBeNull();
    expect(store.pregenerated).toBe(0);
  });

  it("login email tanpa wallet → server membuat wallet embedded sekali", async () => {
    store.accounts = [email];
    expect((await call("good")).status).toBe(200);
    expect(store.session.address).toBe(EMBEDDED);
    expect(store.pregenerated).toBe(1);
    // Login ulang memakai wallet yang sama, tidak membuat lagi.
    expect((await call("good")).status).toBe(200);
    expect(store.session.address).toBe(EMBEDDED);
    expect(store.pregenerated).toBe(1);
  });

  it("rate limit per user Privy (bukan per IP)", async () => {
    store.accounts = [external(EXTERNAL)];
    for (let i = 0; i < 10; i++) expect((await call("good")).status).toBe(200);
    expect((await call("good")).status).toBe(429);
  });
});
