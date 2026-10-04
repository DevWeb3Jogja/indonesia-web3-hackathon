import { beforeEach, describe, expect, it } from "vitest";
import { createCriterion, deleteCriterion, updateCriterion } from "../src/config";
import {
  finalJudgingBoard,
  finalScore,
  getJudgeNotes,
  JudgingError,
  judgeCovers,
  listJudgeCriteria,
  listJudgeFinalists,
  rankFinal,
  saveJudgeScores,
  setOrganizerScore,
  tieBreakOrder,
} from "../src/judging";
import { createProject, deleteProject } from "../src/projects";
import { ensureUser, setUserRole } from "../src/queries";
import { getJudgeScores, setJudgeTracks } from "../src/scores";
import { markDemoDay } from "../src/votes";
import { testDb } from "./helpers";

const H = "iw3h-2026";
const OTHER = "other-hack";
const addr = (n: number) => `0x${n.toString(16).padStart(40, "0")}`;
const J1 = addr(201);
const J2 = addr(202);
const J3 = addr(203);
const ADMIN = addr(299);

type DB = Awaited<ReturnType<typeof testDb>>;

/** Konfigurasi Coinvestasi: 8 kriteria, bobot 20/20/15/15/10/10/5/5, Participation = panitia. */
const COINVESTASI = [
  ["inn", "Innovative Solution", 20, "judge"],
  ["prob", "Problem Relevance", 20, "judge"],
  ["tech", "Technical Execution", 15, "judge"],
  ["biz", "Business Potential", 15, "judge"],
  ["ux", "User Experience", 10, "judge"],
  ["pitch", "Pitching", 10, "judge"],
  ["web3", "Web3 Integration", 5, "judge"],
  ["part", "Participation", 5, "organizer"],
] as const;
const JUDGE_CRIT = COINVESTASI.filter((c) => c[3] === "judge").map((c) => c[0]);

async function seed(db: DB) {
  for (const id of [H, OTHER]) {
    await db.run(
      `INSERT INTO hackathons (id, slug, name, year, status) VALUES ('${id}','${id}','H',2026,'judging')`
    );
  }
  await db.run(`INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('ai','${H}','T1','AI')`);
  await db.run(
    `INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('fin','${H}','T2','Fin')`
  );
  await db.run(
    `INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('ox','${OTHER}','T1','AI')`
  );
  for (const [i, [id, name, weight, filledBy]] of COINVESTASI.entries()) {
    await db.run(
      `INSERT INTO criteria (id, hackathon_id, name, weight, sort, filled_by) VALUES ('${id}','${H}','${name}',${weight},${i + 1},'${filledBy}')`
    );
  }
  for (const a of [J1, J2, J3, ADMIN]) await ensureUser(db, a);
  for (const j of [J1, J2, J3]) await setUserRole(db, j, "judge");
  await setUserRole(db, ADMIN, "admin");
  for (let i = 1; i <= 20; i++) await ensureUser(db, addr(i));
}

async function project(
  db: DB,
  n: number,
  opts: { tracks?: string[]; hackathonId?: string; finalist?: boolean } = {}
) {
  const hackathonId = opts.hackathonId ?? H;
  const p = await createProject(db, {
    hackathonId,
    submitterAddress: addr(n),
    teamId: null,
    input: { name: `P${String(n).padStart(2, "0")}` },
    trackIds: opts.tracks ?? [hackathonId === H ? "ai" : "ox"],
  });
  if (opts.finalist !== false) await markDemoDay(db, p.id, true);
  return p.id;
}

/** Semua kriteria juri bernilai sama `v`, kecuali yang di-override. */
const entries = (v: number, over: Record<string, number> = {}) =>
  JUDGE_CRIT.map((id) => ({ criterionId: id, score: over[id] ?? v }));

const save = (db: DB, projectId: string, judge: string, e = entries(4), notes = {}) =>
  saveJudgeScores(db, { hackathonId: H, projectId, judge, entries: e, ...notes });

function rowOf<R extends { id: string }>(rows: R[], id: string): R {
  const r = rows.find((x) => x.id === id);
  if (!r) throw new Error(`baris ${id} tidak ada`);
  return r;
}

async function expectCode(p: Promise<unknown>, code: JudgingError["code"]) {
  const err = await p.then(
    () => null,
    (e) => e
  );
  expect(err).toBeInstanceOf(JudgingError);
  expect((err as JudgingError).code).toBe(code);
}

