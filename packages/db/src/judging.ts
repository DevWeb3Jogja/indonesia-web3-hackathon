/**
 * Penjurian final (demo day): 10 finalis dinilai 3–4 juri secara live, panitia
 * berunding memakai rekap + papan skor. Aturan hidup di sini, WAJIB dipanggil
 * server sebelum menulis — UI hanya menyembunyikan tombol.
 *  - Finalis = project `submitted` + `demo_day` milik hackathon aktif.
 *  - Skala 1..5. Kriteria `filled_by = judge` dinilai juri (tabel `scores`);
 *    `filled_by = organizer` (mis. Participation) diisi panitia (`organizer_scores`).
 *  - Nilai akhir = Σ(nilai_k × bobot_k) / Σ bobot_k atas kriteria yang sudah punya
 *    nilai; nilai_k = rata-rata semua juri (kriteria juri) atau nilai panitia.
 *    Kriteria yang belum bernilai → baris ditandai belum lengkap.
 *  - Tie-breaker: nilai akhir sama → nilai kriteria berbobot terbesar (bobot sama →
 *    urutan `sort`), lalu kriteria berikutnya; masih sama → ditandai seri.
 *  - Semua hasil RAHASIA: rekap hanya untuk route backoffice (admin); juri hanya
 *    membaca nilai & catatan miliknya sendiri.
 */
import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "./client";
import {
  criteria,
  judgeNotes,
  judgeTracks,
  organizerScores,
  presentationOrder,
  projects,
  projectTracks,
  scores,
  teams,
  users,
} from "./schema";
import { getJudgeTracks } from "./scores";

export const FINAL_SCORE_MIN = 1;
export const FINAL_SCORE_MAX = 5;
export const CRITERION_FILLERS = ["judge", "organizer"] as const;
export type CriterionFiller = (typeof CRITERION_FILLERS)[number];

export class JudgingError extends Error {
  constructor(
    public code: "invalid_project" | "out_of_track" | "invalid_criteria" | "invalid_order",
    message: string
  ) {
    super(message);
    this.name = "JudgingError";
  }
}

const validScore = (n: number) =>
  Number.isInteger(n) && n >= FINAL_SCORE_MIN && n <= FINAL_SCORE_MAX;

/** Juri tanpa assignment track = boleh menilai semua; selain itu minimal satu track cocok. */
export function judgeCovers(assignedTrackIds: string[], projectTrackIds: string[]): boolean {
  return (
    assignedTrackIds.length === 0 || projectTrackIds.some((id) => assignedTrackIds.includes(id))
  );
}

const finalistWhere = (hackathonId: string) =>
  and(
    eq(projects.hackathonId, hackathonId),
    eq(projects.status, "submitted"),
    eq(projects.demoDay, true)
  );

// ── Urutan presentasi (demo day) ─────────────────────────────────────────────

/** Posisi tersimpan (diatur admin) per projectId untuk hackathon ini. Bisa memuat
 *  project yang sudah bukan finalis — pemakai selalu menyaring lewat daftar finalis. */
export async function getPresentationOrder(
  db: Db,
  hackathonId: string
): Promise<Map<string, number>> {
  const rows = await db
    .select({ projectId: presentationOrder.projectId, position: presentationOrder.position })
    .from(presentationOrder)
    .where(eq(presentationOrder.hackathonId, hackathonId));
  return new Map(rows.map((r) => [r.projectId, r.position]));
}

export interface Presented {
  /** Nomor tampil 1..n atas SEMUA finalis (urut presentasi), tanpa celah. */
  position: number;
  /** false = belum masuk urutan yang disimpan admin (mis. demo_day dinyalakan belakangan). */
  positionSaved: boolean;
}

/** Urutkan finalis: posisi tersimpan naik; tanpa posisi di belakang, lalu nama, lalu id.
 *  Nomor dihitung ulang 1..n (celah karena finalis dicabut/dihapus tak terlihat). */
