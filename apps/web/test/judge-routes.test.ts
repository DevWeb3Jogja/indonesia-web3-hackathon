import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createDb, type Db } from "@iw3h/db";
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

const store = vi.hoisted(() => ({ db: null as unknown as Db, actor: null as string | null }));

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

// requireAuth asli diuji di @iw3h/auth. Mirror kontrak (role segar dari DB).
vi.mock("@/lib/session", () => ({
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

import { GET as dataGet } from "@/app/api/judge/data/route";
import { PUT as scoresPut } from "@/app/api/judge/scores/route";

const addr = (n: number) => `0x${n.toString(16).padStart(40, "0")}`;
const PARTICIPANT = addr(1);
const J1 = addr(2);
const J2 = addr(3);
const PANITIA = addr(4);
const ADMIN = addr(5);

const login = (a: string | null) => {
  store.actor = a;
};
const put = (b: unknown) =>
  scoresPut(
    new Request("http://test/api/judge/scores", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(b),
    })
  );
const full = (inn = 4, des = 3) => [
  { criterionId: "inn", score: inn },
  { criterionId: "des", score: des },
];

let finalist = "";
let notFinalist = "";
let otherEdition = "";

beforeEach(async () => {
  store.db = await makeDb();
  store.actor = null;
  const { createProject, ensureUser, markDemoDay, setUserRole } = await import("@iw3h/db");
  const db = store.db;
  await db.run(
    "INSERT INTO hackathons (id, slug, name, year, status) VALUES ('H','iw3h','H',2026,'judging')"
  );
  await db.run(
    "INSERT INTO hackathons (id, slug, name, year, status) VALUES ('H2','old','H2',2025,'judging')"
  );
  await db.run("INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('ai','H','T1','AI')");
  await db.run("INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('fin','H','T2','Fin')");
  await db.run("INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('ox','H2','T1','AI')");
  await db.run(
    "INSERT INTO criteria (id, hackathon_id, name, description, weight, sort) VALUES ('inn','H','Innovative','Seberapa baru',20,1)"
  );
  await db.run(
    "INSERT INTO criteria (id, hackathon_id, name, weight, sort) VALUES ('des','H','Design',15,2)"
  );
  await db.run(
    "INSERT INTO criteria (id, hackathon_id, name, weight, sort, filled_by) VALUES ('part','H','Participation',5,3,'organizer')"
  );
  for (const a of [PARTICIPANT, J1, J2, PANITIA, ADMIN, addr(10), addr(11), addr(12)]) {
    await ensureUser(db, a);
  }
  await setUserRole(db, J1, "judge");
  await setUserRole(db, J2, "judge");
  await setUserRole(db, PANITIA, "panitia");
  await setUserRole(db, ADMIN, "admin");
  const mk = async (n: number, name: string, hackathonId = "H", trackIds = ["ai"]) =>
    (
      await createProject(db, {
        hackathonId,
        submitterAddress: addr(n),
        teamId: null,
        input: { name },
        trackIds,
      })
    ).id;
  finalist = await mk(10, "Finalis");
  notFinalist = await mk(11, "Bukan finalis");
  otherEdition = await mk(12, "Edisi lain", "H2", ["ox"]);
  await markDemoDay(db, finalist, true);
  await markDemoDay(db, otherEdition, true);
});

describe("RBAC /api/judge/*", () => {
  it("GET data: anon 401; participant & panitia 403; judge & admin 200", async () => {
    login(null);
    expect((await dataGet()).status).toBe(401);
    for (const who of [PARTICIPANT, PANITIA]) {
      login(who);
      expect((await dataGet()).status).toBe(403);
    }
    login(J1);
    expect((await dataGet()).status).toBe(200);
    login(ADMIN);
    const res = await dataGet();
    expect(res.status).toBe(200);
    expect((await res.json()).readOnly).toBe(true);
  });

  it("PUT scores: anon 401; participant, panitia, admin 403 (hanya juri)", async () => {
    const body = { projectId: finalist, entries: full() };
    login(null);
    expect((await put(body)).status).toBe(401);
    for (const who of [PARTICIPANT, PANITIA, ADMIN]) {
      login(who);
      expect((await put(body)).status).toBe(403);
    }
    login(J1);
    expect((await put(body)).status).toBe(200);
  });
});

describe("GET /api/judge/data", () => {
  it("hanya finalis edisi ini + kriteria juri (organizer tersembunyi) dengan bobot %", async () => {
    login(J1);
    const json = await (await dataGet()).json();
    expect(json.projects.map((p: { id: string }) => p.id)).toEqual([finalist]);
    expect(json.criteria.map((c: { id: string }) => c.id)).toEqual(["inn", "des"]);
    expect(json.criteria[0]).toMatchObject({ description: "Seberapa baru", weight: 20 });
    expect(json.criteria[0].weightPct).toBeCloseTo(50); // 20 / (20+15+5)
    expect(json.canScore).toBe(true);
    expect(json.readOnly).toBe(false);
  });

  it("hanya nilai & catatan milik juri yang login (tak bocor milik juri lain)", async () => {
    login(J2);
    await put({
      projectId: finalist,
      entries: full(5, 5),
      teamNote: "NOTE-J2",
      internalNote: "INTERNAL-J2",
    });
    login(J1);
    await put({ projectId: finalist, entries: full(2, 1), teamNote: "NOTE-J1" });
    const json = await (await dataGet()).json();
    expect(json.scores[finalist]).toEqual({ inn: 2, des: 1 });
    expect(json.notes[finalist]).toEqual({ teamNote: "NOTE-J1", internalNote: null });
    const raw = JSON.stringify(json);
    expect(raw).not.toContain("NOTE-J2");
    expect(raw).not.toContain("INTERNAL-J2");
  });

  it("assignment track: juri track lain tak melihat finalis", async () => {
    const { setJudgeTracks } = await import("@iw3h/db");
    await setJudgeTracks(store.db, "H", J1, ["fin"]);
    login(J1);
    expect((await (await dataGet()).json()).projects).toEqual([]);
  });

  it("catatan lama di scores.comment tampil sebagai catatan INTERNAL (bukan untuk tim)", async () => {
    const { upsertScores } = await import("@iw3h/db");
    await upsertScores(store.db, finalist, J1, [
      { criterionId: "inn", score: 4, comment: "lama" },
      { criterionId: "des", score: 4, comment: "lama" },
    ]);
    login(J1);
    const json = await (await dataGet()).json();
    expect(json.notes[finalist]).toEqual({ teamNote: null, internalNote: "lama" });
  });

  it("nilai lama skala 1..10 (> 5) tidak di-prefill ke form", async () => {
    const { upsertScores } = await import("@iw3h/db");
    await upsertScores(store.db, finalist, J1, [
      { criterionId: "inn", score: 8 },
      { criterionId: "des", score: 4 },
    ]);
    login(J1);
    const json = await (await dataGet()).json();
    expect(json.scores[finalist]).toEqual({ des: 4 });
  });
});

describe("PUT /api/judge/scores (aturan server)", () => {
  it("fase tertutup → 409", async () => {
    login(J1);
    for (const s of ["submission", "completed"]) {
      await store.db.run(`UPDATE hackathons SET status='${s}' WHERE id='H'`);
      expect((await put({ projectId: finalist, entries: full() })).status).toBe(409);
    }
  });

  it("non-finalis, edisi lain, tak dikenal → 404", async () => {
    login(J1);
    for (const projectId of [notFinalist, otherEdition, "nope"]) {
      expect((await put({ projectId, entries: full() })).status).toBe(404);
    }
  });

  it("di luar track juri → 403", async () => {
    const { setJudgeTracks } = await import("@iw3h/db");
    await setJudgeTracks(store.db, "H", J1, ["fin"]);
    login(J1);
    expect((await put({ projectId: finalist, entries: full() })).status).toBe(403);
  });

  it("kriteria organizer, tak dikenal, kurang, dobel, di luar 1..5 → 400", async () => {
    login(J1);
    const bad = [
      [...full(), { criterionId: "part", score: 5 }],
      [
        { criterionId: "inn", score: 4 },
        { criterionId: "part", score: 5 },
      ],
      [
        { criterionId: "inn", score: 4 },
        { criterionId: "ghost", score: 5 },
      ],
      [{ criterionId: "inn", score: 4 }],
      [
        { criterionId: "inn", score: 4 },
        { criterionId: "inn", score: 4 },
      ],
      full(6, 3),
      full(0, 3),
      full(10, 3),
      full(2.5, 3),
    ];
    for (const entries of bad) {
      expect((await put({ projectId: finalist, entries })).status).toBe(400);
    }
    // Skala 1..5 sudah ditolak di validasi input route (lapis pertama), bukan baru di DB.
    const res = await put({ projectId: finalist, entries: full(6, 3) });
    expect((await res.json()).error).toBe("Input tidak valid");
    expect(
      (await put({ projectId: finalist, entries: full(), teamNote: "x".repeat(2001) })).status
    ).toBe(400);
    const r = await store.db.run("SELECT count(*) AS n FROM scores");
    expect(Number(r.rows[0].n)).toBe(0);
  });

  it("sukses: penilai dari session (judgeAddress di body diabaikan) + audit", async () => {
    login(J1);
    const res = await put({
      projectId: finalist,
      entries: full(5, 4),
      judgeAddress: J2,
      teamNote: "Mantap",
      internalNote: "Rahasia",
    });
    expect(res.status).toBe(200);
    const rows = await store.db.run("SELECT DISTINCT judge_address AS a FROM scores");
    expect(rows.rows.map((r) => r.a)).toEqual([J1]);
    const audit = await store.db.run(
      "SELECT actor_address AS a, action, detail FROM audit_logs WHERE action='judge.score'"
    );
    expect(audit.rows[0].a).toBe(J1);
    expect(String(audit.rows[0].detail)).not.toContain("Rahasia");
  });
});