describe("fungsi murni: nilai akhir & tie-breaker", () => {
  const crit = COINVESTASI.map(([id, , weight], i) => ({ id, weight, sort: i + 1 }));

  it("finalScore = Σ(nilai×bobot)/Σbobot atas kriteria yang bernilai", () => {
    expect(finalScore({}, crit)).toBeNull();
    // semua 4 → 4
    expect(finalScore(Object.fromEntries(crit.map((c) => [c.id, 4])), crit)).toBeCloseTo(4);
    // inn=5 (w20), part=1 (w5), sisanya kosong → (100+5)/25 = 4.2
    expect(finalScore({ inn: 5, part: 1 }, crit)).toBeCloseTo(4.2);
  });

  it("urutan tie-breaker: bobot terbesar dulu, bobot sama → sort", () => {
    const order = tieBreakOrder(crit).map((c) => c.id);
    expect(order.slice(0, 2)).toEqual(["inn", "prob"]);
    expect(order).toEqual(["inn", "prob", "tech", "biz", "ux", "pitch", "web3", "part"]);
    // sort menang atas posisi array saat bobot sama
    expect(
      tieBreakOrder([
        { id: "b", weight: 20, sort: 2 },
        { id: "a", weight: 20, sort: 1 },
        { id: "c", weight: 30, sort: 9 },
      ]).map((c) => c.id)
    ).toEqual(["c", "a", "b"]);
  });

  it("skor sama → menang yang lebih tinggi di Innovative Solution", () => {
    const r = rankFinal(
      [
        { id: "x", name: "X", score: 4, values: { inn: 3, prob: 5 } },
        { id: "y", name: "Y", score: 4, values: { inn: 5, prob: 3 } },
      ],
      crit
    );
    expect(r.get("y")).toEqual({ rank: 1, tie: false });
    expect(r.get("x")).toEqual({ rank: 2, tie: false });
  });

  it("Innovative sama → Problem Relevance memutuskan", () => {
    const r = rankFinal(
      [
        { id: "x", name: "A", score: 4, values: { inn: 4, prob: 3, tech: 5 } },
        { id: "y", name: "B", score: 4, values: { inn: 4, prob: 4, tech: 1 } },
      ],
      crit
    );
    expect(r.get("y")?.rank).toBe(1);
    expect(r.get("x")?.rank).toBe(2);
  });

  it("tie-breaker berhenti di 2 kriteria teratas: kriteria ke-3 TIDAK memutuskan → tie", () => {
    const r = rankFinal(
      [
        { id: "x", name: "A", score: 4, values: { inn: 4, prob: 4, tech: 5 } },
        { id: "y", name: "B", score: 4, values: { inn: 4, prob: 4, tech: 1 } },
      ],
      crit
    );
    expect(r.get("x")).toEqual({ rank: 1, tie: true });
    expect(r.get("y")).toEqual({ rank: 1, tie: true });
  });

  it("seri total → rank sama + tanda tie; rank berikutnya melompat (1,1,3); tanpa nilai → null", () => {
    const same = { inn: 4, prob: 4 };
    const r = rankFinal(
      [
        { id: "a", name: "A", score: 4, values: same },
        { id: "b", name: "B", score: 4, values: { ...same } },
        { id: "c", name: "C", score: 3.5, values: same },
        { id: "d", name: "D", score: null, values: {} },
      ],
      crit
    );
    expect(r.get("a")).toEqual({ rank: 1, tie: true });
    expect(r.get("b")).toEqual({ rank: 1, tie: true });
    expect(r.get("c")).toEqual({ rank: 3, tie: false });
    expect(r.get("d")).toEqual({ rank: null, tie: false });
  });

  it("selisih floating-point (bukan beda nyata) dianggap sama", () => {
    const r = rankFinal(
      [
        { id: "a", name: "A", score: 0.1 + 0.2, values: { inn: 4 } },
        { id: "b", name: "B", score: 0.3, values: { inn: 5 } },
      ],
      crit
    );
    // skor dianggap sama → tie-breaker inn memutuskan b menang
    expect(r.get("b")?.rank).toBe(1);
  });

  it("nilai kriteria kosong kalah dari yang bernilai saat tie-break", () => {
    const r = rankFinal(
      [
        { id: "a", name: "A", score: 4, values: {} },
        { id: "b", name: "B", score: 4, values: { inn: 1 } },
      ],
      crit
    );
    expect(r.get("b")?.rank).toBe(1);
  });

  it("judgeCovers: assignment kosong = semua; selain itu minimal satu track cocok", () => {
    expect(judgeCovers([], ["ai"])).toBe(true);
    expect(judgeCovers(["ai"], ["ai", "fin"])).toBe(true);
    expect(judgeCovers(["fin"], ["ai"])).toBe(false);
  });
});

