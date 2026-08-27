import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "./client";
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
  return Promise.all(rows.map((r) => hydrate(db, r)));
}
