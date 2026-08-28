import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { Db } from "./client";
import {
  buildPage,
  decodeCursor,
  normLimit,
  normPage,
  type Paged,
  type PageParams,
} from "./paginate";
import { projects, projectTracks, teamMembers, teams, tracks } from "./schema";
import { getMyTeam } from "./teams";

export class ProjectError extends Error {
  constructor(
    public code:
      | "already_has_project"
      | "not_team_member"
      | "invalid_track"
      | "no_track"
      | "not_owner"
      | "not_found",
    message: string
  ) {
    super(message);
    this.name = "ProjectError";
  }
}

/** Cek apakah error (atau rantai .cause-nya) adalah pelanggaran UNIQUE constraint SQLite. */
function isUniqueViolation(e: unknown): boolean {
  let cur: unknown = e;
  while (cur instanceof Error) {
    if (/UNIQUE constraint|uq_project_/i.test(cur.message)) return true;
    cur = cur.cause;
  }
  return false;
}

export interface ProjectInput {
  name: string;
  tagline?: string | null;
  problemStatement?: string | null;
  solution?: string | null;
  description?: string | null;
  githubUrl?: string | null;
  demoUrl?: string | null;
  demoVideoUrl?: string | null;
  logoUrl?: string | null;
  contractAddress?: string | null;
  network?: string | null;
  extraLinks?: string | null; // JSON [{label,url}]
}

export interface ProjectFull extends ProjectInput {
  id: string;
  hackathonId: string;
  teamId: string | null;
  submitterAddress: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  trackIds: string[];
  team: { name: string; memberAddresses: string[] } | null;
}

function projectId(): string {
  return `proj_${randomBytes(9).toString("hex")}`;
}

async function trackIdsOf(db: Db, id: string): Promise<string[]> {
  const rows = await db
    .select({ trackId: projectTracks.trackId })
    .from(projectTracks)
    .where(eq(projectTracks.projectId, id));
  return rows.map((r) => r.trackId);
}

async function teamInfo(db: Db, teamId: string | null) {
  if (!teamId) return null;
  const t = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!t[0]) return null;
  const members = await db
    .select({ address: teamMembers.address })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  return { name: t[0].name, memberAddresses: members.map((m) => m.address) };
}

async function hydrate(db: Db, row: typeof projects.$inferSelect): Promise<ProjectFull> {
  return {
    ...row,
    trackIds: await trackIdsOf(db, row.id),
    team: await teamInfo(db, row.teamId),
  };
}

/**
 * Hydrate banyak baris tanpa N+1: 3 query (tracks, teams, members) untuk SELURUH
 * halaman, bukan 2 query per baris. Penting untuk latency & ketahanan galeri
 * publik — tiap round-trip ke Turso menambah waktu dan peluang gagal.
 */
async function hydrateMany(db: Db, rows: (typeof projects.$inferSelect)[]): Promise<ProjectFull[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const teamIds = [...new Set(rows.map((r) => r.teamId).filter((t): t is string => t !== null))];

  const trackRows = await db
    .select({ projectId: projectTracks.projectId, trackId: projectTracks.trackId })
    .from(projectTracks)
    .where(inArray(projectTracks.projectId, ids));
  const tracksByProject = new Map<string, string[]>();
  for (const r of trackRows) {
    const arr = tracksByProject.get(r.projectId);
    if (arr) arr.push(r.trackId);
    else tracksByProject.set(r.projectId, [r.trackId]);
  }

  const teamById = new Map<string, { name: string; memberAddresses: string[] }>();
  if (teamIds.length > 0) {
    const [teamRows, memberRows] = await Promise.all([
      db.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, teamIds)),
      db
        .select({ teamId: teamMembers.teamId, address: teamMembers.address })
        .from(teamMembers)
        .where(inArray(teamMembers.teamId, teamIds)),
    ]);
    const membersByTeam = new Map<string, string[]>();
    for (const m of memberRows) {
      const arr = membersByTeam.get(m.teamId);
      if (arr) arr.push(m.address);
      else membersByTeam.set(m.teamId, [m.address]);
    }
    for (const t of teamRows) {
      teamById.set(t.id, { name: t.name, memberAddresses: membersByTeam.get(t.id) ?? [] });
    }
  }

  return rows.map((r) => ({
    ...r,
    trackIds: tracksByProject.get(r.id) ?? [],
    team: r.teamId ? (teamById.get(r.teamId) ?? null) : null,
  }));
}

export async function getProjectById(db: Db, id: string): Promise<ProjectFull | null> {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ? hydrate(db, rows[0]) : null;
}