describe("form juri: finalis & kriteria", () => {
  let db: DB;
  beforeEach(async () => {
    db = await testDb();
    await seed(db);
  });

  it("hanya finalis (submitted + demo_day + hackathon ini), difilter track juri", async () => {
    const pAi = await project(db, 1, { tracks: ["ai"] });
    const pFin = await project(db, 2, { tracks: ["fin"] });
    await project(db, 3, { finalist: false });
    await project(db, 4, { hackathonId: OTHER });
    const dq = await project(db, 5);
    await db.run(`UPDATE projects SET status='disqualified' WHERE id='${dq}'`);

    expect((await listJudgeFinalists(db, H, J1)).map((p) => p.id).sort()).toEqual(
      [pAi, pFin].sort()
    );
    await setJudgeTracks(db, H, J1, ["fin"]);
    expect((await listJudgeFinalists(db, H, J1)).map((p) => p.id)).toEqual([pFin]);
  });

  it("kriteria organizer disembunyikan; bobot % dari total semua kriteria", async () => {
    const c = await listJudgeCriteria(db, H);
    expect(c.map((x) => x.id)).toEqual(JUDGE_CRIT);
    expect(c.find((x) => x.id === "inn")?.weightPct).toBeCloseTo(20);
    expect(c.find((x) => x.id === "web3")?.weightPct).toBeCloseTo(5);
  });
});

describe("saveJudgeScores (aturan server)", () => {
  let db: DB;
  let pid: string;
  beforeEach(async () => {
    db = await testDb();
    await seed(db);
    pid = await project(db, 1);
  });

  it("simpan lengkap + catatan; simpan ulang menimpa (bukan menambah)", async () => {
    await save(db, pid, J1, entries(3), { teamNote: " Bagus ", internalNote: "rahasia" });
    await save(db, pid, J1, entries(5), { teamNote: "Lebih bagus", internalNote: "" });
    const mine = await getJudgeScores(db, H, J1);
    expect(mine).toHaveLength(JUDGE_CRIT.length);
    expect(mine.every((s) => s.score === 5)).toBe(true);
    const notes = await getJudgeNotes(db, H, J1);
    expect(notes).toEqual([{ projectId: pid, teamNote: "Lebih bagus", internalNote: null }]);
  });

  it("juri hanya melihat nilai & catatan miliknya", async () => {
    await save(db, pid, J1, entries(3), { teamNote: "punya J1" });
    await save(db, pid, J2, entries(5), { teamNote: "punya J2" });
    const mine = await getJudgeScores(db, H, J1);
    expect(mine.every((s) => s.score === 3)).toBe(true);
    expect(JSON.stringify(await getJudgeNotes(db, H, J1))).not.toContain("punya J2");
  });

  it("tolak project non-finalis, lintas hackathon, DQ, dan tak dikenal", async () => {
    const notFinal = await project(db, 2, { finalist: false });
    const other = await project(db, 3, { hackathonId: OTHER });
    const dq = await project(db, 4);
    await db.run(`UPDATE projects SET status='disqualified' WHERE id='${dq}'`);
    for (const id of [notFinal, other, dq, "nope"]) {
      await expectCode(save(db, id, J1), "invalid_project");
    }
  });

  it("tolak project di luar track juri", async () => {
    await setJudgeTracks(db, H, J1, ["fin"]);
    await expectCode(save(db, pid, J1), "out_of_track");
    await setJudgeTracks(db, H, J1, ["fin", "ai"]);
    await save(db, pid, J1);
  });

  it("tolak kriteria organizer, kriteria tak dikenal, kurang, dobel", async () => {
    // Pesan khusus supaya juri paham kenapa (bukan sekadar "isi semua kriteria").
    await expect(
      save(db, pid, J1, [...entries(4), { criterionId: "part", score: 5 }])
    ).rejects.toThrow(/diisi panitia/);
    await expectCode(
      save(db, pid, J1, [...entries(4), { criterionId: "part", score: 5 }]),
      "invalid_criteria"
    );
    await expectCode(
      save(db, pid, J1, [...entries(4).slice(1), { criterionId: "part", score: 5 }]),
      "invalid_criteria"
    );
    await expectCode(
      save(db, pid, J1, [...entries(4).slice(1), { criterionId: "ghost", score: 5 }]),
      "invalid_criteria"
    );
    await expectCode(save(db, pid, J1, entries(4).slice(1)), "invalid_criteria");
    const dup = entries(4);
    dup[1] = { ...dup[0] };
    await expectCode(save(db, pid, J1, dup), "invalid_criteria");
    await expectCode(save(db, pid, J1, []), "invalid_criteria");
    expect(await getJudgeScores(db, H, J1)).toHaveLength(0);
  });

  it("tolak nilai di luar 1..5 atau pecahan", async () => {
    for (const bad of [0, 6, 10, 2.5, -1]) {
      await expectCode(save(db, pid, J1, entries(4, { inn: bad })), "invalid_criteria");
    }
    await save(db, pid, J1, entries(1, { inn: 5 }));
  });

  it("kriteria dari hackathon lain tak dianggap", async () => {
    await db.run(
      `INSERT INTO criteria (id, hackathon_id, name, weight) VALUES ('x-other','${OTHER}','X',5)`
    );
    await expectCode(
      save(db, pid, J1, [...entries(4).slice(1), { criterionId: "x-other", score: 3 }]),
      "invalid_criteria"
    );
  });
});

