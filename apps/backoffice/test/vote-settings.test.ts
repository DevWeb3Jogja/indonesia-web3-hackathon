import { beforeEach, describe, expect, it, vi } from "vitest";
import { addr, jsonReq, makeDb } from "./helpers";

const store = vi.hoisted(() => ({
  db: null as unknown as Awaited<ReturnType<typeof import("./helpers").makeDb>>,
  actor: null as string | null,
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

vi.mock("@/lib/auth", () => ({
  requireAuth: async (...roles: string[]) => {
    const { getUser } = await import("@iw3h/db");
    if (!store.actor) return Response.json({ error: "Belum sign-in" }, { status: 401 });
    const u = await getUser(store.db, store.actor);
    if (!u) return Response.json({ error: "User tidak ditemukan" }, { status: 401 });
    if (roles.length > 0 && !roles.includes(u.role)) {
      return Response.json({ error: "Tidak punya akses" }, { status: 403 });
    }
    return { address: u.address, role: u.role };
  },
}));

import { PUT } from "@/app/api/admin/vote-settings/route";

const ADMIN = addr(1);
const JUDGE = addr(2);

const flags = async () =>
  (
    await store.db.run(
      "SELECT voting_open AS v, leaderboard_public AS l FROM hackathons WHERE id = 'H'"
    )
  ).rows[0];

beforeEach(async () => {
  store.db = await makeDb();
  store.actor = null;
  const { ensureUser, setUserRole } = await import("@iw3h/db");
  await store.db.run(
    "INSERT INTO hackathons (id, slug, name, year, status) VALUES ('H','iw3h','H',2026,'judging')"
  );
  for (const a of [ADMIN, JUDGE]) await ensureUser(store.db, a);
  await setUserRole(store.db, ADMIN, "admin");
  await setUserRole(store.db, JUDGE, "judge");
});

describe("PUT /api/admin/vote-settings", () => {
  it("anon 401; non-admin 403", async () => {
    expect((await PUT(jsonReq({ votingOpen: true }))).status).toBe(401);
    store.actor = JUDGE;
    expect((await PUT(jsonReq({ votingOpen: true }))).status).toBe(403);
  });

  it("admin buka/tutup voting", async () => {
    store.actor = ADMIN;
    expect((await PUT(jsonReq({ votingOpen: true }))).status).toBe(200);
    expect(Number((await flags()).v)).toBe(1);
    expect((await PUT(jsonReq({ votingOpen: false }))).status).toBe(200);
    expect(Number((await flags()).v)).toBe(0);
  });

  it("leaderboardPublic tidak diterima lagi (400) dan kolomnya tak tersentuh", async () => {
    store.actor = ADMIN;
    expect((await PUT(jsonReq({ leaderboardPublic: true }))).status).toBe(400);
    expect((await PUT(jsonReq({ votingOpen: true, leaderboardPublic: true }))).status).toBe(400);
    expect((await PUT(jsonReq({}))).status).toBe(400);
    expect(Number((await flags()).l)).toBe(0);
    expect(Number((await flags()).v)).toBe(0);
  });
});
