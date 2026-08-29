import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { Db } from "./client";
import {
  buildPage,
  decodeCursor,
  normLimit,
  normPage,
  type Paged,
  type PageParams,
} from "./paginate";
import type { HackathonPhase } from "./phase";
import { auditLogs, hackathons, projects, registrations, scores, users } from "./schema";

export type Role = "participant" | "judge" | "admin";

export async function getUser(db: Db, address: string) {
  const rows = await db.select().from(users).where(eq(users.address, address)).limit(1);
  return rows[0] ?? null;
}

/** Dipanggil saat SIWE verify: pastikan user ada tanpa menyentuh profil yang sudah diisi. */
export async function ensureUser(db: Db, address: string) {
  await db.insert(users).values({ address }).onConflictDoNothing();
}

/** Username sudah dipakai wallet LAIN (case-insensitive)? Untuk cek ketersediaan. */
export async function isUsernameTaken(
  db: Db,
  username: string,
  exceptAddress: string
): Promise<boolean> {
  const rows = await db
    .select({ a: users.address })
    .from(users)
    .where(
      and(
        sql`lower(${users.username}) = ${username.trim().toLowerCase()}`,
        sql`${users.address} != ${exceptAddress}`
      )
    )
    .limit(1);
  return rows.length > 0;
}

/** Profil dianggap lengkap kalau username & email terisi — syarat submit project. */
export function isProfileComplete(
  user: { username: string | null; email: string | null } | null
): boolean {
  return Boolean(user?.username && user?.email);
}

export interface ProfileInput {
  username?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  githubUrl?: string | null;
  twitterUrl?: string | null;
}

export async function updateProfile(db: Db, address: string, input: ProfileInput) {
  await db
    .update(users)
    .set({ ...input, updatedAt: sql`(datetime('now'))` })
    .where(eq(users.address, address));
  return getUser(db, address);
}

export async function audit(
  db: Db,
  entry: { actor: string; action: string; target?: string; detail?: unknown }
) {
  await db.insert(auditLogs).values({
    actorAddress: entry.actor,
    action: entry.action,
    target: entry.target,
    detail: entry.detail === undefined ? null : JSON.stringify(entry.detail),
  });
}

export async function recentAuditLogs(db: Db, limit = 50) {
  return db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(limit);
}

export async function listUsers(db: Db, limit = 100) {
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
}

export type UserSort = "newest" | "oldest";
export const USER_SORTS: UserSort[] = ["newest", "oldest"];
export interface UserListOpts extends PageParams {
  role?: Role;
  sort?: UserSort;
}

/** Users dengan meta: page+cursor, search (address/username/email), filter role, sort. */
export async function listUsersPaged(
  db: Db,
  opts: UserListOpts = {}
): Promise<Paged<typeof users.$inferSelect>> {
  const page = normPage(opts.page);
  const limit = normLimit(opts.limit);
  const ascending = opts.sort === "oldest";

  const conds = [];
  if (opts.role) conds.push(eq(users.role, opts.role));
  const q = opts.q?.trim().toLowerCase();
  if (q) {
    const like = `%${q}%`;
    conds.push(
      or(
        sql`lower(${users.address}) like ${like}`,
        sql`lower(coalesce(${users.username}, '')) like ${like}`,
        sql`lower(coalesce(${users.email}, '')) like ${like}`
      )
    );
  }
  // Keyset (created_at, address) — cursor meniadakan offset.
  const cur = decodeCursor(opts.cursor);
  if (cur) {
    conds.push(
      ascending
        ? sql`(${users.createdAt}, ${users.address}) > (${cur[0]}, ${cur[1]})`
        : sql`(${users.createdAt}, ${users.address}) < (${cur[0]}, ${cur[1]})`
    );
  }
  const where = conds.length ? and(...conds) : undefined;
  const order = ascending
    ? [asc(users.createdAt), asc(users.address)]
    : [desc(users.createdAt), desc(users.address)];

  const [rows, total] = await Promise.all([
    db
      .select()
      .from(users)
      .where(where)
      .orderBy(...order)
      .limit(limit + 1)
      .offset(cur ? 0 : (page - 1) * limit),
    db.$count(users, where),
  ]);
  return buildPage(rows, { page, limit, total }, (u) => [u.createdAt, u.address]);
}

export type AuditSort = "newest" | "oldest";
export interface AuditListOpts extends PageParams {
  action?: string;
  actor?: string;
}

/** Audit log dengan meta: page+cursor (id), search action/target/actor, filter. */
export async function listAuditPaged(
  db: Db,
  opts: AuditListOpts = {}
): Promise<Paged<typeof auditLogs.$inferSelect>> {
  const page = normPage(opts.page);
  const limit = normLimit(opts.limit);

  const conds = [];
  if (opts.action) conds.push(eq(auditLogs.action, opts.action));
  if (opts.actor) conds.push(sql`lower(${auditLogs.actorAddress}) = ${opts.actor.toLowerCase()}`);
  const q = opts.q?.trim().toLowerCase();
  if (q) {
    const like = `%${q}%`;
    conds.push(
      or(
        sql`lower(${auditLogs.action}) like ${like}`,
        sql`lower(coalesce(${auditLogs.target}, '')) like ${like}`,
        sql`lower(${auditLogs.actorAddress}) like ${like}`
      )
    );
  }
  // Keyset id (integer autoincrement) — selalu desc (terbaru dulu).
  const cur = decodeCursor(opts.cursor);
  if (cur) conds.push(sql`${auditLogs.id} < ${cur[0]}`);
  const where = conds.length ? and(...conds) : undefined;

  const [rows, total] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.id))
      .limit(limit + 1)
      .offset(cur ? 0 : (page - 1) * limit),
    db.$count(auditLogs, where),
  ]);
  return buildPage(rows, { page, limit, total }, (a) => [a.id]);
}

/** Profil publik (username/avatar) untuk sekumpulan alamat — dipakai galeri/detail. */
export async function getPublicProfiles(db: Db, addresses: string[]) {
  if (addresses.length === 0) return [];
  return db
    .select({
      address: users.address,
      username: users.username,
      avatarUrl: users.avatarUrl,
      githubUrl: users.githubUrl,
      twitterUrl: users.twitterUrl,
    })
    .from(users)
    .where(inArray(users.address, addresses));
}

export async function setUserRole(db: Db, address: string, role: Role) {
  await db
    .update(users)
    .set({ role, updatedAt: sql`(datetime('now'))` })
    .where(eq(users.address, address));
}

export const HACKATHON_PHASES: HackathonPhase[] = [
  "draft",
  "registration",
  "submission",
  "judging",
  "completed",
];

export async function setHackathonStatus(db: Db, hackathonId: string, status: HackathonPhase) {
  await db.update(hackathons).set({ status }).where(eq(hackathons.id, hackathonId));
}

export async function adminStats(db: Db) {
  const [u, r, p, s] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(users),
    db.select({ n: sql<number>`count(*)` }).from(registrations),
    db.select({ n: sql<number>`count(*)` }).from(projects),
    db.select({ n: sql<number>`count(*)` }).from(scores),
  ]);
  return { users: u[0].n, registrations: r[0].n, projects: p[0].n, scores: s[0].n };
}