describe("setOrganizerScore", () => {
  let db: DB;
  let pid: string;
  beforeEach(async () => {
    db = await testDb();
    await seed(db);
    pid = await project(db, 1);
  });

  const set = (projectId: string, criterionId: string, score: number | null) =>
    setOrganizerScore(db, { hackathonId: H, projectId, criterionId, score, actor: ADMIN });

  it("set, ubah, kosongkan — tak pernah masuk tabel scores", async () => {
    await set(pid, "part", 4);
    await set(pid, "part", 2);
    let b = await finalJudgingBoard(db, H);
    expect(b.rows[0].values.part).toBe(2);
    const n = await db.run("SELECT count(*) AS n FROM scores");
    expect(Number(n.rows[0].n)).toBe(0);
    await set(pid, "part", null);
    b = await finalJudgingBoard(db, H);
    expect(b.rows[0].values.part).toBeUndefined();
  });

  it("tolak kriteria juri, kriteria tak dikenal, non-finalis, nilai di luar 1..5", async () => {
    await expectCode(set(pid, "inn", 3), "invalid_criteria");
    await expectCode(set(pid, "ghost", 3), "invalid_criteria");
    const nf = await project(db, 2, { finalist: false });
    await expectCode(set(nf, "part", 3), "invalid_project");
    for (const bad of [0, 6, 1.5]) await expectCode(set(pid, "part", bad), "invalid_criteria");
  });

  it("CHECK DB: organizer_scores 1..5 dan criteria.filled_by judge|organizer", async () => {
    await expect(
      db.run(
        `INSERT INTO organizer_scores (project_id, criterion_id, score, updated_by) VALUES ('${pid}','part',6,'x')`
      )
    ).rejects.toThrow();
    await expect(
      db.run("UPDATE criteria SET filled_by='panitia' WHERE id='inn'")
    ).rejects.toThrow();
  });
});

