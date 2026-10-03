/**
 * Kurasi (backoffice): saring lolos/gugur → nilai 1..5 per kriteria → shortlist
 * 10 finalis utama + 5 cadangan. Aturan hidup di sini, WAJIB dipanggil server
 * sebelum menulis — UI hanya menyembunyikan tombol.
 *  - reviewer SELALU dari session (route mengoper auth.address), bukan input.
 *  - Penilai wajib memilih organisasi dulu; organisasi disalin ke tiap penilaian.
 *  - Hanya project `submitted` milik hackathon aktif yang bisa dikurasi.
 *  - Semua data di sini rahasia: hanya route backoffice yang boleh membacanya.
 */
import { and, asc, eq, inArray, ne, or } from "drizzle-orm";
import type { Db } from "./client";
import type { PhaseInfo } from "./phase";
import { canSubmitProject, isFrozen } from "./phase";
import {
  criteria,
  curationReviewers,
  curationReviews,
  curationScores,
  curationScreens,
  finalists,
  projects,
  projectTracks,
  teamMembers,
  teams,
} from "./schema";

export const CURATION_ORGS = ["binance-academy", "coinvestasi", "devweb3jogja"] as const;
export type CurationOrg = (typeof CURATION_ORGS)[number];

export const SCREEN_REASONS = [
  "demo_broken",
  "repo_inaccessible",
  "video_missing",
  "off_track",
  "duplicate",
  "other",
] as const;
export type ScreenReason = (typeof SCREEN_REASONS)[number];

export const FINALIST_SLOTS = ["main", "reserve"] as const;
export type FinalistSlot = (typeof FINALIST_SLOTS)[number];
export const CONTACT_STATUSES = ["pending", "contacted", "confirmed", "declined"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];
/** Kuota: 10 finalis demo day + 5 cadangan. Yang declined tak dihitung. */
export const FINALIST_QUOTA: Record<FinalistSlot, number> = { main: 10, reserve: 5 };

export class CurationError extends Error {
  constructor(
    public code:
      | "closed"
      | "no_org"
      | "invalid_project"
      | "not_passed"
      | "invalid_criteria"
      | "quota_full"
      | "conflict"
      | "is_finalist",
    message: string
  ) {
    super(message);
    this.name = "CurationError";
  }
}

/** Kurasi dibuka setelah submission tertutup (status/deadline) dan sebelum completed —
 *  menilai project yang masih bisa diedit peserta tak adil. */
export function canCurate(h: PhaseInfo, now = new Date()): boolean {
  if (isFrozen(h) || h.status === "draft" || h.status === "registration") return false;
  return !canSubmitProject(h, now);
}

export async function getReviewerOrg(
  db: Db,
  hackathonId: string,
  address: string
): Promise<CurationOrg | null> {
  const rows = await db
    .select({ organization: curationReviewers.organization })
    .from(curationReviewers)
    .where(
      and(eq(curationReviewers.hackathonId, hackathonId), eq(curationReviewers.address, address))
    )
    .limit(1);
  return (rows[0]?.organization as CurationOrg | undefined) ?? null;
}

export async function setReviewerOrg(
  db: Db,
  hackathonId: string,
  address: string,
  organization: CurationOrg
): Promise<void> {
  await db
    .insert(curationReviewers)
    .values({ hackathonId, address, organization })
    .onConflictDoUpdate({
      target: [curationReviewers.hackathonId, curationReviewers.address],
      set: { organization, updatedAt: new Date().toISOString() },
    });
}

async function requireOrg(db: Db, hackathonId: string, address: string): Promise<CurationOrg> {
  const org = await getReviewerOrg(db, hackathonId, address);
  if (!org) throw new CurationError("no_org", "Pilih organisasi dulu sebelum menilai");
  return org;
}

/** Project wajib submitted & milik hackathon ini (cegah kurasi lintas-hackathon/draft/DQ). */
async function requireSubmitted(db: Db, hackathonId: string, projectId: string) {
  const rows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.hackathonId, hackathonId),
        eq(projects.status, "submitted")
      )
    )
    .limit(1);
  if (!rows[0]) throw new CurationError("invalid_project", "Project tidak valid untuk kurasi");
  return rows[0];
}

