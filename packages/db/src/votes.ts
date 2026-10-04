/**
 * Community Choice (vote penonton demo day). Aturan keamanan hidup di sini, WAJIB
 * dipanggil server sebelum menulis — bukan di UI:
 *  - voterAddress SELALU dari session (route mengoper auth.address), bukan input.
 *  - Siapa pun yang sudah sign-in boleh vote, SEKALI per edisi, tak bisa diganti.
 *    Tulis insert-only (tanpa upsert) + PK votes(hackathonId, voterAddress) sebagai
 *    backstop → dua request balapan tak bisa membalik pilihan.
 *  - Hanya boleh saat votingOpen, dan hanya untuk project finalis demo day.
 *  - Tak boleh memilih project sendiri (submitter/anggota tim). Kecuali edisi demo:
 *    finalis mock-nya milik admin pemicu dry-run.
 *  - Hasil per project RAHASIA: hanya admin (backoffice / view admin). Layar besar
 *    hanya menampilkan TOTAL suara (voteScreen).
 */
import { and, count, eq, sql } from "drizzle-orm";
import type { Db } from "./client";
import { getPresentationOrder, sortByPresentation } from "./judging";
import { hackathons, presentationOrder, projects, teamMembers, teams, votes } from "./schema";

/** Edisi demo (dry-run vote, admin-only). Hackathon TERPISAH → terisolasi total dari
 *  edisi live: vote/leaderboard pakai logika ASLI, cuma di-scope ke id ini.
 *  getCurrentHackathon & adminStats mengecualikan id ini supaya tak bocor ke situs live. */
export const DEMO_HACKATHON_ID = "iw3h-demo";

// 10 finalis mock = sama dengan jumlah finalis asli → layar besar (grid 5×2) bisa
// digladikan persis. Tambah baris di sini aman: seed idempotent (onConflictDoNothing).
const DEMO_PROJECTS = [
  { n: 1, name: "Demo — Nusantara Pay" },
  { n: 2, name: "Demo — RantauChain" },
  { n: 3, name: "Demo — Garuda ID" },
  { n: 4, name: "Demo — Warung DeFi" },
  { n: 5, name: "Demo — Lumbung DAO" },
  { n: 6, name: "Demo — Batik NFT" },
  { n: 7, name: "Demo — Ojol Onchain" },
  { n: 8, name: "Demo — Sawah Yield" },
  { n: 9, name: "Demo — Pasar Kripto" },
  { n: 10, name: "Demo — Merapi Bridge" },
].map((p) => ({ ...p, tagline: "Contoh finalis demo day" }));

/** Seed edisi demo (idempotent). leaderAddress/submitter = admin pemicu (user ASLI,
 *  tak bikin user palsu). Tiap finalis punya teamId sendiri utk lolos uq_project_solo. */
export async function ensureDemoEdition(db: Db, adminAddress: string) {
  await db
    .insert(hackathons)
    .values({
      id: DEMO_HACKATHON_ID,
      slug: DEMO_HACKATHON_ID,
      name: "Demo Voting",
      year: 2026,
      status: "submission",
      votingOpen: true,
      leaderboardPublic: false,
    })
    .onConflictDoUpdate({ target: hackathons.id, set: { votingOpen: true } });
  for (const p of DEMO_PROJECTS) {
    const teamId = `demo-team-${p.n}`;
    await db
      .insert(teams)
      .values({
        id: teamId,
        hackathonId: DEMO_HACKATHON_ID,
        name: p.name,
        inviteCode: `demo-invite-${p.n}`,
        leaderAddress: adminAddress,
      })
      .onConflictDoNothing();
    await db
      .insert(projects)
      .values({
        id: `demo-proj-${p.n}`,
        hackathonId: DEMO_HACKATHON_ID,
        teamId,
        submitterAddress: adminAddress,
        name: p.name,
        tagline: p.tagline,
        demoDay: true,
        status: "submitted",
      })
      .onConflictDoNothing();
    // Urutan presentasi demo = nomor seed (1..10) → gladi menampilkan 01–10 seperti hari H.
    await db
      .insert(presentationOrder)
      .values({
        projectId: `demo-proj-${p.n}`,
        hackathonId: DEMO_HACKATHON_ID,
        position: p.n,
        updatedBy: adminAddress,
      })
      .onConflictDoNothing();
  }
}

/** Reset dry-run: hapus semua vote demo (finalis mock tetap). */
export async function resetDemoVotes(db: Db) {
  await db.delete(votes).where(eq(votes.hackathonId, DEMO_HACKATHON_ID));
}

export class VoteError extends Error {
  constructor(
    public code: "voting_closed" | "not_finalist" | "own_project" | "already_voted",
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
    // Sengaja TIDAK menyentuh updatedAt: halaman publik menampilkan "Last edit" dari
    // kolom itu → menandai finalis akan membocorkan siapa finalisnya.
    .set({ demoDay: on })
    .where(eq(projects.id, projectId));
}

export interface DemoDayProject {
  id: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  demoUrl: string | null;
  githubUrl: string | null;
  /** Nomor urut presentasi 1..n (sama dengan form juri & panggung). */
  position: number;
}

/** Kartu-kartu yang tampil di halaman vote & layar besar: finalis, URUT PRESENTASI
 *  (urutan yang diatur admin; finalis tanpa posisi di belakang, lalu nama). */
export async function listDemoDayProjects(db: Db, hackathonId: string): Promise<DemoDayProject[]> {
  const [rows, saved] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        tagline: projects.tagline,
        logoUrl: projects.logoUrl,
        demoUrl: projects.demoUrl,
        githubUrl: projects.githubUrl,
      })
      .from(projects)
      .where(and(eq(projects.hackathonId, hackathonId), eq(projects.demoDay, true))),
    getPresentationOrder(db, hackathonId),
  ]);
  // positionSaved sengaja dibuang: info internal admin, tak perlu sampai ke pemilih.
  return sortByPresentation(rows, saved).map(({ positionSaved: _, ...r }) => r);
}

