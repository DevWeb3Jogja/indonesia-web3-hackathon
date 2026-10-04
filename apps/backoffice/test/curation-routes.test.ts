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

import CurationPage from "@/app/(curation)/curation/page";
import { PUT as statusPut } from "@/app/api/admin/projects/[id]/status/route";
import { GET as exportGet } from "@/app/api/curation/export/route";
import { PUT as finalistPut } from "@/app/api/curation/finalists/route";
import { GET as detailGet } from "@/app/api/curation/projects/[id]/route";
import { PUT as reviewPut } from "@/app/api/curation/review/route";
import { PUT as reviewerPut } from "@/app/api/curation/reviewer/route";
import { PUT as screenPut } from "@/app/api/curation/screen/route";

const PARTICIPANT = addr(1);
const JUDGE = addr(2);
const PANITIA = addr(3);
const ADMIN = addr(5);

const login = (a: string | null) => {
  store.actor = a;
};
const put = (b: unknown) =>
  new Request("http://test/x", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(b),
  });
const withId = (id: string) => ({ params: Promise.resolve({ id }) });
const setStatus = (status: string) =>
  store.db.run(`UPDATE hackathons SET status = '${status}' WHERE id = 'H'`);

let projectId = "";
const full = [
  { criterionId: "inn", score: 4 },
  { criterionId: "des", score: 2 },
];

beforeEach(async () => {
  store.db = await makeDb();
  store.actor = null;
  const { createProject, ensureUser, setUserRole, updateProfile } = await import("@iw3h/db");
  const db = store.db;
  // Default: fase judging (kurasi terbuka).
  await db.run(
    "INSERT INTO hackathons (id, slug, name, year, status) VALUES ('H','iw3h','H',2026,'judging')"
  );
  await db.run("INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('ai','H','T1','AI')");
  await db.run(
    "INSERT INTO criteria (id, hackathon_id, name, weight, sort) VALUES ('inn','H','Innovative',20,1)"
  );
  await db.run(
    "INSERT INTO criteria (id, hackathon_id, name, weight, sort) VALUES ('des','H','Design',5,2)"
  );
  for (const a of [PARTICIPANT, JUDGE, PANITIA, ADMIN]) await ensureUser(db, a);
  await setUserRole(db, JUDGE, "judge");
  await setUserRole(db, PANITIA, "panitia");
  await setUserRole(db, ADMIN, "admin");
  await updateProfile(db, PARTICIPANT, {
    username: "alice",
    fullName: "Alice Rahasia",
    email: "alice@private.test",
    phone: "+6281234567890",
    city: "Klaten",
  });
  const p = await createProject(db, {
    hackathonId: "H",
    submitterAddress: PARTICIPANT,
    teamId: null,
    input: { name: "=HYPERLINK(evil)", tagline: "t", problemStatement: "problem" },
    trackIds: ["ai"],
  });
  projectId = p.id;
});

describe("RBAC kurasi", () => {
  it("anon 401; participant & judge 403 di SEMUA route kurasi", async () => {
    const calls = () => [
      reviewerPut(put({ organization: "coinvestasi" })),
      screenPut(put({ projectId, decision: "pass" })),
      reviewPut(put({ projectId, entries: full })),
      finalistPut(put({ projectId, slot: "main" })),
      detailGet(new Request("http://x"), withId(projectId)),
      exportGet(),
    ];
    login(null);
    for (const r of await Promise.all(calls())) expect(r.status).toBe(401);
    for (const who of [PARTICIPANT, JUDGE]) {
      login(who);
      for (const r of await Promise.all(calls())) expect(r.status).toBe(403);
    }
  });

  it("panitia: boleh saring & nilai, TIDAK boleh shortlist/export (admin saja)", async () => {
    login(PANITIA);
    expect((await reviewerPut(put({ organization: "binance-academy" }))).status).toBe(200);
    expect((await screenPut(put({ projectId, decision: "pass" }))).status).toBe(200);
    expect((await reviewPut(put({ projectId, entries: full }))).status).toBe(200);
    expect((await finalistPut(put({ projectId, slot: "main" }))).status).toBe(403);
    expect((await exportGet()).status).toBe(403);
  });

  it("detail untuk penilai: isi submission ada, data pribadi anggota TIDAK", async () => {
    login(PANITIA);
    const res = await detailGet(new Request("http://x"), withId(projectId));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.project.problemStatement).toBe("problem");
    expect(json.members[0].username).toBe("alice");
    const raw = JSON.stringify(json);
    for (const secret of ["alice@private.test", "+6281234567890", "Alice Rahasia", "Klaten"]) {
      expect(raw).not.toContain(secret);
    }
    expect(raw).not.toContain("demoDay");
    expect((await detailGet(new Request("http://x"), withId("nope"))).status).toBe(404);
  });
});