export function sortByPresentation<T extends { id: string; name: string }>(
  rows: T[],
  saved: Map<string, number>
): (T & Presented)[] {
  const pos = (r: T) => saved.get(r.id) ?? Number.POSITIVE_INFINITY;
  return [...rows]
    .sort((a, b) => {
      const pa = pos(a);
      const pb = pos(b);
      if (pa !== pb) return pa < pb ? -1 : 1;
      return a.name.localeCompare(b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    })
    .map((r, i) => ({ ...r, position: i + 1, positionSaved: saved.has(r.id) }));
}

export const PRESENTATION_MAX = 50;

/** Admin mengganti SELURUH urutan presentasi (atomik). Wajib memuat semua finalis saat
 *  ini tepat sekali — daftar basi (finalis berubah sejak halaman dimuat) ditolak supaya
 *  tak ada finalis yang diam-diam terlempar ke belakang. Posisi = urutan array (1..n). */
export async function setPresentationOrder(
  db: Db,
  input: { hackathonId: string; projectIds: string[]; actor: string }
): Promise<{ order: { id: string; name: string }[] }> {
  const { hackathonId, projectIds, actor } = input;
  if (new Set(projectIds).size !== projectIds.length) {
    throw new JudgingError("invalid_order", "Urutan memuat project ganda");
  }
  const current = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(finalistWhere(hackathonId));
  if (current.length === 0) {
    throw new JudgingError("invalid_order", "Belum ada finalis demo day");
  }
  const byId = new Map(current.map((p) => [p.id, p.name]));
  if (projectIds.length !== current.length || !projectIds.every((id) => byId.has(id))) {
    throw new JudgingError(
      "invalid_order",
      "Daftar finalis sudah berubah — muat ulang lalu atur urutan lagi"
    );
  }
  const now = new Date().toISOString();
  await db.batch([
    // Ganti utuh: baris lama (termasuk project yang sudah bukan finalis) ikut bersih.
    db.delete(presentationOrder).where(eq(presentationOrder.hackathonId, hackathonId)),
    ...projectIds.map((projectId, i) =>
      db.insert(presentationOrder).values({
        projectId,
        hackathonId,
        position: i + 1,
        updatedBy: actor,
        updatedAt: now,
      })
    ),
  ]);
  return { order: projectIds.map((id) => ({ id, name: byId.get(id) as string })) };
}

/** Project wajib finalis demo day hackathon ini (cegah nilai lintas-hackathon/non-finalis). */
async function requireFinalist(db: Db, hackathonId: string, projectId: string) {
  const rows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.id, projectId), finalistWhere(hackathonId)))
    .limit(1);
  if (!rows[0]) throw new JudgingError("invalid_project", "Project bukan finalis demo day");
  const tracks = await db
    .select({ trackId: projectTracks.trackId })
    .from(projectTracks)
    .where(eq(projectTracks.projectId, projectId));
  return { ...rows[0], trackIds: tracks.map((t) => t.trackId) };
}

async function criteriaOf(db: Db, hackathonId: string) {
  return db
    .select({
      id: criteria.id,
      name: criteria.name,
      description: criteria.description,
      weight: criteria.weight,
      sort: criteria.sort,
      filledBy: criteria.filledBy,
    })
    .from(criteria)
    .where(eq(criteria.hackathonId, hackathonId))
    .orderBy(asc(criteria.sort));
}

export interface JudgeFinalist {
  id: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  demoVideoUrl: string | null;
  teamName: string | null;
  trackIds: string[];
  /** Nomor urut presentasi atas SEMUA finalis (bukan hanya yang terlihat juri ini). */
  position: number;
  positionSaved: boolean;
}

/** Finalis yang boleh dinilai juri ini (filter assignment track; kosong = semua), urut
 *  presentasi. Nomor dihitung sebelum filter track → sama dengan nomor di panggung. */
export async function listJudgeFinalists(
  db: Db,
  hackathonId: string,
  judgeAddress: string
): Promise<JudgeFinalist[]> {
  const [rows, assigned, saved] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        tagline: projects.tagline,
        logoUrl: projects.logoUrl,
        githubUrl: projects.githubUrl,
        demoUrl: projects.demoUrl,
        demoVideoUrl: projects.demoVideoUrl,
        teamName: teams.name,
      })
      .from(projects)
      .leftJoin(teams, eq(teams.id, projects.teamId))
      .where(finalistWhere(hackathonId)),
    getJudgeTracks(db, hackathonId, judgeAddress),
    getPresentationOrder(db, hackathonId),
  ]);
  if (rows.length === 0) return [];
  const trackRows = await db
    .select({ projectId: projectTracks.projectId, trackId: projectTracks.trackId })
    .from(projectTracks)
    .where(
      inArray(
        projectTracks.projectId,
        rows.map((r) => r.id)
      )
    );
  return sortByPresentation(rows, saved)
    .map((r) => ({
      ...r,
      trackIds: trackRows.filter((t) => t.projectId === r.id).map((t) => t.trackId),
    }))
    .filter((r) => judgeCovers(assigned, r.trackIds));
}

