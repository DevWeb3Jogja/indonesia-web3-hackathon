import { beforeEach, describe, expect, it, vi } from "vitest";
import { addr, makeDb } from "./helpers";

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
  // Dipakai pageUser (guard page) — session = aktor test.
  auth: { getSession: async () => ({ address: store.actor ?? undefined }) },
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

import AuditPage from "@/app/(dashboard)/audit/page";
import ConfigPage from "@/app/(dashboard)/config/page";
import JudgingPage from "@/app/(dashboard)/judging/page";
import OverviewPage from "@/app/(dashboard)/page";
import ProjectsPage from "@/app/(dashboard)/projects/page";
import UsersPage from "@/app/(dashboard)/users/page";
import { DELETE as critDelete, PUT as critPut } from "@/app/api/admin/criteria/[id]/route";
import { POST as critPost } from "@/app/api/admin/criteria/route";
import { GET as exportGet } from "@/app/api/admin/judging/export/route";
import { PUT as orgPut } from "@/app/api/admin/judging/organizer-score/route";
import { GET as boardGet } from "@/app/api/admin/judging/route";

const PARTICIPANT = addr(1);
const JUDGE = addr(2);
const PANITIA = addr(3);
const JUDGE2 = addr(4);
const ADMIN = addr(5);

const login = (a: string | null) => {
  store.actor = a;
};
const req = (method: string, b?: unknown, url = "http://test/x") =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: b === undefined ? undefined : JSON.stringify(b),
  });
const withId = (id: string) => ({ params: Promise.resolve({ id }) });

let finalist = "";
let other = "";

beforeEach(async () => {
  store.db = await makeDb();
  store.actor = null;
  const { createProject, ensureUser, markDemoDay, saveJudgeScores, setUserRole } = await import(
    "@iw3h/db"
  );
  const db = store.db;
  await db.run(
    "INSERT INTO hackathons (id, slug, name, year, status) VALUES ('H','iw3h','H',2026,'judging')"
  );
  await db.run("INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('ai','H','T1','AI')");
  await db.run("INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('fin','H','T2','Fin')");
  await db.run(
    "INSERT INTO criteria (id, hackathon_id, name, weight, sort) VALUES ('inn','H','=Innovative',20,1)"
  );
  await db.run(
    "INSERT INTO criteria (id, hackathon_id, name, weight, sort, filled_by) VALUES ('part','H','Participation',5,2,'organizer')"
  );
  for (const a of [PARTICIPANT, JUDGE, PANITIA, JUDGE2, ADMIN, addr(10), addr(11)]) {
    await ensureUser(db, a);
  }
  await setUserRole(db, JUDGE, "judge");
  await setUserRole(db, JUDGE2, "judge");
  await setUserRole(db, PANITIA, "panitia");
  await setUserRole(db, ADMIN, "admin");
  finalist = (
    await createProject(db, {
      hackathonId: "H",
      submitterAddress: addr(10),
      teamId: null,
      input: { name: "=HYPERLINK(evil)" },
      trackIds: ["ai"],
    })
  ).id;
  other = (
    await createProject(db, {
      hackathonId: "H",
      submitterAddress: addr(11),
      teamId: null,
      input: { name: "Bukan finalis" },
      trackIds: ["fin"],
    })
  ).id;
  await markDemoDay(db, finalist, true);
  await saveJudgeScores(db, {
    hackathonId: "H",
    projectId: finalist,
    judge: JUDGE,
    entries: [{ criterionId: "inn", score: 4 }],
    teamNote: "+SUM(1)",
    internalNote: "RAHASIA-INTERNAL",
  });
});

// Semua page (dashboard): yang memuat data di server WAJIB guard sendiri — layout
// dirender paralel dan TIDAK mencegah payload RSC page terkirim.
const PAGES = [
  ["/", OverviewPage],
  ["/judging", JudgingPage],
  ["/config", ConfigPage],
  ["/projects", ProjectsPage],
  ["/users", UsersPage],
  ["/audit", AuditPage],
] as const;

describe("guard page (dashboard)", () => {
  for (const [path, Page] of PAGES) {
    it(`${path}: anon, participant, judge, panitia → null; admin → konten`, async () => {
      for (const who of [null, PARTICIPANT, JUDGE, PANITIA]) {
        login(who);
        expect(await Page()).toBeNull();
      }
      login(ADMIN);
      expect(await Page()).not.toBeNull();
    });
  }

  it("/judging admin: rekap memuat nilai & catatan; non-admin tak dapat apa pun", async () => {
    login(ADMIN);
    const raw = JSON.stringify(await JudgingPage());
    expect(raw).toContain("RAHASIA-INTERNAL");
    expect(raw).toContain("=HYPERLINK(evil)");
    login(JUDGE);
    expect(JSON.stringify(await JudgingPage())).not.toContain("RAHASIA-INTERNAL");
  });
});

describe("RBAC API penjurian final (admin saja)", () => {
  it("anon 401; participant, judge, panitia 403", async () => {
    const calls = () => [
      boardGet(),
      orgPut(req("PUT", { projectId: finalist, criterionId: "part", score: 3 })),
      exportGet(req("GET")),
    ];
    login(null);
    for (const r of await Promise.all(calls())) expect(r.status).toBe(401);
    for (const who of [PARTICIPANT, JUDGE, PANITIA]) {
      login(who);
      for (const r of await Promise.all(calls())) expect(r.status).toBe(403);
    }
    const n = await store.db.run("SELECT count(*) AS n FROM organizer_scores");
    expect(Number(n.rows[0].n)).toBe(0);
  });
});