/** Project milik user untuk sebuah hackathon: lewat timnya, atau solo. Maks satu. */
export async function getProjectForUser(
  db: Db,
  hackathonId: string,
  address: string
): Promise<ProjectFull | null> {
  const team = await getMyTeam(db, hackathonId, address);
  if (team) {
    const rows = await db.select().from(projects).where(eq(projects.teamId, team.id)).limit(1);
    if (rows[0]) return hydrate(db, rows[0]);
  }
  const solo = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.hackathonId, hackathonId),
        eq(projects.submitterAddress, address),
        isNull(projects.teamId)
      )
    )
    .limit(1);
  return solo[0] ? hydrate(db, solo[0]) : null;
}

async function assertTracks(db: Db, hackathonId: string, trackIds: string[]) {
  if (trackIds.length === 0) throw new ProjectError("no_track", "Pilih minimal satu track");
  const valid = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(and(eq(tracks.hackathonId, hackathonId), inArray(tracks.id, trackIds)));
  if (valid.length !== trackIds.length) {
    throw new ProjectError("invalid_track", "Ada track yang tidak valid");
  }
}

export async function createProject(
  db: Db,
  opts: {
    hackathonId: string;
    submitterAddress: string;
    teamId: string | null;
    input: ProjectInput;
    trackIds: string[];
  }
): Promise<ProjectFull> {
  const { hackathonId, submitterAddress, teamId, input, trackIds } = opts;

  if (await getProjectForUser(db, hackathonId, submitterAddress)) {
    throw new ProjectError("already_has_project", "Kamu/tim sudah punya project di edisi ini");
  }
  if (teamId) {
    const team = await getMyTeam(db, hackathonId, submitterAddress);
    if (!team || team.id !== teamId) {
      throw new ProjectError("not_team_member", "Kamu bukan anggota tim ini");
    }
  }
  await assertTracks(db, hackathonId, trackIds);

  const id = projectId();
  try {
    await db.batch([
      db.insert(projects).values({
        id,
        hackathonId,
        teamId,
        submitterAddress,
        ...input,
        status: "submitted",
        submittedAt: new Date().toISOString(),
      }),
      ...trackIds.map((trackId) => db.insert(projectTracks).values({ projectId: id, trackId })),
    ]);
  } catch (e) {
    // Backstop unique index (uq_project_team/uq_project_solo) menang balapan
    // TOCTOU dari cek di atas → kembalikan error yang sama, bukan 500.
    // drizzle membungkus error libsql, jadi telusuri rantai .cause juga.
    if (isUniqueViolation(e)) {
      throw new ProjectError("already_has_project", "Kamu/tim sudah punya project di edisi ini");
    }
    throw e;
  }
  return (await getProjectById(db, id)) as ProjectFull;
}

/** Solo: hanya submitter. Tim: anggota mana pun (edit kolaboratif). */
export async function canEditProject(
  db: Db,
  project: Pick<ProjectFull, "teamId" | "submitterAddress">,
  address: string
): Promise<boolean> {
  if (!project.teamId) return project.submitterAddress === address;
  const rows = await db
    .select({ address: teamMembers.address })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, project.teamId), eq(teamMembers.address, address)))
    .limit(1);
  return rows.length > 0;
}

export async function updateProject(
  db: Db,
  id: string,
  input: ProjectInput,
  trackIds: string[]
): Promise<ProjectFull> {
  const existing = await getProjectById(db, id);
  if (!existing) throw new ProjectError("not_found", "Project tidak ditemukan");
  await assertTracks(db, existing.hackathonId, trackIds);

  await db.batch([
    db
      .update(projects)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(projects.id, id)),
    db.delete(projectTracks).where(eq(projectTracks.projectId, id)),
    ...trackIds.map((trackId) => db.insert(projectTracks).values({ projectId: id, trackId })),
  ]);
  return (await getProjectById(db, id)) as ProjectFull;
}

/** Daftar project ter-submit untuk galeri publik. */
export async function listSubmittedProjects(db: Db, hackathonId: string): Promise<ProjectFull[]> {
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.hackathonId, hackathonId), eq(projects.status, "submitted")))
    .orderBy(desc(projects.submittedAt));
  return hydrateMany(db, rows);
}

/** Admin: semua project (semua status) untuk review. */
export async function listAllProjects(db: Db, hackathonId: string): Promise<ProjectFull[]> {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.hackathonId, hackathonId))
    .orderBy(desc(projects.submittedAt));
  return hydrateMany(db, rows);
}

/** Admin: ubah status project (mis. disqualify ↔ submitted). */
export async function setProjectStatus(
  db: Db,
  id: string,
  status: "submitted" | "disqualified"
): Promise<void> {
  await db
    .update(projects)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, id));
}