/** Finalis yang DIMILIKI wallet ini (submitter / anggota / ketua tim) → tak boleh
 *  dipilihnya sendiri. Edisi demo selalu kosong: finalis mock milik admin pemicu. */
export async function ownFinalistIds(
  db: Db,
  hackathonId: string,
  address: string
): Promise<string[]> {
  if (hackathonId === DEMO_HACKATHON_ID) return [];
  const me = address.toLowerCase();
  const rows = await db
    .selectDistinct({ id: projects.id })
    .from(projects)
    .leftJoin(teams, eq(teams.id, projects.teamId))
    .leftJoin(teamMembers, eq(teamMembers.teamId, projects.teamId))
    .where(
      and(
        eq(projects.hackathonId, hackathonId),
        eq(projects.demoDay, true),
        sql`(lower(${projects.submitterAddress}) = ${me} or lower(${teams.leaderAddress}) = ${me} or lower(${teamMembers.address}) = ${me})`
      )
    );
  return rows.map((r) => r.id);
}

/** Vote satu project, SEKALI. Melempar VoteError yang dipetakan route ke 4xx.
 *  Urutan cek: voting dibuka → finalis → belum pernah vote → bukan project sendiri. */
export async function castVote(
  db: Db,
  hackathonId: string,
  voterAddress: string,
  projectId: string
): Promise<{ ok: true }> {
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

  const already = () =>
    new VoteError("already_voted", "Kamu sudah memilih. Pilihan tidak bisa diganti.");
  if ((await getMyVote(db, hackathonId, voterAddress)) !== null) throw already();

  if ((await ownFinalistIds(db, hackathonId, voterAddress)).includes(projectId)) {
    throw new VoteError("own_project", "Kamu tidak bisa memilih project timmu sendiri.");
  }

  // Insert-only: kalau request lain (balapan) sudah menulis duluan, PK bentrok →
  // tak ada baris yang ditulis → already_voted. Pilihan pertama TIDAK pernah tertimpa.
  const inserted = await db
    .insert(votes)
    .values({ hackathonId, voterAddress, projectId })
    .onConflictDoNothing()
    .returning({ projectId: votes.projectId });
  if (inserted.length === 0) throw already();
  return { ok: true };
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
    // Tak peka huruf: alamat yang sama dalam varian lowercase/checksum = orang yang sama
    // (SIWE menerima keduanya) → tak bisa dipakai untuk vote kedua.
    .where(
      and(eq(votes.hackathonId, hackathonId), sql`lower(${votes.voterAddress}) = lower(${address})`)
    )
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
    .sort((a, b) => b.votes - a.votes || a.position - b.position);
}

/** Total suara masuk di edisi ini (satu angka, tanpa rincian per project). */
export async function countVotes(db: Db, hackathonId: string): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(votes)
    .where(eq(votes.hackathonId, hackathonId));
  return rows[0]?.n ?? 0;
}

export type ScreenState = "waiting" | "open" | "closed";

/** waiting = belum dibuka & belum ada suara; open = sedang dibuka;
 *  closed = sudah ditutup setelah ada suara masuk. */
export function screenState(votingOpen: boolean, total: number): ScreenState {
  if (votingOpen) return "open";
  return total > 0 ? "closed" : "waiting";
}

export interface ScreenFinalist {
  id: string;
  name: string;
  logoUrl: string | null;
  position: number;
}

export interface VoteScreen {
  state: ScreenState;
  total: number;
  finalists: ScreenFinalist[];
}

/** Data layar besar (videotron). Sengaja HANYA total: tak ada angka per project di
 *  sini, jadi tak mungkin bocor ke layar walau komponen salah render. Edisi tak ada
 *  → waiting tanpa finalis (layar tetap tampil, bukan error). */
export async function voteScreen(db: Db, hackathonId: string): Promise<VoteScreen> {
  const [h, total, finalists] = await Promise.all([
    db
      .select({ votingOpen: hackathons.votingOpen })
      .from(hackathons)
      .where(eq(hackathons.id, hackathonId))
      .limit(1),
    countVotes(db, hackathonId),
    listDemoDayProjects(db, hackathonId),
  ]);
  return {
    state: screenState(h[0]?.votingOpen ?? false, total),
    total,
    finalists: finalists.map((f) => ({
      id: f.id,
      name: f.name,
      logoUrl: f.logoUrl,
      position: f.position,
    })),
  };
}

/** Buka/tutup voting per edisi. (Kolom leaderboard_public masih ada di skema tapi
 *  tak dipakai lagi: hasil per project selalu khusus admin.) */
export async function setVotingSettings(
  db: Db,
  hackathonId: string,
  patch: { votingOpen: boolean }
) {
  await db
    .update(hackathons)
    .set({ votingOpen: patch.votingOpen })
    .where(eq(hackathons.id, hackathonId));
}
