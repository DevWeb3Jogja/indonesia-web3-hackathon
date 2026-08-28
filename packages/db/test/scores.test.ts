import { beforeEach, describe, expect, it } from "vitest";
import { createProject } from "../src/projects";
import { ensureUser } from "../src/queries";
import {
  clearWinner,
  getJudgeScores,
  getJudgeTracks,
  listJudgeAssignments,
  listWinners,
  projectRankings,
  setJudgeTracks,
  setWinner,
  upsertScores,
} from "../src/scores";
import { testDb } from "./helpers";

const H = "iw3h-2026";
const addr = (n: number) => `0x${n.toString(16).padStart(40, "0")}`;
const judge = addr(90);

async function seed(db: Awaited<ReturnType<typeof testDb>>) {
  await db.run(
    `INSERT INTO hackathons (id, slug, name, year, status) VALUES ('${H}','s','H',2026,'judging')`
  );
  await db.run(`INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('ai','${H}','T1','AI')`);
  await db.run(
    `INSERT INTO criteria (id, hackathon_id, name, weight) VALUES ('c1','${H}','Tech',2),('c2','${H}','Wow',1)`
  );
  await db.run(`INSERT INTO prizes (id, hackathon_id, name) VALUES ('pz1','${H}','Grand Prize')`);
  for (let i = 1; i <= 3; i++) await ensureUser(db, addr(i));
  await ensureUser(db, judge);
  const ids: string[] = [];
  for (let i = 1; i <= 2; i++) {
    const p = await createProject(db, {
      hackathonId: H,
      submitterAddress: addr(i),
      teamId: null,
      input: { name: `P${i}` },
      trackIds: ["ai"],
    });
    ids.push(p.id);
  }
  return ids;
}

describe("scores & judging (integration)", () => {
  let db: Awaited<ReturnType<typeof testDb>>;
  let projectIds: string[];
  beforeEach(async () => {
    db = await testDb();
    projectIds = await seed(db);
  });

  it("upsert skor: insert lalu update", async () => {
    const [p1] = projectIds;
    await upsertScores(db, p1, judge, [
      { criterionId: "c1", score: 8 },
      { criterionId: "c2", score: 6, comment: "solid" },
    ]);
    let mine = await getJudgeScores(db, H, judge);
    expect(mine).toHaveLength(2);
    // update kriteria c1 → tetap 2 baris, skor berubah
    await upsertScores(db, p1, judge, [{ criterionId: "c1", score: 10 }]);
    mine = await getJudgeScores(db, H, judge);
    expect(mine).toHaveLength(2);
    expect(mine.find((s) => s.criterionId === "c1")?.score).toBe(10);
  });

  it("ranking = rata-rata tertimbang, urut tertinggi dulu", async () => {
    const [p1, p2] = projectIds;
    // P1: Tech(w2)=10, Wow(w1)=10 → (20+10)/3 = 10
    await upsertScores(db, p1, judge, [
      { criterionId: "c1", score: 10 },
      { criterionId: "c2", score: 10 },
    ]);
    // P2: Tech=4, Wow=4 → 4
    await upsertScores(db, p2, judge, [
      { criterionId: "c1", score: 4 },
      { criterionId: "c2", score: 4 },
    ]);
    const rank = await projectRankings(db, H);
    expect(rank[0].projectId).toBe(p1);
    expect(rank[0].avgScore).toBeCloseTo(10);
    expect(rank[0].judges).toBe(1);
    expect(rank[1].avgScore).toBeCloseTo(4);
  });

  it("skor di luar 1-10 ditolak (CHECK)", async () => {
    await expect(
      upsertScores(db, projectIds[0], judge, [{ criterionId: "c1", score: 11 }])
    ).rejects.toThrow();
  });

  it("judge tracks: set (replace) + list", async () => {
    await db.run(
      `INSERT INTO tracks (id, hackathon_id, code, name) VALUES ('fin','${H}','T2','Fin')`
    );
    await setJudgeTracks(db, H, judge, ["ai", "fin"]);
    expect((await getJudgeTracks(db, H, judge)).sort()).toEqual(["ai", "fin"]);
    await setJudgeTracks(db, H, judge, ["ai"]); // replace
    expect(await getJudgeTracks(db, H, judge)).toEqual(["ai"]);
    const all = await listJudgeAssignments(db, H);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ judgeAddress: judge, trackId: "ai" });
    await setJudgeTracks(db, H, judge, []); // clear
    expect(await getJudgeTracks(db, H, judge)).toHaveLength(0);
  });

  it("winner: set, replace, clear", async () => {
    await setWinner(db, "pz1", projectIds[0]);
    let w = await listWinners(db);
    expect(w).toHaveLength(1);
    expect(w[0].projectId).toBe(projectIds[0]);
    await setWinner(db, "pz1", projectIds[1]); // replace (satu pemenang per prize)
    w = await listWinners(db);
    expect(w).toHaveLength(1);
    expect(w[0].projectId).toBe(projectIds[1]);
    await clearWinner(db, "pz1");
    expect(await listWinners(db)).toHaveLength(0);
  });
});