describe("guard page /curation (layout TIDAK mencegah page memuat data)", () => {
  it("anon, participant, judge → page tak memuat apa pun (null)", async () => {
    for (const who of [null, PARTICIPANT, JUDGE]) {
      login(who);
      expect(await CurationPage()).toBeNull();
    }
  });

  it("shortlist admin-only: props page panitia TANPA data finalis, admin dengan", async () => {
    login(ADMIN);
    await finalistPut(put({ projectId, slot: "main", note: "RAHASIA-SHORTLIST" }));
    expect(JSON.stringify(await CurationPage())).toContain("RAHASIA-SHORTLIST");
    login(PANITIA);
    const raw = JSON.stringify(await CurationPage());
    expect(raw).not.toContain("RAHASIA-SHORTLIST");
    expect(raw).not.toContain('"slot":"main"');
  });

  it("panitia & admin → page berisi data papan", async () => {
    for (const who of [PANITIA, ADMIN]) {
      login(who);
      const el = await CurationPage();
      expect(JSON.stringify(el)).toContain("=HYPERLINK(evil)");
    }
  });
});

describe("aturan kurasi lewat route", () => {
  it("organisasi wajib dipilih dulu (409) dan harus salah satu dari 3 (400)", async () => {
    login(PANITIA);
    expect((await screenPut(put({ projectId, decision: "pass" }))).status).toBe(409);
    expect((await reviewerPut(put({ organization: "google" }))).status).toBe(400);
  });

  it("fase: tertutup saat submission masih buka & saat completed → 409", async () => {
    login(ADMIN);
    expect((await reviewerPut(put({ organization: "devweb3jogja" }))).status).toBe(200);
    for (const s of ["submission", "completed"]) {
      await setStatus(s);
      expect((await screenPut(put({ projectId, decision: "pass" }))).status).toBe(409);
      expect((await reviewPut(put({ projectId, entries: full }))).status).toBe(409);
      expect((await finalistPut(put({ projectId, slot: "main" }))).status).toBe(409);
    }
  });

  it("nilai sebelum lolos saring 409; skor di luar 1..5 400; kriteria kurang 400", async () => {
    login(ADMIN);
    await reviewerPut(put({ organization: "devweb3jogja" }));
    expect((await reviewPut(put({ projectId, entries: full }))).status).toBe(409);
    await screenPut(put({ projectId, decision: "pass" }));
    expect(
      (await reviewPut(put({ projectId, entries: [{ criterionId: "inn", score: 6 }, full[1]] })))
        .status
    ).toBe(400);
    expect((await reviewPut(put({ projectId, entries: [full[0]] }))).status).toBe(400);
    expect((await reviewPut(put({ projectId, entries: full }))).status).toBe(200);
  });

  it("reviewer selalu dari session: field reviewer di body diabaikan", async () => {
    login(PANITIA);
    await reviewerPut(put({ organization: "coinvestasi" }));
    await screenPut(put({ projectId, decision: "pass", reviewerAddress: ADMIN }));
    const { curationBoard } = await import("@iw3h/db");
    const row = (await curationBoard(store.db, "H", PANITIA)).rows[0];
    expect(row.screen?.reviewerAddress).toBe(PANITIA);
    expect(row.screen?.organization).toBe("coinvestasi");
  });

  it("diskualifikasi mengeluarkan project dari shortlist", async () => {
    login(ADMIN);
    expect((await finalistPut(put({ projectId, slot: "main" }))).status).toBe(200);
    expect((await statusPut(put({ status: "disqualified" }), withId(projectId))).status).toBe(200);
    const r = await store.db.run("SELECT count(*) AS n FROM finalists");
    expect(Number(r.rows[0].n)).toBe(0);
  });

  it("export CSV admin: ranking + teks peserta dinetralkan dari formula", async () => {
    login(ADMIN);
    await reviewerPut(put({ organization: "devweb3jogja" }));
    await screenPut(put({ projectId, decision: "pass" }));
    await reviewPut(put({ projectId, entries: full }));
    await finalistPut(put({ projectId, slot: "reserve", note: "+cadangan" }));
    const res = await exportGet();
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toContain("'=HYPERLINK(evil)");
    expect(csv).toContain("'+cadangan");
    // (4*20 + 2*5) / 25 = 3.6
    expect(csv).toContain("3.600");
    expect(csv).toContain("reserve");
  });
});