describe("finalJudgingBoard (rekap)", () => {
  let db: DB;
  beforeEach(async () => {
    db = await testDb();
    await seed(db);
  });

  it("rata-rata juri + nilai panitia → nilai akhir, lengkap/tidak, juri masuk x/N", async () => {
    const p1 = await project(db, 1, { tracks: ["ai"] });
    const p2 = await project(db, 2, { tracks: ["fin"] });
    await project(db, 3, { finalist: false });
    await setJudgeTracks(db, H, J3, ["fin"]); // J3 hanya track fin

    await save(db, p1, J1, entries(4), { teamNote: "=catatan tim", internalNote: "internal!" });
    await save(db, p1, J2, entries(5, { inn: 3 }));
    await setOrganizerScore(db, {
      hackathonId: H,
      projectId: p1,
      criterionId: "part",
      score: 2,
      actor: ADMIN,
    });

    const b = await finalJudgingBoard(db, H);
    expect(b.rows.map((r) => r.id)).toEqual([p1, p2]); // non-finalis tak ikut
    const r1 = rowOf(b.rows, p1);
    expect(r1.values.inn).toBeCloseTo(3.5); // (4+3)/2
    expect(r1.values.prob).toBeCloseTo(4.5);
    expect(r1.values.part).toBe(2);
    expect(r1.judgeCounts.inn).toBe(2);
    // (3.5*20 + 4.5*(20+15+15+10+10+5) + 2*5) / 100 = (70 + 337.5 + 10)/100
    expect(r1.score).toBeCloseTo(4.175);
    expect(r1.complete).toBe(true);
    expect(r1.judgesIn).toBe(2);
    expect(r1.judgesEligible).toBe(2); // J3 (fin) tak mencakup p1
    expect(r1.pendingJudges).toEqual([]);
    expect(r1.notes).toHaveLength(1);
    expect(r1.notes[0]).toMatchObject({ teamNote: "=catatan tim", internalNote: "internal!" });

    const r2 = rowOf(b.rows, p2);
    expect(r2.score).toBeNull();
    expect(r2.complete).toBe(false);
    expect(r2.judgesIn).toBe(0);
    expect(r2.judgesEligible).toBe(3);
    expect(r2.ranks.all).toEqual({ rank: null, tie: false });
    expect(r1.ranks.all).toEqual({ rank: 1, tie: false });
    expect(r1.ranks.ai).toEqual({ rank: 1, tie: false });
    expect(r1.ranks.fin).toBeUndefined();
  });

  it("juri dipindah track / turun role setelah menilai → nilainya tak dihitung, x/N jujur", async () => {
    const p1 = await project(db, 1, { tracks: ["ai"] });
    for (const j of [J1, J2, J3]) await save(db, p1, j, entries(j === J3 ? 1 : 4));
    let r = rowOf((await finalJudgingBoard(db, H)).rows, p1);
    expect(r.judgesIn).toBe(3);
    expect(r.values.inn).toBeCloseTo(3); // (4+4+1)/3

    // J3 dipindah ke track fin (tak lagi mencakup p1), J2 turun role jadi panitia.
    await setJudgeTracks(db, H, J3, ["fin"]);
    await setUserRole(db, J2, "panitia");
    r = rowOf((await finalJudgingBoard(db, H)).rows, p1);
    expect(r.judgesEligible).toBe(1);
    expect(r.judgesIn).toBe(1);
    expect(r.values.inn).toBeCloseTo(4); // hanya J1
    expect(r.judgeCounts.inn).toBe(1);

    // Juri baru yang belum menilai → x/N kurang & baris TIDAK lengkap walau nilai ada.
    await ensureUser(db, addr(250));
    await setUserRole(db, addr(250), "judge");
    await setOrganizerScore(db, {
      hackathonId: H,
      projectId: p1,
      criterionId: "part",
      score: 3,
      actor: ADMIN,
    });
    r = rowOf((await finalJudgingBoard(db, H)).rows, p1);
    expect(r.judgesIn).toBe(1);
    expect(r.judgesEligible).toBe(2);
    expect(r.complete).toBe(false);
  });

  it("nilai lama di luar skala 1..5 dan nilai non-juri (admin) diabaikan", async () => {
    const p1 = await project(db, 1);
    await save(db, p1, J1, entries(4));
    // Sisa form lama (skala 1..10) & nilai yang dulu boleh diisi admin.
    await db.run(
      `INSERT INTO scores (id, project_id, judge_address, criterion_id, score) VALUES ('old1','${p1}','${J2}','inn',9)`
    );
    await db.run(
      `INSERT INTO scores (id, project_id, judge_address, criterion_id, score) VALUES ('old2','${p1}','${ADMIN}','inn',1)`
    );
    const r = rowOf((await finalJudgingBoard(db, H)).rows, p1);
    expect(r.values.inn).toBe(4);
    expect(r.judgeCounts.inn).toBe(1);
    expect(r.score).not.toBeNull();
    expect(r.score as number).toBeLessThanOrEqual(5);
  });

  it("kriteria panitia → juri → panitia: nilai panitia lama TIDAK hidup lagi", async () => {
    const p1 = await project(db, 1);
    await setOrganizerScore(db, {
      hackathonId: H,
      projectId: p1,
      criterionId: "part",
      score: 5,
      actor: ADMIN,
    });
    await updateCriterion(db, H, "part", { filledBy: "judge" });
    await updateCriterion(db, H, "part", { filledBy: "organizer" });
    const r = rowOf((await finalJudgingBoard(db, H)).rows, p1);
    expect(r.values.part).toBeUndefined();
  });

  it("kriteria panitia belum diisi → tetap dihitung atas yang ada, ditandai belum lengkap", async () => {
    const p1 = await project(db, 1);
    await save(db, p1, J1, entries(4));
    const r = (await finalJudgingBoard(db, H)).rows[0];
    expect(r.score).toBeCloseTo(4);
    expect(r.complete).toBe(false);
    expect(r.judgesIn).toBe(1);
    expect(r.pendingJudges.map((j) => j.address).sort()).toEqual([J2, J3].sort());
  });

  it("peringkat per track & tie-breaker lewat data asli", async () => {
    const a = await project(db, 1, { tracks: ["ai", "fin"] });
    const b = await project(db, 2, { tracks: ["ai"] });
    const c = await project(db, 3, { tracks: ["fin"] });
    // a & b nilai akhir sama (4), a lebih tinggi di Innovative → a menang.
    await save(db, a, J1, entries(4, { inn: 5, prob: 3 }));
    await save(db, b, J1, entries(4));
    await save(db, c, J1, entries(2));
    for (const p of [a, b, c]) {
      await setOrganizerScore(db, {
        hackathonId: H,
        projectId: p,
        criterionId: "part",
        score: 4,
        actor: ADMIN,
      });
    }
    const rows = (await finalJudgingBoard(db, H)).rows;
    const by = (id: string) => rowOf(rows, id);
    expect(by(a).score).toBeCloseTo(by(b).score as number);
    expect(by(a).ranks.all).toEqual({ rank: 1, tie: false });
    expect(by(b).ranks.all).toEqual({ rank: 2, tie: false });
    expect(by(c).ranks.all.rank).toBe(3);
    expect(by(c).ranks.fin.rank).toBe(2); // di track fin: a=1, c=2
    expect(by(b).ranks.ai.rank).toBe(2);
  });

  it("seri total ditandai tie", async () => {
    const a = await project(db, 1);
    const b = await project(db, 2);
    await save(db, a, J1, entries(4));
    await save(db, b, J1, entries(4));
    const rows = (await finalJudgingBoard(db, H)).rows;
    expect(rows.map((r) => r.ranks.all)).toEqual([
      { rank: 1, tie: true },
      { rank: 1, tie: true },
    ]);
  });

  it("nilai juri lama untuk kriteria yang kini organizer diabaikan; juri harus menilai ulang", async () => {
    const p = await project(db, 1);
    await save(db, p, J1, entries(5));
    await updateCriterion(db, H, "web3", { filledBy: "organizer" });
    const r = (await finalJudgingBoard(db, H)).rows[0];
    expect(r.values.web3).toBeUndefined(); // nilai juri tak dihitung sbg nilai panitia
    expect(r.judgesIn).toBe(1); // masih lengkap utk kriteria juri yang tersisa
    // kriteria juri baru → juri lama tak lagi "masuk" sampai menilai ulang
    await createCriterion(db, H, { name: "Baru", weight: 5, sort: 99 });
    expect((await finalJudgingBoard(db, H)).rows[0].judgesIn).toBe(0);
  });
});

describe("integritas hapus", () => {
  let db: DB;
  beforeEach(async () => {
    db = await testDb();
    await seed(db);
  });

  it("kriteria dengan nilai panitia tak bisa dihapus", async () => {
    const p = await project(db, 1);
    await setOrganizerScore(db, {
      hackathonId: H,
      projectId: p,
      criterionId: "part",
      score: 3,
      actor: ADMIN,
    });
    await expect(deleteCriterion(db, H, "part")).rejects.toMatchObject({ code: "in_use" });
  });

  it("hapus project ikut membersihkan nilai panitia & catatan juri", async () => {
    const p = await project(db, 1);
    await save(db, p, J1, entries(4), { teamNote: "x" });
    await setOrganizerScore(db, {
      hackathonId: H,
      projectId: p,
      criterionId: "part",
      score: 3,
      actor: ADMIN,
    });
    await deleteProject(db, p);
    for (const t of ["scores", "organizer_scores", "judge_notes", "projects"]) {
      const r = await db.run(`SELECT count(*) AS n FROM ${t}`);
      expect(Number(r.rows[0].n)).toBe(0);
    }
  });
});
