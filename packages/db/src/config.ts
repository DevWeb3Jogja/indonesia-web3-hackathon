import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "./client";
import {
  criteria,
  hackathons,
  judgeTracks,
  prizes,
  projectTracks,
  scores,
  tracks,
  winners,
} from "./schema";

export class ConfigError extends Error {
  constructor(
    public code: "not_found" | "in_use",
    message: string
  ) {
    super(message);
    this.name = "ConfigError";
  }
}

const rid = (p: string) => `${p}_${randomBytes(9).toString("hex")}`;

// ── Tracks ──────────────────────────────────────────────────────────────────
export interface TrackInput {
  code: string;
  name: string;
  description?: string | null;
  sort?: number;
}

export async function createTrack(db: Db, hackathonId: string, input: TrackInput) {
  const id = rid("track");
  await db.insert(tracks).values({ id, hackathonId, ...input });
  return { id };
}

export async function updateTrack(
  db: Db,
  hackathonId: string,
  id: string,
  input: Partial<TrackInput>
) {
  const res = await db
    .update(tracks)
    .set(input)
    .where(and(eq(tracks.id, id), eq(tracks.hackathonId, hackathonId)));
  if (res.rowsAffected === 0) throw new ConfigError("not_found", "Track tidak ditemukan");
}

export async function deleteTrack(db: Db, hackathonId: string, id: string) {
  const owned = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(and(eq(tracks.id, id), eq(tracks.hackathonId, hackathonId)))
    .limit(1);
  if (owned.length === 0) throw new ConfigError("not_found", "Track tidak ditemukan");
  // Blokir hapus kalau masih dipakai project / prize / assignment juri (jaga integritas).
  const [inProjects, inPrizes, inJudges] = await Promise.all([
    db.$count(projectTracks, eq(projectTracks.trackId, id)),
    db.$count(prizes, eq(prizes.trackId, id)),
    db.$count(judgeTracks, eq(judgeTracks.trackId, id)),
  ]);
  if (inProjects + inPrizes + inJudges > 0) {
    throw new ConfigError(
      "in_use",
      `Track masih dipakai (${inProjects} project, ${inPrizes} prize, ${inJudges} juri). Pindahkan/hapus dulu.`
    );
  }
  await db.delete(tracks).where(eq(tracks.id, id));
}

// ── Criteria ────────────────────────────────────────────────────────────────
export interface CriterionInput {
  name: string;
  description?: string | null;
  weight?: number;
  sort?: number;
}

export async function createCriterion(db: Db, hackathonId: string, input: CriterionInput) {
  const id = rid("crit");
  await db.insert(criteria).values({ id, hackathonId, ...input });
  return { id };
}

export async function updateCriterion(
  db: Db,
  hackathonId: string,
  id: string,
  input: Partial<CriterionInput>
) {
  const res = await db
    .update(criteria)
    .set(input)
    .where(and(eq(criteria.id, id), eq(criteria.hackathonId, hackathonId)));
  if (res.rowsAffected === 0) throw new ConfigError("not_found", "Kriteria tidak ditemukan");
}

export async function deleteCriterion(db: Db, hackathonId: string, id: string) {
  const owned = await db
    .select({ id: criteria.id })
    .from(criteria)
    .where(and(eq(criteria.id, id), eq(criteria.hackathonId, hackathonId)))
    .limit(1);
  if (owned.length === 0) throw new ConfigError("not_found", "Kriteria tidak ditemukan");
  // Kriteria yang sudah dipakai menilai tak boleh dihapus (skor jadi orphan/ranking rusak).
  const used = await db.$count(scores, eq(scores.criterionId, id));
  if (used > 0) {
    throw new ConfigError(
      "in_use",
      `Kriteria sudah dipakai di ${used} penilaian; tidak bisa dihapus.`
    );
  }
  await db.delete(criteria).where(eq(criteria.id, id));
}

// ── Prizes ──────────────────────────────────────────────────────────────────
export interface PrizeInput {
  name: string;
  trackId?: string | null;
  amountUsd?: number | null;
  sponsor?: string | null;
  sort?: number;
}

export async function createPrize(db: Db, hackathonId: string, input: PrizeInput) {
  const id = rid("prize");
  await db.insert(prizes).values({ id, hackathonId, ...input });
  return { id };
}

export async function updatePrize(
  db: Db,
  hackathonId: string,
  id: string,
  input: Partial<PrizeInput>
) {
  const res = await db
    .update(prizes)
    .set(input)
    .where(and(eq(prizes.id, id), eq(prizes.hackathonId, hackathonId)));
  if (res.rowsAffected === 0) throw new ConfigError("not_found", "Prize tidak ditemukan");
}

export async function deletePrize(db: Db, hackathonId: string, id: string) {
  const owned = await db
    .select({ id: prizes.id })
    .from(prizes)
    .where(and(eq(prizes.id, id), eq(prizes.hackathonId, hackathonId)))
    .limit(1);
  if (owned.length === 0) throw new ConfigError("not_found", "Prize tidak ditemukan");
  // Hapus prize = hapus juga penetapan pemenangnya (winners.prize_id → prizes.id).
  await db.batch([
    db.delete(winners).where(eq(winners.prizeId, id)),
    db.delete(prizes).where(eq(prizes.id, id)),
  ]);
}

// ── Hackathon settings ───────────────────────────────────────────────────────
export interface HackathonSettingsInput {
  name?: string;
  year?: number;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  submissionOpensAt?: string | null;
  submissionClosesAt?: string | null;
  judgingClosesAt?: string | null;
  winnersAnnouncedAt?: string | null;
}

/** Edit metadata edisi (BUKAN status/fase — itu lewat setHackathonStatus). */
export async function updateHackathon(db: Db, id: string, input: HackathonSettingsInput) {
  if (Object.keys(input).length === 0) return;
  const res = await db.update(hackathons).set(input).where(eq(hackathons.id, id));
  if (res.rowsAffected === 0) throw new ConfigError("not_found", "Hackathon tidak ditemukan");
}
