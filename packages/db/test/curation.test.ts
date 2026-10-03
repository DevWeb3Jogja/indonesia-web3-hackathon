import { beforeEach, describe, expect, it } from "vitest";
import { deleteCriterion } from "../src/config";
import {
  CurationError,
  canCurate,
  curationBoard,
  getReviewerOrg,
  saveCurationReview,
  screenProject,
  setFinalist,
  setReviewerOrg,
} from "../src/curation";
import { createProject, deleteProject, setProjectStatus } from "../src/projects";
import { ensureUser } from "../src/queries";
import { createTeam, joinTeam } from "../src/teams";
import { testDb } from "./helpers";

const H = "iw3h-2026";
const OTHER = "other-hack";
const addr = (n: number) => `0x${n.toString(16).padStart(40, "0")}`;
const R1 = addr(101);
const R2 = addr(102);

type DB = Awaited<ReturnType<typeof testDb>>;

async function seed(db: DB) {
  for (const id of [H, OTHER]) {
    await db.run(
      `INSERT INTO hackathons (id, slug, name, year, status) VALUES ('${id}','${id}','H',2026,'submission')`
    );
  }
  await db.run(`INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('ai','${H}','T1','AI')`);
  await db.run(
    `INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('ox','${OTHER}','T1','AI')`
  );
  // Bobot 3 : 1 → rumus tertimbang bisa diverifikasi.
  await db.run(
    `INSERT INTO criteria (id, hackathon_id, name, weight, sort) VALUES ('inn','${H}','Innovative',3,1)`
  );
  await db.run(
    `INSERT INTO criteria (id, hackathon_id, name, weight, sort) VALUES ('des','${H}','Design',1,2)`
  );
  for (const a of [R1, R2]) await ensureUser(db, a);
  for (let i = 1; i <= 20; i++) await ensureUser(db, addr(i));
}

async function project(db: DB, n: number, hackathonId = H) {
  return createProject(db, {
    hackathonId,
    submitterAddress: addr(n),
    teamId: null,
    input: { name: `P${String(n).padStart(2, "0")}` },
    trackIds: [hackathonId === H ? "ai" : "ox"],
  });
}

const full = (inn: number, des: number) => [
  { criterionId: "inn", score: inn },
  { criterionId: "des", score: des },
];

describe("canCurate (guard fase)", () => {
  it("tertutup saat draft/registration, submission masih buka, dan completed", () => {
    expect(canCurate({ status: "draft" })).toBe(false);
    expect(canCurate({ status: "registration" })).toBe(false);
    expect(canCurate({ status: "submission" })).toBe(false);
    expect(canCurate({ status: "completed" })).toBe(false);
  });
  it("terbuka saat deadline submit lewat (status masih submission) atau fase judging", () => {
    const now = new Date("2026-10-08T00:00:00Z");
    expect(
      canCurate({ status: "submission", submissionClosesAt: "2026-10-07T16:30:00Z" }, now)
    ).toBe(true);
    expect(
      canCurate({ status: "submission", submissionClosesAt: "2026-10-09T00:00:00Z" }, now)
    ).toBe(false);
    expect(canCurate({ status: "judging" })).toBe(true);
  });
});