describe("rekap & nilai panitia", () => {
  it("GET rekap: hanya finalis, juri masuk x/N, catatan juri", async () => {
    login(ADMIN);
    const json = await (await boardGet()).json();
    expect(json.rows).toHaveLength(1);
    const r = json.rows[0];
    expect(r.id).toBe(finalist);
    expect(r.values.inn).toBe(4);
    expect(r.judgesIn).toBe(1);
    expect(r.judgesEligible).toBe(2);
    expect(r.complete).toBe(false); // Participation belum diisi
    expect(r.notes[0].internalNote).toBe("RAHASIA-INTERNAL");
  });

  it("PUT nilai panitia: set → nilai akhir berubah, kosongkan, audit", async () => {
    login(ADMIN);
    const res = await orgPut(req("PUT", { projectId: finalist, criterionId: "part", score: 2 }));
    expect(res.status).toBe(200);
    let r = (await (await boardGet()).json()).rows[0];
    expect(r.values.part).toBe(2);
    // Semua kriteria bernilai, tapi baru 1 dari 2 juri yang masuk → belum lengkap.
    expect(r.judgesIn).toBeLessThan(r.judgesEligible);
    expect(r.complete).toBe(false);
    expect(r.score).toBeCloseTo((4 * 20 + 2 * 5) / 25);
    expect(
      (await orgPut(req("PUT", { projectId: finalist, criterionId: "part", score: null }))).status
    ).toBe(200);
    r = (await (await boardGet()).json()).rows[0];
    expect(r.values.part).toBeUndefined();
    const audit = await store.db.run(
      "SELECT action FROM audit_logs WHERE action LIKE 'judging.organizer_score%' ORDER BY id"
    );
    expect(audit.rows.map((a) => a.action)).toEqual([
      "judging.organizer_score",
      "judging.organizer_score.clear",
    ]);
  });

  it("tolak: kriteria juri 400, nilai di luar 1..5 400, non-finalis 404, completed 409", async () => {
    login(ADMIN);
    const put = (b: unknown) => orgPut(req("PUT", b));
    expect((await put({ projectId: finalist, criterionId: "inn", score: 3 })).status).toBe(400);
    expect((await put({ projectId: finalist, criterionId: "nope", score: 3 })).status).toBe(400);
    for (const score of [0, 6, 2.5, "3"]) {
      expect((await put({ projectId: finalist, criterionId: "part", score })).status).toBe(400);
    }
    expect((await put({ projectId: other, criterionId: "part", score: 3 })).status).toBe(404);
    await store.db.run("UPDATE hackathons SET status='completed' WHERE id='H'");
    expect((await put({ projectId: finalist, criterionId: "part", score: 3 })).status).toBe(409);
    const n = await store.db.run("SELECT count(*) AS n FROM organizer_scores");
    expect(Number(n.rows[0].n)).toBe(0);
  });

  it("export CSV: teks peserta, nama kriteria & catatan dinetralkan dari formula", async () => {
    // Username juri juga dikendalikan pengguna → ikut dinetralkan di kolom catatan.
    await store.db.run(`UPDATE users SET username='=juri' WHERE address='${JUDGE}'`);
    login(ADMIN);
    await orgPut(req("PUT", { projectId: finalist, criterionId: "part", score: 2 }));
    const res = await exportGet(req("GET"));
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toContain("'=HYPERLINK(evil)");
    expect(csv).toContain("'=Innovative (w20)");
    expect(csv).toContain("'=juri: +SUM(1)");
    expect(csv).not.toMatch(/,\+SUM/);
    expect(csv).not.toMatch(/,=HYPERLINK/);
    expect(csv).toContain("3.600"); // (4*20 + 2*5)/25
    expect(csv).toContain("RAHASIA-INTERNAL");
    // ?track= di luar finalis → kosong (hanya header)
    const fin = await (await exportGet(req("GET", undefined, "http://test/x?track=fin"))).text();
    expect(fin).not.toContain("HYPERLINK");
  });
});

describe("kriteria: filled_by lewat API config", () => {
  it("POST/PUT menerima judge|organizer, menolak nilai lain", async () => {
    login(ADMIN);
    const ok = await critPost(req("POST", { name: "Pitching", weight: 10, filledBy: "organizer" }));
    expect(ok.status).toBe(201);
    const { id } = await ok.json();
    expect((await critPost(req("POST", { name: "X lain", filledBy: "panitia" }))).status).toBe(400);
    expect((await critPut(req("PUT", { filledBy: "judge" }), withId(id))).status).toBe(200);
    expect((await critPut(req("PUT", { filledBy: "admin" }), withId(id))).status).toBe(400);
    const r = await store.db.run(`SELECT filled_by FROM criteria WHERE id='${id}'`);
    expect(r.rows[0].filled_by).toBe("judge");
    // default tetap judge
    const d = await (await critPost(req("POST", { name: "Default" }))).json();
    const r2 = await store.db.run(`SELECT filled_by FROM criteria WHERE id='${d.id}'`);
    expect(r2.rows[0].filled_by).toBe("judge");
  });

  it("hapus kriteria yang sudah punya nilai panitia → 409", async () => {
    login(ADMIN);
    await orgPut(req("PUT", { projectId: finalist, criterionId: "part", score: 2 }));
    expect((await critDelete(req("DELETE"), withId("part"))).status).toBe(409);
  });
});