/** Kriteria yang tampil di form juri (organizer disembunyikan) + bobot % dari total
 *  SEMUA kriteria (karena nilai akhir dibobot atas semua kriteria). */
export async function listJudgeCriteria(db: Db, hackathonId: string) {
  const crit = await criteriaOf(db, hackathonId);
  const total = crit.reduce((a, c) => a + c.weight, 0);
  return crit
    .filter((c) => c.filledBy === "judge")
    .map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      weight: c.weight,
      weightPct: total ? (c.weight / total) * 100 : 0,
    }));
}

/** Catatan milik seorang juri (prefill form), per projectId. */
export async function getJudgeNotes(db: Db, hackathonId: string, judgeAddress: string) {
  return db
    .select({
      projectId: judgeNotes.projectId,
      teamNote: judgeNotes.teamNote,
      internalNote: judgeNotes.internalNote,
    })
    .from(judgeNotes)
    .innerJoin(projects, eq(projects.id, judgeNotes.projectId))
    .where(and(eq(projects.hackathonId, hackathonId), eq(judgeNotes.judgeAddress, judgeAddress)));
}

export interface JudgeScoreInput {
  hackathonId: string;
  projectId: string;
  /** SELALU dari session (route mengoper auth.address), bukan input. */
  judge: string;
  entries: { criterionId: string; score: number }[];
  teamNote?: string | null;
  internalNote?: string | null;
}

/** Simpan nilai satu juri untuk satu finalis: WAJIB semua kriteria juri tepat sekali,
 *  1..5. Menimpa nilai juri yang sama (atomik) + catatan di judge_notes. */
export async function saveJudgeScores(db: Db, input: JudgeScoreInput) {
  const project = await requireFinalist(db, input.hackathonId, input.projectId);
  const assigned = await getJudgeTracks(db, input.hackathonId, input.judge);
  if (!judgeCovers(assigned, project.trackIds)) {
    throw new JudgingError("out_of_track", "Project di luar track yang kamu nilai");
  }

  const crit = await criteriaOf(db, input.hackathonId);
  const judgeIds = new Set(crit.filter((c) => c.filledBy === "judge").map((c) => c.id));
  const got = input.entries.map((e) => e.criterionId);
  if (got.some((id) => crit.some((c) => c.id === id && c.filledBy === "organizer"))) {
    throw new JudgingError("invalid_criteria", "Kriteria ini diisi panitia, bukan juri");
  }
  if (
    judgeIds.size === 0 ||
    got.length !== judgeIds.size ||
    new Set(got).size !== got.length ||
    !got.every((id) => judgeIds.has(id)) ||
    !input.entries.every((e) => validScore(e.score))
  ) {
    throw new JudgingError("invalid_criteria", "Isi semua kriteria dengan nilai 1–5");
  }

  const teamNote = input.teamNote?.trim() || null;
  const internalNote = input.internalNote?.trim() || null;
  const now = new Date().toISOString();
  await db.batch([
    // Hapus dulu milik juri ini → baris basi (kriteria yang dihapus/diubah ke organizer) ikut bersih.
    db
      .delete(scores)
      .where(and(eq(scores.projectId, input.projectId), eq(scores.judgeAddress, input.judge))),
    ...input.entries.map((e) =>
      db.insert(scores).values({
        id: `score_${randomBytes(9).toString("hex")}`,
        projectId: input.projectId,
        judgeAddress: input.judge,
        criterionId: e.criterionId,
        score: e.score,
      })
    ),
    db
      .insert(judgeNotes)
      .values({ projectId: input.projectId, judgeAddress: input.judge, teamNote, internalNote })
      .onConflictDoUpdate({
        target: [judgeNotes.projectId, judgeNotes.judgeAddress],
        set: { teamNote, internalNote, updatedAt: now },
      }),
  ]);
  return { name: project.name };
}

