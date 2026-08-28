import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Db } from "./client";
import { criteria, judgeTracks, prizes, projects, scores, tracks, winners } from "./schema";

export async function listTracks(db: Db, hackathonId: string) {
  return db
    .select()
    .from(tracks)
    .where(eq(tracks.hackathonId, hackathonId))
    .orderBy(asc(tracks.sort));
}

/** Track yang di-assign ke seorang juri (kosong = boleh menilai semua). */
export async function getJudgeTracks(
  db: Db,
  hackathonId: string,
  judgeAddress: string
): Promise<string[]> {
  const rows = await db
    .select({ trackId: judgeTracks.trackId })
    .from(judgeTracks)
    .where(
      and(eq(judgeTracks.hackathonId, hackathonId), eq(judgeTracks.judgeAddress, judgeAddress))
    );
  return rows.map((r) => r.trackId);
}

/** Ganti seluruh assignment track seorang juri. */
export async function setJudgeTracks(
  db: Db,
  hackathonId: string,
  judgeAddress: string,
  trackIds: string[]
): Promise<void> {
  await db
    .delete(judgeTracks)
    .where(
      and(eq(judgeTracks.hackathonId, hackathonId), eq(judgeTracks.judgeAddress, judgeAddress))
    );
  for (const trackId of trackIds) {
    await db
      .insert(judgeTracks)
      .values({ hackathonId, judgeAddress, trackId })
      .onConflictDoNothing();
  }
}

export async function listJudgeAssignments(db: Db, hackathonId: string) {
  return db
    .select({ judgeAddress: judgeTracks.judgeAddress, trackId: judgeTracks.trackId })
    .from(judgeTracks)
    .where(eq(judgeTracks.hackathonId, hackathonId));
}

export async function listCriteria(db: Db, hackathonId: string) {
  return db
    .select()
    .from(criteria)
    .where(eq(criteria.hackathonId, hackathonId))
    .orderBy(asc(criteria.sort));
}

/** Skor yang sudah diberikan seorang juri (untuk prefill form). */
export async function getJudgeScores(db: Db, hackathonId: string, judgeAddress: string) {
  return db
    .select({
      projectId: scores.projectId,
      criterionId: scores.criterionId,
      score: scores.score,
      comment: scores.comment,
    })
    .from(scores)
    .innerJoin(projects, eq(projects.id, scores.projectId))
    .where(and(eq(projects.hackathonId, hackathonId), eq(scores.judgeAddress, judgeAddress)));
}

export interface ScoreEntry {
  criterionId: string;
  score: number; // 1..10 (CHECK constraint di DB)
  comment?: string | null;
}

/** Upsert skor satu juri untuk satu project (per kriteria). */
export async function upsertScores(
  db: Db,
  projectId: string,
  judgeAddress: string,
  entries: ScoreEntry[]
): Promise<void> {
  for (const e of entries) {
    await db
      .insert(scores)
      .values({
        id: `score_${randomBytes(9).toString("hex")}`,
        projectId,
        judgeAddress,
        criterionId: e.criterionId,
        score: e.score,
        comment: e.comment ?? null,
      })
      .onConflictDoUpdate({
        target: [scores.projectId, scores.judgeAddress, scores.criterionId],
        set: { score: e.score, comment: e.comment ?? null, updatedAt: sql`(datetime('now'))` },
      });
  }
}

export interface Ranking {
  projectId: string;
  name: string;
  teamName: string | null;
  avgScore: number; // rata-rata tertimbang (bobot kriteria)
  judges: number;
}

/** Ranking per project = rata-rata tertimbang skor semua juri. Input, bukan keputusan. */
export async function projectRankings(db: Db, hackathonId: string): Promise<Ranking[]> {
  const rows = await db
    .select({
      projectId: projects.id,
      name: projects.name,
      weighted: sql<number>`sum(${scores.score} * ${criteria.weight})`,
      weightSum: sql<number>`sum(${criteria.weight})`,
      judges: sql<number>`count(distinct ${scores.judgeAddress})`,
    })
    .from(projects)
    .leftJoin(scores, eq(scores.projectId, projects.id))
    .leftJoin(criteria, eq(criteria.id, scores.criterionId))
    .where(and(eq(projects.hackathonId, hackathonId), eq(projects.status, "submitted")))
    .groupBy(projects.id)
    .orderBy(
      desc(
        sql`coalesce(sum(${scores.score} * ${criteria.weight}) * 1.0 / nullif(sum(${criteria.weight}),0), 0)`
      )
    );

  return rows.map((r) => ({
    projectId: r.projectId,
    name: r.name,
    teamName: null,
    avgScore: r.weightSum ? Number(r.weighted) / Number(r.weightSum) : 0,
    judges: Number(r.judges ?? 0),
  }));
}

export async function listPrizes(db: Db, hackathonId: string) {
  return db
    .select()
    .from(prizes)
    .where(eq(prizes.hackathonId, hackathonId))
    .orderBy(asc(prizes.sort));
}

export async function listWinners(db: Db) {
  return db.select().from(winners);
}

/** Satu pemenang per prize (PK prize_id) — set/replace. */
export async function setWinner(db: Db, prizeId: string, projectId: string): Promise<void> {
  await db
    .insert(winners)
    .values({ prizeId, projectId })
    .onConflictDoUpdate({
      target: winners.prizeId,
      set: { projectId, announcedAt: sql`(datetime('now'))` },
    });
}

export async function clearWinner(db: Db, prizeId: string): Promise<void> {
  await db.delete(winners).where(eq(winners.prizeId, prizeId));
}