/** Konflik kepentingan: penilai tak boleh menyaring/menilai project miliknya sendiri
 *  (submitter atau anggota tim). Role panitia tetap bisa ikut tim di situs web. */
async function assertNotOwnProject(db: Db, projectId: string, reviewer: string) {
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .leftJoin(teamMembers, eq(teamMembers.teamId, projects.teamId))
    .where(
      and(
        eq(projects.id, projectId),
        or(eq(projects.submitterAddress, reviewer), eq(teamMembers.address, reviewer))
      )
    )
    .limit(1);
  if (rows[0]) throw new CurationError("conflict", "Tidak boleh menilai project sendiri");
}

export interface ScreenInput {
  hackathonId: string;
  projectId: string;
  reviewer: string;
  decision: "pass" | "fail";
  reason?: ScreenReason | null;
  note?: string | null;
}

/** Tahap 1: satu keputusan per project; penilai terakhir menang (riwayat di audit). */
export async function screenProject(db: Db, input: ScreenInput) {
  const organization = await requireOrg(db, input.hackathonId, input.reviewer);
  const project = await requireSubmitted(db, input.hackathonId, input.projectId);
  await assertNotOwnProject(db, input.projectId, input.reviewer);
  if (input.decision === "fail") {
    // Project di shortlist tak boleh diam-diam digugurkan (kuota tetap terpakai, admin
    // tak dapat sinyal). Admin keluarkan dulu dari shortlist.
    const inShortlist = await db.$count(finalists, eq(finalists.projectId, input.projectId));
    if (inShortlist > 0) {
      throw new CurationError("is_finalist", "Project ada di shortlist — admin keluarkan dulu");
    }
  }
  // Gugur wajib beralasan; lolos tak menyimpan alasan.
  const reason = input.decision === "fail" ? (input.reason ?? "other") : null;
  const row = {
    decision: input.decision,
    reason,
    note: input.note ?? null,
    reviewerAddress: input.reviewer,
    organization,
    updatedAt: new Date().toISOString(),
  };
  await db
    .insert(curationScreens)
    .values({ projectId: input.projectId, ...row })
    .onConflictDoUpdate({ target: curationScreens.projectId, set: row });
  return { name: project.name, organization };
}

export interface ReviewInput {
  hackathonId: string;
  projectId: string;
  reviewer: string;
  entries: { criterionId: string; score: number }[];
  note?: string | null;
}

/** Tahap 2: nilai SEMUA kriteria (tepat satu kali masing-masing) untuk project yang
 *  sudah lolos saring. Penilaian ulang menimpa milik penilai yang sama. */
export async function saveCurationReview(db: Db, input: ReviewInput) {
  const organization = await requireOrg(db, input.hackathonId, input.reviewer);
  const project = await requireSubmitted(db, input.hackathonId, input.projectId);
  await assertNotOwnProject(db, input.projectId, input.reviewer);

  const screen = await db
    .select({ decision: curationScreens.decision })
    .from(curationScreens)
    .where(eq(curationScreens.projectId, input.projectId))
    .limit(1);
  if (screen[0]?.decision !== "pass") {
    throw new CurationError("not_passed", "Project belum lolos tahap saring");
  }

  const crit = await db
    .select({ id: criteria.id })
    .from(criteria)
    .where(eq(criteria.hackathonId, input.hackathonId));
  const want = new Set(crit.map((c) => c.id));
  const got = input.entries.map((e) => e.criterionId);
  if (
    want.size === 0 ||
    got.length !== want.size ||
    new Set(got).size !== got.length ||
    !got.every((id) => want.has(id)) ||
    !input.entries.every((e) => Number.isInteger(e.score) && e.score >= 1 && e.score <= 5)
  ) {
    throw new CurationError("invalid_criteria", "Isi semua kriteria dengan nilai 1–5");
  }

  const now = new Date().toISOString();
  await db.batch([
    db
      .insert(curationReviews)
      .values({
        projectId: input.projectId,
        reviewerAddress: input.reviewer,
        organization,
        note: input.note ?? null,
      })
      .onConflictDoUpdate({
        target: [curationReviews.projectId, curationReviews.reviewerAddress],
        set: { organization, note: input.note ?? null, updatedAt: now },
      }),
    db
      .delete(curationScores)
      .where(
        and(
          eq(curationScores.projectId, input.projectId),
          eq(curationScores.reviewerAddress, input.reviewer)
        )
      ),
    ...input.entries.map((e) =>
      db.insert(curationScores).values({
        projectId: input.projectId,
        reviewerAddress: input.reviewer,
        criterionId: e.criterionId,
        score: e.score,
      })
    ),
  ]);
  return { name: project.name, organization };
}

