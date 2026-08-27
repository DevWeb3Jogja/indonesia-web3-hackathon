import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "./client";
import { hackathons, registrations, teamMembers, teams } from "./schema";

export const MAX_TEAM_SIZE = 5;

/** Error yang bisa dipetakan ke HTTP status di route (bukan 500). */
export class TeamError extends Error {
  constructor(
    public code:
      | "already_on_team"
      | "not_on_team"
      | "invalid_code"
      | "team_full"
      | "not_leader"
      | "name_taken",
    message: string
  ) {
    super(message);
    this.name = "TeamError";
  }
}

/** Kode undangan: 8 char base32 tanpa karakter ambigu (0/O/1/I). */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function inviteCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function teamId(): string {
  return `team_${randomBytes(9).toString("hex")}`;
}

/** Hackathon aktif = yang belum completed, terbaru. Untuk saat ini hanya satu edisi. */
export async function getCurrentHackathon(db: Db) {
  const rows = await db.select().from(hackathons).limit(1);
  return rows[0] ?? null;
}

export async function ensureRegistration(db: Db, hackathonId: string, address: string) {
  await db.insert(registrations).values({ hackathonId, address }).onConflictDoNothing();
}

export interface TeamWithMembers {
  id: string;
  name: string;
  inviteCode: string;
  leaderAddress: string;
  members: { address: string; role: string; joinedAt: string }[];
}

async function membersOf(db: Db, id: string) {
  return db
    .select({
      address: teamMembers.address,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
    })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, id))
    .orderBy(asc(teamMembers.joinedAt));
}

/** Tim user untuk sebuah hackathon (maks satu), lengkap dengan anggotanya. */
export async function getMyTeam(
  db: Db,
  hackathonId: string,
  address: string
): Promise<TeamWithMembers | null> {
  const rows = await db
    .select({ team: teams })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(eq(teamMembers.address, address), eq(teams.hackathonId, hackathonId)))
    .limit(1);
  const team = rows[0]?.team;
  if (!team) return null;
  return {
    id: team.id,
    name: team.name,
    inviteCode: team.inviteCode,
    leaderAddress: team.leaderAddress,
    members: await membersOf(db, team.id),
  };
}

export async function createTeam(
  db: Db,
  hackathonId: string,
  address: string,
  name: string
): Promise<TeamWithMembers> {
  if (await getMyTeam(db, hackathonId, address)) {
    throw new TeamError("already_on_team", "Kamu sudah tergabung dalam sebuah tim");
  }
  const id = teamId();
  const code = inviteCode();
  // batch = atomik dalam satu koneksi (transaction interaktif tidak jalan di :memory:).
  await db.batch([
    db.insert(registrations).values({ hackathonId, address }).onConflictDoNothing(),
    db.insert(teams).values({ id, hackathonId, name, inviteCode: code, leaderAddress: address }),
    db.insert(teamMembers).values({ teamId: id, address, role: "leader" }),
  ]);
  return (await getMyTeam(db, hackathonId, address)) as TeamWithMembers;
}

export async function joinTeam(
  db: Db,
  hackathonId: string,
  address: string,
  code: string
): Promise<TeamWithMembers> {
  if (await getMyTeam(db, hackathonId, address)) {
    throw new TeamError("already_on_team", "Kamu sudah tergabung dalam sebuah tim");
  }
  const rows = await db
    .select()
    .from(teams)
    .where(and(eq(teams.inviteCode, code.toUpperCase()), eq(teams.hackathonId, hackathonId)))
    .limit(1);
  const team = rows[0];
  if (!team) throw new TeamError("invalid_code", "Kode undangan tidak valid");

  const count = (await membersOf(db, team.id)).length;
  if (count >= MAX_TEAM_SIZE) throw new TeamError("team_full", "Tim sudah penuh");

  await db.batch([
    db.insert(registrations).values({ hackathonId, address }).onConflictDoNothing(),
    db.insert(teamMembers).values({ teamId: team.id, address, role: "member" }),
  ]);
  return (await getMyTeam(db, hackathonId, address)) as TeamWithMembers;
}

/**
 * Keluar dari tim. Kalau leader keluar dan masih ada anggota, anggota terlama
 * dipromosikan jadi leader; kalau leader sendirian, tim dihapus.
 */
export async function leaveTeam(db: Db, hackathonId: string, address: string): Promise<void> {
  const team = await getMyTeam(db, hackathonId, address);
  if (!team) throw new TeamError("not_on_team", "Kamu tidak ada di tim mana pun");

  const isLeader = team.leaderAddress === address;
  const others = team.members.filter((m) => m.address !== address);
  const removeSelf = db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.address, address)));

  if (!isLeader) {
    await db.batch([removeSelf]);
  } else if (others.length === 0) {
    await db.batch([removeSelf, db.delete(teams).where(eq(teams.id, team.id))]);
  } else {
    const next = others[0].address; // terlama (members sudah diurut joinedAt)
    await db.batch([
      removeSelf,
      db.update(teams).set({ leaderAddress: next }).where(eq(teams.id, team.id)),
      db
        .update(teamMembers)
        .set({ role: "leader" })
        .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.address, next))),
    ]);
  }
}
