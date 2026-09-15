/**
 * Vote demo day (offline). Aturan keamanan hidup di sini, WAJIB dipanggil server
 * sebelum menulis — bukan di UI:
 *  - voterAddress SELALU dari session (route mengoper auth.address), bukan input.
 *  - Satu vote per wallet per edisi → dijaga PK votes(hackathonId, voterAddress).
 *  - Hanya boleh saat votingOpen, dan hanya untuk project finalis demo day.
 *  - Yang boleh vote: anggota project finalis, ATAU role non-participant
 *    (judge/admin/panitia). role dibaca segar dari DB oleh requireAuth.
 */
import { and, count, eq, sql } from "drizzle-orm";
import type { Db } from "./client";
import { hackathons, projects, teamMembers, votes } from "./schema";

export class VoteError extends Error {
  constructor(
    public code: "voting_closed" | "not_finalist" | "not_eligible",
    message: string
  ) {
    super(message);
    this.name = "VoteError";
  }
}

/** Finalis demo day = kandidat vote publik. Admin yang menandai (markDemoDay). */
export async function markDemoDay(db: Db, projectId: string, on: boolean) {
  await db
    .update(projects)
    .set({ demoDay: on, updatedAt: sql`(datetime('now'))` })
    .where(eq(projects.id, projectId));
}

export interface DemoDayProject {
  id: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  demoUrl: string | null;
  githubUrl: string | null;
}

/** Kartu-kartu yang tampil di halaman vote (finalis, urut nama). */
export async function listDemoDayProjects(db: Db, hackathonId: string): Promise<DemoDayProject[]> {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      tagline: projects.tagline,
      logoUrl: projects.logoUrl,
      demoUrl: projects.demoUrl,
      githubUrl: projects.githubUrl,
    })
    .from(projects)
    .where(and(eq(projects.hackathonId, hackathonId), eq(projects.demoDay, true)))
    .orderBy(projects.name);
}

/** Boleh vote? Non-participant (judge/admin/panitia) selalu boleh; participant
 *  hanya kalau dia anggota salah satu project finalis. */
async function isEligibleVoter(
  db: Db,
  hackathonId: string,
  address: string,
  role: string
): Promise<boolean> {
  // ponytail: "staff bisa vote" = role apa pun selain participant. Kalau perlu
  // kontrol lebih halus (allowlist role), ganti cek ini dengan tabel role→canVote.
  if (role !== "participant") return true;
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .leftJoin(teamMembers, eq(teamMembers.teamId, projects.teamId))
    .where(
      and(
        eq(projects.hackathonId, hackathonId),
        eq(projects.demoDay, true),
        sql`(${projects.submitterAddress} = ${address} or ${teamMembers.address} = ${address})`
      )
    )
    .limit(1);
  return rows.length > 0;
}

/** Vote satu project. Melempar VoteError yang dipetakan route ke 4xx.
 *  Mengizinkan ganti pilihan selama voting terbuka (tetap 1 baris/wallet). */
export async function castVote(
  db: Db,
  hackathonId: string,
  voterAddress: string,
  role: string,
  projectId: string
): Promise<{ ok: true; changed: boolean }> {
  const h = await db
    .select({ votingOpen: hackathons.votingOpen })
    .from(hackathons)
    .where(eq(hackathons.id, hackathonId))
    .limit(1);
  if (!h[0]?.votingOpen) throw new VoteError("voting_closed", "Voting sedang tertutup");

  const finalist = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.hackathonId, hackathonId),
        eq(projects.demoDay, true)
      )
    )
    .limit(1);
  if (!finalist[0]) throw new VoteError("not_finalist", "Project bukan finalis demo day");

  if (!(await isEligibleVoter(db, hackathonId, voterAddress, role))) {
    throw new VoteError("not_eligible", "Kamu tidak berhak memilih");
  }

  const prev = await getMyVote(db, hackathonId, voterAddress);
  await db
    .insert(votes)
    .values({ hackathonId, voterAddress, projectId })
    .onConflictDoUpdate({
      target: [votes.hackathonId, votes.voterAddress],
      set: { projectId, createdAt: sql`(datetime('now'))` },
    });
  return { ok: true, changed: prev !== null && prev !== projectId };
}

/** projectId pilihan wallet ini, atau null kalau belum vote. */
export async function getMyVote(
  db: Db,
  hackathonId: string,
  address: string
): Promise<string | null> {
  const rows = await db
    .select({ projectId: votes.projectId })
    .from(votes)
    .where(and(eq(votes.hackathonId, hackathonId), eq(votes.voterAddress, address)))
    .limit(1);
  return rows[0]?.projectId ?? null;
}

export interface LeaderboardRow extends DemoDayProject {
  votes: number;
}

/** Semua finalis + jumlah vote, urut terbanyak (finalis 0 vote tetap tampil).
 *  ponytail: COUNT(*) — semua vote bernilai 1. Kalau vote juri mau diberi bobot,
 *  join votes→users lalu SUM(bobot per role); tak perlu ubah skema. */
export async function voteLeaderboard(db: Db, hackathonId: string): Promise<LeaderboardRow[]> {
  const tally = await db
    .select({ projectId: votes.projectId, n: count() })
    .from(votes)
    .where(eq(votes.hackathonId, hackathonId))
    .groupBy(votes.projectId);
  const byId = new Map(tally.map((t) => [t.projectId, t.n]));

  const finalists = await listDemoDayProjects(db, hackathonId);
  return finalists
    .map((p) => ({ ...p, votes: byId.get(p.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
}

/** Setelan vote per edisi (buka/tutup, publik/tidak). Partial update. */
export async function setVotingSettings(
  db: Db,
  hackathonId: string,
  patch: { votingOpen?: boolean; leaderboardPublic?: boolean }
) {
  await db.update(hackathons).set(patch).where(eq(hackathons.id, hackathonId));
}