export interface OrganizerScoreInput {
  hackathonId: string;
  projectId: string;
  criterionId: string;
  /** null = kosongkan. */
  score: number | null;
  actor: string;
}

/** Panitia mengisi kriteria `filled_by = organizer` untuk finalis (1..5 atau kosong). */
export async function setOrganizerScore(db: Db, input: OrganizerScoreInput) {
  const project = await requireFinalist(db, input.hackathonId, input.projectId);
  const crit = await db
    .select({ id: criteria.id, name: criteria.name, filledBy: criteria.filledBy })
    .from(criteria)
    .where(and(eq(criteria.id, input.criterionId), eq(criteria.hackathonId, input.hackathonId)))
    .limit(1);
  if (crit[0]?.filledBy !== "organizer") {
    throw new JudgingError("invalid_criteria", "Kriteria ini bukan kriteria panitia");
  }
  const where = and(
    eq(organizerScores.projectId, input.projectId),
    eq(organizerScores.criterionId, input.criterionId)
  );
  if (input.score === null) {
    await db.delete(organizerScores).where(where);
    return { name: project.name, criterion: crit[0].name };
  }
  if (!validScore(input.score)) {
    throw new JudgingError("invalid_criteria", "Nilai harus 1–5");
  }
  const row = { score: input.score, updatedBy: input.actor, updatedAt: new Date().toISOString() };
  await db
    .insert(organizerScores)
    .values({ projectId: input.projectId, criterionId: input.criterionId, ...row })
    .onConflictDoUpdate({
      target: [organizerScores.projectId, organizerScores.criterionId],
      set: row,
    });
  return { name: project.name, criterion: crit[0].name };
}

// ── Nilai akhir, ranking & tie-breaker (fungsi murni) ───────────────────────

export interface WeightedCriterion {
  id: string;
  weight: number;
  sort: number;
}

/** Σ(nilai × bobot) / Σ bobot atas kriteria yang punya nilai; null kalau belum ada sama sekali. */
export function finalScore(
  values: Record<string, number>,
  crit: { id: string; weight: number }[]
): number | null {
  const scored = crit.filter((c) => values[c.id] !== undefined);
  const wSum = scored.reduce((a, c) => a + c.weight, 0);
  return wSum ? scored.reduce((a, c) => a + values[c.id] * c.weight, 0) / wSum : null;
}

/** Urutan tie-breaker: bobot terbesar dulu; bobot sama → `sort` lebih kecil dulu. */
export function tieBreakOrder<C extends WeightedCriterion>(crit: C[]): C[] {
  return [...crit].sort((a, b) => b.weight - a.weight || a.sort - b.sort);
}

const EPS = 1e-9;
const cmpDesc = (a: number | undefined, b: number | undefined) => {
  const x = a ?? Number.NEGATIVE_INFINITY;
  const y = b ?? Number.NEGATIVE_INFINITY;
  if (Math.abs(x - y) < EPS || x === y) return 0;
  return y > x ? 1 : -1;
};

export interface RankInput {
  id: string;
  name: string;
  score: number | null;
  values: Record<string, number>;
}
export interface RankResult {
  /** Peringkat kompetisi (1,1,3); null = belum ada nilai. */
  rank: number | null;
  /** Seri setelah semua tie-breaker → diputuskan lewat musyawarah juri. */
  tie: boolean;
}

/** Aturan panitia: seri → 2 kriteria berbobot tertinggi (Innovative Solution, lalu
 *  Problem Relevance); masih seri → ditandai tie, diputuskan musyawarah juri. */
export const TIE_BREAK_DEPTH = 2;