describe("kurasi (integration)", () => {
  let db: DB;
  beforeEach(async () => {
    db = await testDb();
    await seed(db);
  });

  it("organisasi penilai: wajib valid, bisa diganti, disalin ke penilaian", async () => {
    expect(await getReviewerOrg(db, H, R1)).toBeNull();
    await setReviewerOrg(db, H, R1, "coinvestasi");
    await setReviewerOrg(db, H, R1, "binance-academy");
    expect(await getReviewerOrg(db, H, R1)).toBe("binance-academy");
    // CHECK constraint DB = backstop kalau validasi route terlewat.
    await expect(
      db.run(
        `INSERT INTO curation_reviewers (hackathon_id, address, organization) VALUES ('${H}','${R2}','evil')`
      )
    ).rejects.toThrow();
  });

  it("tanpa organisasi → no_org (saring & nilai)", async () => {
    const p = await project(db, 1);
    await expect(
      screenProject(db, { hackathonId: H, projectId: p.id, reviewer: R1, decision: "pass" })
    ).rejects.toMatchObject({ code: "no_org" });
    await expect(
      saveCurationReview(db, {
        hackathonId: H,
        projectId: p.id,
        reviewer: R1,
        entries: full(3, 3),
      })
    ).rejects.toMatchObject({ code: "no_org" });
  });

  it("saring: satu keputusan per project, penilai terakhir menang; gugur wajib beralasan", async () => {
    const p = await project(db, 1);
    await setReviewerOrg(db, H, R1, "devweb3jogja");
    await setReviewerOrg(db, H, R2, "coinvestasi");
    await screenProject(db, {
      hackathonId: H,
      projectId: p.id,
      reviewer: R1,
      decision: "fail",
      reason: null,
    });
    let row = (await curationBoard(db, H, R1)).rows[0];
    expect(row.screen).toMatchObject({
      decision: "fail",
      reason: "other",
      organization: "devweb3jogja",
    });

    await screenProject(db, {
      hackathonId: H,
      projectId: p.id,
      reviewer: R2,
      decision: "pass",
      reason: "demo_broken", // diabaikan saat lolos
    });
    row = (await curationBoard(db, H, R1)).rows[0];
    expect(row.screen).toMatchObject({
      decision: "pass",
      reason: null,
      reviewerAddress: R2,
      organization: "coinvestasi",
    });
  });

  it("hanya project submitted milik hackathon ini (bukan DQ, bukan lintas-hackathon)", async () => {
    await setReviewerOrg(db, H, R1, "devweb3jogja");
    const other = await project(db, 2, OTHER);
    const dq = await project(db, 3);
    await setProjectStatus(db, dq.id, "disqualified");
    for (const id of [other.id, dq.id, "nope"]) {
      await expect(
        screenProject(db, { hackathonId: H, projectId: id, reviewer: R1, decision: "pass" })
      ).rejects.toMatchObject({ code: "invalid_project" });
    }
  });

  it("nilai: hanya setelah lolos saring, wajib SEMUA kriteria tepat sekali, 1..5", async () => {
    const p = await project(db, 1);
    await setReviewerOrg(db, H, R1, "devweb3jogja");
    const save = (entries: { criterionId: string; score: number }[]) =>
      saveCurationReview(db, { hackathonId: H, projectId: p.id, reviewer: R1, entries });

    await expect(save(full(3, 3))).rejects.toMatchObject({ code: "not_passed" });
    await screenProject(db, { hackathonId: H, projectId: p.id, reviewer: R1, decision: "fail" });
    await expect(save(full(3, 3))).rejects.toMatchObject({ code: "not_passed" });
    await screenProject(db, { hackathonId: H, projectId: p.id, reviewer: R1, decision: "pass" });

    const bad = [
      [{ criterionId: "inn", score: 3 }], // kurang kriteria
      [...full(3, 3), { criterionId: "inn", score: 4 }], // dobel
      [
        { criterionId: "inn", score: 3 },
        { criterionId: "xxx", score: 3 },
      ], // kriteria asing
      full(6, 3), // di atas 5
      full(0, 3), // di bawah 1
      full(2.5, 3), // pecahan
    ];
    for (const e of bad) await expect(save(e)).rejects.toBeInstanceOf(CurationError);
    await expect(save(full(4, 2))).resolves.toMatchObject({ organization: "devweb3jogja" });
  });

  it("ranking: rata-rata per kriteria lintas penilai, dibobot; nilai ulang menimpa milik sendiri", async () => {
    const p = await project(db, 1);
    await setReviewerOrg(db, H, R1, "devweb3jogja");
    await setReviewerOrg(db, H, R2, "binance-academy");
    await screenProject(db, { hackathonId: H, projectId: p.id, reviewer: R1, decision: "pass" });
    const save = (reviewer: string, inn: number, des: number, note?: string) =>
      saveCurationReview(db, {
        hackathonId: H,
        projectId: p.id,
        reviewer,
        entries: full(inn, des),
        note,
      });

    await save(R1, 1, 1);
    await save(R1, 5, 1, "bagus"); // menimpa, bukan menambah
    await save(R2, 3, 5);
    const board = await curationBoard(db, H, R1);
    const row = board.rows[0];
    // inn avg (5+3)/2 = 4, des avg (1+5)/2 = 3 → (4*3 + 3*1) / 4 = 3.75
    expect(row.criterionAvg).toEqual({ inn: 4, des: 3 });
    expect(row.score).toBeCloseTo(3.75);
    expect(row.reviews).toHaveLength(2);
    expect(row.myScores).toEqual({ inn: 5, des: 1 });
    expect(row.myNote).toBe("bagus");
    expect((await curationBoard(db, H, R2)).rows[0].myScores).toEqual({ inn: 3, des: 5 });
  });

  it("board: hanya project submitted hackathon ini; belum dinilai → score null", async () => {
    await project(db, 1);
    const dq = await project(db, 2);
    await setProjectStatus(db, dq.id, "disqualified");
    await project(db, 3, OTHER);
    const { rows, criteria } = await curationBoard(db, H, R1);
    expect(rows.map((r) => r.name)).toEqual(["P01"]);
    expect(rows[0].score).toBeNull();
    expect(criteria.map((c) => c.id)).toEqual(["inn", "des"]);
  });

  it("finalis: kuota 10 utama + 5 cadangan, declined tak dihitung, bisa dihapus", async () => {
    const ps = [];
    for (let i = 1; i <= 17; i++) ps.push(await project(db, i));
    const set = (i: number, slot: "main" | "reserve" | null, contactStatus?: "declined") =>
      setFinalist(db, { hackathonId: H, projectId: ps[i].id, actor: R1, slot, contactStatus });

    for (let i = 0; i < 10; i++) await set(i, "main");
    await expect(set(10, "main")).rejects.toMatchObject({ code: "quota_full" });
    for (let i = 10; i < 15; i++) await set(i, "reserve");
    await expect(set(15, "reserve")).rejects.toMatchObject({ code: "quota_full" });

    // Finalis utama menolak → slot terbuka → cadangan naik ke utama.
    await set(0, "main", "declined");
    await expect(set(10, "main")).resolves.toMatchObject({ slot: "main" });
    // Update baris sendiri tak dihitung dobel walau kuota penuh.
    await expect(
      setFinalist(db, {
        hackathonId: H,
        projectId: ps[1].id,
        actor: R1,
        slot: "main",
        note: "WA ok",
      })
    ).resolves.toMatchObject({ contactStatus: "pending" });
    // Mengaktifkan lagi yang declined saat penuh → ditolak.
    await expect(
      setFinalist(db, {
        hackathonId: H,
        projectId: ps[0].id,
        actor: R1,
        slot: "main",
        contactStatus: "confirmed",
      })
    ).rejects.toMatchObject({ code: "quota_full" });

    await set(10, null);
    const board = await curationBoard(db, H, R1);
    expect(board.rows.find((r) => r.id === ps[10].id)?.finalist).toBeNull();
    expect(board.rows.find((r) => r.id === ps[1].id)?.finalist).toEqual({
      slot: "main",
      contactStatus: "pending",
      note: "WA ok",
    });
  });

  it("finalis: project tak valid ditolak; CHECK DB jadi backstop slot/status", async () => {
    const other = await project(db, 1, OTHER);
    await expect(
      setFinalist(db, { hackathonId: H, projectId: other.id, actor: R1, slot: "main" })
    ).rejects.toMatchObject({ code: "invalid_project" });
    const p = await project(db, 2);
    await expect(
      db.run(
        `INSERT INTO finalists (project_id, hackathon_id, slot, updated_by) VALUES ('${p.id}','${H}','vip','x')`
      )
    ).rejects.toThrow();
  });

  it("konflik kepentingan: penilai tak boleh saring/nilai project sendiri (solo & anggota tim)", async () => {
    // R1 submit solo; R2 anggota tim project lain.
    const own = await createProject(db, {
      hackathonId: H,
      submitterAddress: R1,
      teamId: null,
      input: { name: "Mine" },
      trackIds: ["ai"],
    });
    const team = await createTeam(db, H, addr(9), "Tim");
    await joinTeam(db, H, R2, team.inviteCode);
    const teamP = await createProject(db, {
      hackathonId: H,
      submitterAddress: addr(9),
      teamId: team.id,
      input: { name: "Ours" },
      trackIds: ["ai"],
    });
    await setReviewerOrg(db, H, R1, "devweb3jogja");
    await setReviewerOrg(db, H, R2, "coinvestasi");
    for (const [reviewer, projectId] of [
      [R1, own.id],
      [R2, teamP.id],
    ]) {
      await expect(
        screenProject(db, { hackathonId: H, projectId, reviewer, decision: "pass" })
      ).rejects.toMatchObject({ code: "conflict" });
    }
    // Penilai lain boleh; lalu pemilik tetap tak boleh menilai.
    await screenProject(db, { hackathonId: H, projectId: own.id, reviewer: R2, decision: "pass" });
    await expect(
      saveCurationReview(db, {
        hackathonId: H,
        projectId: own.id,
        reviewer: R1,
        entries: full(5, 5),
      })
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("project di shortlist tak bisa digugurkan lewat saring (admin keluarkan dulu)", async () => {
    const p = await project(db, 1);
    await setReviewerOrg(db, H, R1, "devweb3jogja");
    await screenProject(db, { hackathonId: H, projectId: p.id, reviewer: R1, decision: "pass" });
    await setFinalist(db, { hackathonId: H, projectId: p.id, actor: R1, slot: "main" });
    await expect(
      screenProject(db, { hackathonId: H, projectId: p.id, reviewer: R1, decision: "fail" })
    ).rejects.toMatchObject({ code: "is_finalist" });
    await setFinalist(db, { hackathonId: H, projectId: p.id, actor: R1, slot: null });
    await expect(
      screenProject(db, { hackathonId: H, projectId: p.id, reviewer: R1, decision: "fail" })
    ).resolves.toBeTruthy();
  });

  it("board tanpa finalis (untuk panitia): data shortlist tak dimuat", async () => {
    const p = await project(db, 1);
    await setFinalist(db, { hackathonId: H, projectId: p.id, actor: R1, slot: "main", note: "x" });
    expect((await curationBoard(db, H, R1)).rows[0].finalist).not.toBeNull();
    const hidden = await curationBoard(db, H, R1, { includeFinalists: false });
    expect(hidden.rows[0].finalist).toBeNull();
  });

  it("hapus project ikut membersihkan semua data kurasinya", async () => {
    const p = await project(db, 1);
    await setReviewerOrg(db, H, R1, "devweb3jogja");
    await screenProject(db, { hackathonId: H, projectId: p.id, reviewer: R1, decision: "pass" });
    await saveCurationReview(db, {
      hackathonId: H,
      projectId: p.id,
      reviewer: R1,
      entries: full(3, 3),
    });
    await setFinalist(db, { hackathonId: H, projectId: p.id, actor: R1, slot: "main" });
    await deleteProject(db, p.id);
    for (const t of ["curation_screens", "curation_reviews", "curation_scores", "finalists"]) {
      const r = await db.run(`SELECT count(*) AS n FROM ${t}`);
      expect(Number(r.rows[0].n)).toBe(0);
    }
  });

  it("kriteria yang sudah dipakai nilai kurasi tak bisa dihapus", async () => {
    const p = await project(db, 1);
    await setReviewerOrg(db, H, R1, "devweb3jogja");
    await screenProject(db, { hackathonId: H, projectId: p.id, reviewer: R1, decision: "pass" });
    await saveCurationReview(db, {
      hackathonId: H,
      projectId: p.id,
      reviewer: R1,
      entries: full(3, 3),
    });
    await expect(deleteCriterion(db, H, "inn")).rejects.toMatchObject({ code: "in_use" });
  });
});