export interface FinalistInput {
  hackathonId: string;
  projectId: string;
  actor: string;
  /** null = keluarkan dari shortlist. */
  slot: FinalistSlot | null;
  contactStatus?: ContactStatus;
  note?: string | null;
}

/** Set/ubah/hapus shortlist. Kuota per slot dihitung dari baris non-declined. */
export async function setFinalist(db: Db, input: FinalistInput) {
  const project = await requireSubmitted(db, input.hackathonId, input.projectId);
  if (input.slot === null) {
    await db.delete(finalists).where(eq(finalists.projectId, input.projectId));
    return { name: project.name };
  }

  const existing = await db
    .select()
    .from(finalists)
    .where(eq(finalists.projectId, input.projectId))
    .limit(1);
  const contactStatus = input.contactStatus ?? existing[0]?.contactStatus ?? "pending";
  const note = input.note !== undefined ? input.note : (existing[0]?.note ?? null);

  if (contactStatus !== "declined") {
    const taken = await db.$count(
      finalists,
      and(
        eq(finalists.hackathonId, input.hackathonId),
        eq(finalists.slot, input.slot),
        ne(finalists.contactStatus, "declined"),
        ne(finalists.projectId, input.projectId)
      )
    );
    if (taken >= FINALIST_QUOTA[input.slot]) {
      throw new CurationError(
        "quota_full",
        `Slot ${input.slot === "main" ? "utama" : "cadangan"} penuh (${FINALIST_QUOTA[input.slot]})`
      );
    }
  }

  const row = {
    slot: input.slot,
    contactStatus,
    note,
    updatedBy: input.actor,
    updatedAt: new Date().toISOString(),
  };
  await db
    .insert(finalists)
    .values({ projectId: input.projectId, hackathonId: input.hackathonId, ...row })
    .onConflictDoUpdate({ target: finalists.projectId, set: row });
  return { name: project.name, slot: input.slot, contactStatus };
}

/** Dipakai saat diskualifikasi: project DQ tak boleh tetap di shortlist. */
export async function clearFinalistForProject(db: Db, projectId: string): Promise<void> {
  await db.delete(finalists).where(eq(finalists.projectId, projectId));
}

export interface CurationRow {
  id: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  teamName: string | null;
  trackIds: string[];
  screen: {
    decision: "pass" | "fail";
    reason: string | null;
    note: string | null;
    reviewerAddress: string;
    organization: string;
    updatedAt: string;
  } | null;
  reviews: { reviewerAddress: string; organization: string; note: string | null }[];
  /** Rata-rata per kriteria (lintas penilai), 1..5. */
  criterionAvg: Record<string, number>;
  /** Σ(rata-rata kriteria × bobot) / Σ bobot, skala 1..5. null = belum dinilai. */
  score: number | null;
  /** Nilai milik penilai yang sedang login (prefill form). */
  myScores: Record<string, number>;
  myNote: string | null;
  finalist: { slot: FinalistSlot; contactStatus: ContactStatus; note: string | null } | null;
}