/** Ranking + tie-breaker. Baris tanpa nilai di paling bawah (rank null). */
export function rankFinal(rows: RankInput[], crit: WeightedCriterion[]): Map<string, RankResult> {
  const order = tieBreakOrder(crit).slice(0, TIE_BREAK_DEPTH);
  const cmp = (a: RankInput, b: RankInput) => {
    const s = cmpDesc(a.score ?? undefined, b.score ?? undefined);
    if (s !== 0) return s;
    for (const c of order) {
      const v = cmpDesc(a.values[c.id], b.values[c.id]);
      if (v !== 0) return v;
    }
    return 0;
  };
  const scored = rows.filter((r) => r.score !== null);
  const sorted = [...scored].sort((a, b) => cmp(a, b) || a.name.localeCompare(b.name));
  const out = new Map<string, RankResult>();
  sorted.forEach((r, i) => {
    const prev = sorted[i - 1];
    if (prev && cmp(prev, r) === 0) {
      const p = out.get(prev.id) as RankResult;
      p.tie = true;
      out.set(r.id, { rank: p.rank, tie: true });
    } else {
      out.set(r.id, { rank: i + 1, tie: false });
    }
  });
  for (const r of rows) if (r.score === null) out.set(r.id, { rank: null, tie: false });
  return out;
}

// ── Rekap (backoffice, admin) ───────────────────────────────────────────────

export interface FinalCriterion {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  sort: number;
  filledBy: CriterionFiller;
}

export interface FinalNote {
  judgeAddress: string;
  judgeName: string | null;
  teamNote: string | null;
  internalNote: string | null;
  updatedAt: string;
}

export interface FinalRow extends Presented {
  id: string;
  name: string;
  teamName: string | null;
  trackIds: string[];
  /** Nilai per kriteria (1..5): rata-rata juri atau nilai panitia. Tak ada key = belum ada. */
  values: Record<string, number>;
  /** Jumlah juri yang menilai tiap kriteria juri. */
  judgeCounts: Record<string, number>;
  score: number | null;
  /** Semua kriteria sudah bernilai DAN semua juri yang berhak sudah menilai lengkap. */
  complete: boolean;
  /** Juri yang sudah menilai lengkap (semua kriteria juri saat ini). */
  judgesIn: number;
  /** Juri (role judge) yang assignment track-nya mencakup project ini. */
  judgesEligible: number;
  pendingJudges: { address: string; name: string | null }[];
  notes: FinalNote[];
  /** Peringkat per konteks: "all" = semua finalis, atau per trackId. */
  ranks: Record<string, RankResult>;
}

export const ALL_TRACKS = "all";

/** Seluruh data rekap penjurian final untuk satu hackathon (±10 finalis), baris urut
 *  presentasi (UI rekap mengurutkan ulang per peringkat). */