export type ProjectSort = "newest" | "oldest" | "name";
export const PROJECT_SORTS: ProjectSort[] = ["newest", "oldest", "name"];

export interface ProjectListOpts {
  page?: number;
  limit?: number;
  q?: string;
  track?: string;
  sort?: ProjectSort;
}

export interface ProjectListResult {
  items: ProjectFull[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Galeri publik dengan pagination + search + filter track + sort (server-side). */
export async function listProjectsPaged(
  db: Db,
  hackathonId: string,
  opts: ProjectListOpts = {}
): Promise<ProjectListResult> {
  const page = Math.max(1, Math.trunc(opts.page ?? 1));
  const limit = Math.min(48, Math.max(1, Math.trunc(opts.limit ?? 12)));

  const conds = [eq(projects.hackathonId, hackathonId), eq(projects.status, "submitted")];
  const q = opts.q?.trim().toLowerCase();
  if (q) {
    const like = `%${q}%`;
    conds.push(
      or(
        sql`lower(${projects.name}) like ${like}`,
        sql`lower(coalesce(${projects.tagline}, '')) like ${like}`
      ) as ReturnType<typeof eq>
    );
  }
  if (opts.track) {
    conds.push(
      sql`exists (select 1 from project_tracks pt where pt.project_id = ${projects.id} and pt.track_id = ${opts.track})` as ReturnType<
        typeof eq
      >
    );
  }
  const where = and(...conds);
  const orderBy =
    opts.sort === "oldest"
      ? asc(projects.submittedAt)
      : opts.sort === "name"
        ? asc(projects.name)
        : desc(projects.submittedAt);

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ n: sql<number>`count(*)` }).from(projects).where(where),
  ]);

  const total = Number(countRows[0]?.n ?? 0);
  const items = await hydrateMany(db, rows);
  return {
    items,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export type ProjectStatusFilter = "submitted" | "draft" | "disqualified";
export interface AdminProjectListOpts extends PageParams {
  status?: ProjectStatusFilter;
  track?: string;
  sort?: ProjectSort;
}

/**
 * Admin: SEMUA status (bukan cuma submitted) dengan meta page+cursor, search,
 * filter status/track, sort. Keyset di (created_at, id) — created_at selalu ada
 * (submitted_at bisa null untuk draft), jadi urutan stabil.
 */
export async function listAllProjectsPaged(
  db: Db,
  hackathonId: string,
  opts: AdminProjectListOpts = {}
): Promise<Paged<ProjectFull>> {
  const page = normPage(opts.page);
  const limit = normLimit(opts.limit);

  const conds = [eq(projects.hackathonId, hackathonId)];
  if (opts.status) conds.push(eq(projects.status, opts.status));
  const q = opts.q?.trim().toLowerCase();
  if (q) {
    const like = `%${q}%`;
    conds.push(
      or(
        sql`lower(${projects.name}) like ${like}`,
        sql`lower(coalesce(${projects.tagline}, '')) like ${like}`
      ) as ReturnType<typeof eq>
    );
  }
  if (opts.track) {
    conds.push(
      sql`exists (select 1 from project_tracks pt where pt.project_id = ${projects.id} and pt.track_id = ${opts.track})` as ReturnType<
        typeof eq
      >
    );
  }
  // Sort utama tetap by name kalau diminta, selain itu by created_at.
  const byName = opts.sort === "name";
  const ascending = opts.sort === "oldest";
  const cur = decodeCursor(opts.cursor);
  if (cur) {
    const col = byName ? projects.name : projects.createdAt;
    conds.push(
      (ascending || byName
        ? sql`(${col}, ${projects.id}) > (${cur[0]}, ${cur[1]})`
        : sql`(${col}, ${projects.id}) < (${cur[0]}, ${cur[1]})`) as ReturnType<typeof eq>
    );
  }
  const where = and(...conds);
  const order = byName
    ? [asc(projects.name), asc(projects.id)]
    : ascending
      ? [asc(projects.createdAt), asc(projects.id)]
      : [desc(projects.createdAt), desc(projects.id)];

  const [rows, total] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(where)
      .orderBy(...order)
      .limit(limit + 1)
      .offset(cur ? 0 : (page - 1) * limit),
    db.$count(projects, where),
  ]);
  // Hydrate SEMUA (limit+1); buildPage yang memotong ke limit & bikin nextCursor.
  const items = await hydrateMany(db, rows);
  return buildPage(items, { page, limit, total }, (p) => [byName ? p.name : p.createdAt, p.id]);
}
