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

// requireAuth asli diuji di @iw3h/auth. Mirror kontrak (role segar dari DB) untuk
// menyuntik aktor → fokus tes = otorisasi & invarian di dalam route admin.
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

import { PUT as setJudgeTracks } from "@/app/api/admin/judge-tracks/route";
import { PUT as setPhase } from "@/app/api/admin/phase/route";
import { PUT as setStatus } from "@/app/api/admin/projects/[id]/status/route";
import { PUT as setRole } from "@/app/api/admin/users/role/route";
import { PUT as setWinner } from "@/app/api/admin/winners/route";

const login = (a: string | null) => {
  store.actor = a;
};
const statusReq = (id: string, status: string) =>
  setStatus(jsonReq({ status }), { params: Promise.resolve({ id }) });

async function seed() {
  const { createProject, ensureUser, setUserRole } = await import("@iw3h/db");
  const db = store.db;
  // H = hackathon aktif (baris pertama → getCurrentHackathon). H2 = edisi lain.
  await db.run(
    "INSERT INTO hackathons (id, slug, name, year, status) VALUES ('H','iw3h','H',2026,'judging')"
  );
  await db.run(
    "INSERT INTO hackathons (id, slug, name, year, status) VALUES ('H2','iw3h-2','H2',2025,'completed')"
  );
  await db.run("INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('ai','H','AI','AI')");
  await db.run("INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('ai2','H2','AI','AI')");
  await db.run("INSERT INTO prizes (id, hackathon_id, name) VALUES ('p1','H','Grand')");
  await db.run("INSERT INTO prizes (id, hackathon_id, name) VALUES ('p2','H2','Old')");
  for (const n of [1, 3, 5, 6, 7]) await ensureUser(db, addr(n));
  await setUserRole(db, addr(3), "judge");
  await setUserRole(db, addr(5), "admin");
  const projA = await createProject(db, {
    hackathonId: "H",
    submitterAddress: addr(6),
    teamId: null,
    input: { name: "Proj A" },
    trackIds: ["ai"],
  });
  const projB = await createProject(db, {
    hackathonId: "H2",
    submitterAddress: addr(7),
    teamId: null,
    input: { name: "Proj B (edisi lain)" },
    trackIds: ["ai2"],
  });
  return { projA: projA.id, projB: projB.id };
}

let ids: { projA: string; projB: string };
beforeEach(async () => {
  store.db = await makeDb();
  store.actor = null;
  ids = await seed();
});

describe("POV: Non-admin ditolak dari route admin", () => {
  it("anonim → 401", async () => {
    login(null);
    expect((await setPhase(jsonReq({ status: "judging" }))).status).toBe(401);
    expect((await setWinner(jsonReq({ prizeId: "p1", projectId: ids.projA }))).status).toBe(401);
    expect((await setRole(jsonReq({ address: addr(1), role: "judge" }))).status).toBe(401);
  });

  it("participant → 403", async () => {
    login(addr(1));
    expect((await setPhase(jsonReq({ status: "judging" }))).status).toBe(403);
    expect((await statusReq(ids.projA, "disqualified")).status).toBe(403);
    expect((await setWinner(jsonReq({ prizeId: "p1", projectId: ids.projA }))).status).toBe(403);
  });

  it("judge (bukan admin) → 403 di route admin", async () => {
    login(addr(3));
    expect((await setWinner(jsonReq({ prizeId: "p1", projectId: ids.projA }))).status).toBe(403);
  });
});

describe("POV: Admin", () => {
  beforeEach(() => login(addr(5)));

  it("set & ganti fase → 200", async () => {
    const res = await setPhase(jsonReq({ status: "completed" }));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("completed");
  });

  it("promote participant jadi judge → 200", async () => {
    const res = await setRole(jsonReq({ address: addr(1), role: "judge" }));
    expect(res.status).toBe(200);
    const { getUser } = await import("@iw3h/db");
    expect((await getUser(store.db, addr(1)))?.role).toBe("judge");
  });

  it("admin tidak bisa menurunkan role sendiri → 409 (anti-lockout)", async () => {
    expect((await setRole(jsonReq({ address: addr(5), role: "participant" }))).status).toBe(409);
  });

  it("assign track ke judge → 200, ke non-judge → 409", async () => {
    expect(
      (await setJudgeTracks(jsonReq({ judgeAddress: addr(3), trackIds: ["ai"] }))).status
    ).toBe(200);
    expect(
      (await setJudgeTracks(jsonReq({ judgeAddress: addr(1), trackIds: ["ai"] }))).status
    ).toBe(409);
  });

  it("set pemenang di hackathon aktif → 200", async () => {
    expect((await setWinner(jsonReq({ prizeId: "p1", projectId: ids.projA }))).status).toBe(200);
  });

  it("tolak prize dari hackathon lain → 404 (scoping)", async () => {
    expect((await setWinner(jsonReq({ prizeId: "p2", projectId: ids.projA }))).status).toBe(404);
  });

  it("tolak project dari hackathon lain → 404 (scoping)", async () => {
    expect((await setWinner(jsonReq({ prizeId: "p1", projectId: ids.projB }))).status).toBe(404);
  });

  it("disqualify menghapus project dari galeri DAN membersihkan winner", async () => {
    const { listSubmittedProjects, listWinners } = await import("@iw3h/db");
    // Jadikan pemenang dulu.
    expect((await setWinner(jsonReq({ prizeId: "p1", projectId: ids.projA }))).status).toBe(200);
    expect(await listWinners(store.db)).toHaveLength(1);
    // Diskualifikasi.
    expect((await statusReq(ids.projA, "disqualified")).status).toBe(200);
    expect((await listSubmittedProjects(store.db, "H")).some((p) => p.id === ids.projA)).toBe(
      false
    );
    expect(await listWinners(store.db)).toHaveLength(0); // winner ikut terhapus
  });
});
