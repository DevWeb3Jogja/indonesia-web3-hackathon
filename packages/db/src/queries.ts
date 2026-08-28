import { desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "./client";
import { auditLogs, projects, registrations, scores, users } from "./schema";

export type Role = "participant" | "judge" | "admin";

export async function getUser(db: Db, address: string) {
  const rows = await db.select().from(users).where(eq(users.address, address)).limit(1);
  return rows[0] ?? null;
}

/** Dipanggil saat SIWE verify: pastikan user ada tanpa menyentuh profil yang sudah diisi. */
export async function ensureUser(db: Db, address: string) {
  await db.insert(users).values({ address }).onConflictDoNothing();
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

export async function adminStats(db: Db) {
  const [u, r, p, s] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(users),
    db.select({ n: sql<number>`count(*)` }).from(registrations),
    db.select({ n: sql<number>`count(*)` }).from(projects),
    db.select({ n: sql<number>`count(*)` }).from(scores),
  ]);
  return { users: u[0].n, registrations: r[0].n, projects: p[0].n, scores: s[0].n };
}