/** Seluruh data papan kurasi untuk satu hackathon (±200 project — aman dimuat sekaligus). */
export async function curationBoard(
  db: Db,
  hackathonId: string,
  viewer: string,
  /** false untuk panitia: shortlist & status kontak admin-only (jangan sampai ke props). */
  opts: { includeFinalists: boolean } = { includeFinalists: true }
): Promise<{
  criteria: { id: string; name: string; description: string | null; weight: number }[];
  rows: CurationRow[];
}> {
  const crit = await db
    .select({
      id: criteria.id,
      name: criteria.name,
      description: criteria.description,
      weight: criteria.weight,
    })
    .from(criteria)
    .where(eq(criteria.hackathonId, hackathonId))
    .orderBy(asc(criteria.sort));

  const projs = await db
    .select({
      id: projects.id,
      name: projects.name,
      tagline: projects.tagline,
      logoUrl: projects.logoUrl,
      teamId: projects.teamId,
    })
    .from(projects)
    .where(and(eq(projects.hackathonId, hackathonId), eq(projects.status, "submitted")))
    .orderBy(asc(projects.name));
  if (projs.length === 0) return { criteria: crit, rows: [] };
  const ids = projs.map((p) => p.id);
  const teamIds = [...new Set(projs.map((p) => p.teamId).filter((t): t is string => !!t))];

  const [trackRows, teamRows, screens, reviews, scoreRows, finalistRows] = await Promise.all([
    db
      .select({ projectId: projectTracks.projectId, trackId: projectTracks.trackId })
      .from(projectTracks)
      .where(inArray(projectTracks.projectId, ids)),
    teamIds.length
      ? db.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, teamIds))
      : Promise.resolve([] as { id: string; name: string }[]),
    db.select().from(curationScreens).where(inArray(curationScreens.projectId, ids)),
    db.select().from(curationReviews).where(inArray(curationReviews.projectId, ids)),
    db.select().from(curationScores).where(inArray(curationScores.projectId, ids)),
    opts.includeFinalists
      ? db.select().from(finalists).where(eq(finalists.hackathonId, hackathonId))
      : Promise.resolve([] as (typeof finalists.$inferSelect)[]),
  ]);

  const group = <T, K>(arr: T[], key: (x: T) => K) => {
    const m = new Map<K, T[]>();
    for (const x of arr) {
      const k = key(x);
      const a = m.get(k);
      if (a) a.push(x);
      else m.set(k, [x]);
    }
    return m;
  };
  const tracksBy = group(trackRows, (r) => r.projectId);
  const teamName = new Map(teamRows.map((t) => [t.id, t.name]));
  const screenBy = new Map(screens.map((s) => [s.projectId, s]));
  const reviewsBy = group(reviews, (r) => r.projectId);
  const scoresBy = group(scoreRows, (r) => r.projectId);
  const finalistBy = new Map(finalistRows.map((f) => [f.projectId, f]));

  const rows: CurationRow[] = projs.map((p) => {
    const ps = scoresBy.get(p.id) ?? [];
    const criterionAvg: Record<string, number> = {};
    for (const c of crit) {
      const vals = ps.filter((s) => s.criterionId === c.id).map((s) => s.score);
      if (vals.length) criterionAvg[c.id] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    // Hanya kriteria yang punya nilai yang ikut dibobot (kriteria baru tak menghukum).
    const scored = crit.filter((c) => criterionAvg[c.id] !== undefined);
    const wSum = scored.reduce((a, c) => a + c.weight, 0);
    const score = wSum
      ? scored.reduce((a, c) => a + criterionAvg[c.id] * c.weight, 0) / wSum
      : null;
    const mine = ps.filter((s) => s.reviewerAddress === viewer);
    const s = screenBy.get(p.id);
    const f = finalistBy.get(p.id);
    const rv = reviewsBy.get(p.id) ?? [];
    return {
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      logoUrl: p.logoUrl,
      teamName: p.teamId ? (teamName.get(p.teamId) ?? null) : null,
      trackIds: (tracksBy.get(p.id) ?? []).map((t) => t.trackId),
      screen: s
        ? {
            decision: s.decision as "pass" | "fail",
            reason: s.reason,
            note: s.note,
            reviewerAddress: s.reviewerAddress,
            organization: s.organization,
            updatedAt: s.updatedAt,
          }
        : null,
      reviews: rv.map((r) => ({
        reviewerAddress: r.reviewerAddress,
        organization: r.organization,
        note: r.note,
      })),
      criterionAvg,
      score,
      myScores: Object.fromEntries(mine.map((m) => [m.criterionId, m.score])),
      myNote: rv.find((r) => r.reviewerAddress === viewer)?.note ?? null,
      finalist: f
        ? {
            slot: f.slot as FinalistSlot,
            contactStatus: f.contactStatus as ContactStatus,
            note: f.note,
          }
        : null,
    };
  });
  return { criteria: crit, rows };
}