export async function finalJudgingBoard(
  db: Db,
  hackathonId: string
): Promise<{
  criteria: FinalCriterion[];
  judges: { address: string; name: string | null; trackIds: string[] }[];
  rows: FinalRow[];
}> {
  const crit = (await criteriaOf(db, hackathonId)).map((c) => ({
    ...c,
    filledBy: c.filledBy as CriterionFiller,
  }));
  const [finalistRows, judgeUsers, assignments, saved] = await Promise.all([
    db
      .select({ id: projects.id, name: projects.name, teamName: teams.name })
      .from(projects)
      .leftJoin(teams, eq(teams.id, projects.teamId))
      .where(finalistWhere(hackathonId)),
    db
      .select({ address: users.address, username: users.username })
      .from(users)
      .where(eq(users.role, "judge")),
    db
      .select({ judgeAddress: judgeTracks.judgeAddress, trackId: judgeTracks.trackId })
      .from(judgeTracks)
      .where(eq(judgeTracks.hackathonId, hackathonId)),
    getPresentationOrder(db, hackathonId),
  ]);
  const projs = sortByPresentation(finalistRows, saved);
  const judges = judgeUsers.map((u) => ({
    address: u.address,
    name: u.username,
    trackIds: assignments.filter((a) => a.judgeAddress === u.address).map((a) => a.trackId),
  }));
  if (projs.length === 0) return { criteria: crit, judges, rows: [] };

  const ids = projs.map((p) => p.id);
  const [trackRows, scoreRows, orgRows, noteRows] = await Promise.all([
    db
      .select({ projectId: projectTracks.projectId, trackId: projectTracks.trackId })
      .from(projectTracks)
      .where(inArray(projectTracks.projectId, ids)),
    db
      .select({
        projectId: scores.projectId,
        judgeAddress: scores.judgeAddress,
        criterionId: scores.criterionId,
        score: scores.score,
      })
      .from(scores)
      .where(inArray(scores.projectId, ids)),
    db.select().from(organizerScores).where(inArray(organizerScores.projectId, ids)),
    db.select().from(judgeNotes).where(inArray(judgeNotes.projectId, ids)),
  ]);

  // Nama penulis catatan yang (mungkin) sudah bukan juri lagi.
  const nameOf = new Map(judges.map((j) => [j.address, j.name]));
  const unknown = [...new Set(noteRows.map((n) => n.judgeAddress))].filter((a) => !nameOf.has(a));
  if (unknown.length) {
    const extra = await db
      .select({ address: users.address, username: users.username })
      .from(users)
      .where(inArray(users.address, unknown));
    for (const u of extra) nameOf.set(u.address, u.username);
  }

  const judgeCrit = crit.filter((c) => c.filledBy === "judge");
  const orgCrit = crit.filter((c) => c.filledBy === "organizer");

  const rows: FinalRow[] = projs.map((p) => {
    const trackIds = trackRows.filter((t) => t.projectId === p.id).map((t) => t.trackId);
    const eligible = judges.filter((j) => judgeCovers(j.trackIds, trackIds));
    const eligibleSet = new Set(eligible.map((j) => j.address));
    // Hanya nilai dari juri yang SAAT INI berhak menilai project ini (role judge + track
    // cocok) dan dalam skala final 1..5. Nilai lama (form 1..10, admin, juri yang dipindah
    // track/diturunkan role) diabaikan supaya skor & "x/N" tidak menyesatkan.
    const ps = scoreRows.filter(
      (s) =>
        s.projectId === p.id &&
        eligibleSet.has(s.judgeAddress) &&
        s.score >= FINAL_SCORE_MIN &&
        s.score <= FINAL_SCORE_MAX
    );
    const values: Record<string, number> = {};
    const judgeCounts: Record<string, number> = {};
    for (const c of judgeCrit) {
      const vals = ps.filter((s) => s.criterionId === c.id).map((s) => s.score);
      judgeCounts[c.id] = vals.length;
      if (vals.length) values[c.id] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    for (const c of orgCrit) {
      const o = orgRows.find((r) => r.projectId === p.id && r.criterionId === c.id);
      if (o) values[c.id] = o.score;
    }
    // Juri "masuk" = sudah menilai SEMUA kriteria juri saat ini.
    const byJudge = new Map<string, Set<string>>();
    for (const s of ps) {
      const set = byJudge.get(s.judgeAddress) ?? new Set<string>();
      set.add(s.criterionId);
      byJudge.set(s.judgeAddress, set);
    }
    const done = new Set(
      [...byJudge.entries()]
        .filter(([, set]) => judgeCrit.length > 0 && judgeCrit.every((c) => set.has(c.id)))
        .map(([a]) => a)
    );
    return {
      id: p.id,
      name: p.name,
      teamName: p.teamName,
      position: p.position,
      positionSaved: p.positionSaved,
      trackIds,
      values,
      judgeCounts,
      score: finalScore(values, crit),
      // Lengkap = semua kriteria bernilai DAN semua juri yang berhak sudah masuk.
      complete:
        crit.length > 0 &&
        crit.every((c) => values[c.id] !== undefined) &&
        eligible.length > 0 &&
        done.size >= eligible.length,
      judgesIn: done.size,
      judgesEligible: eligible.length,
      pendingJudges: eligible
        .filter((j) => !done.has(j.address))
        .map((j) => ({ address: j.address, name: j.name })),
      notes: noteRows
        .filter((n) => n.projectId === p.id && (n.teamNote || n.internalNote))
        .map((n) => ({
          judgeAddress: n.judgeAddress,
          judgeName: nameOf.get(n.judgeAddress) ?? null,
          teamNote: n.teamNote,
          internalNote: n.internalNote,
          updatedAt: n.updatedAt,
        })),
      ranks: {},
    };
  });

  // Peringkat keseluruhan + per track (hadiah per track; project bisa multi-track).
  const contexts = [ALL_TRACKS, ...new Set(rows.flatMap((r) => r.trackIds))];
  for (const ctx of contexts) {
    const subset = ctx === ALL_TRACKS ? rows : rows.filter((r) => r.trackIds.includes(ctx));
    const ranked = rankFinal(subset, crit);
    for (const r of subset) r.ranks[ctx] = ranked.get(r.id) as RankResult;
  }
  return { criteria: crit, judges, rows };
}
