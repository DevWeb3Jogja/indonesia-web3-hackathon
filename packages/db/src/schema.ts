import { sql } from "drizzle-orm";
import {
  check,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = sql`(datetime('now'))`;

/** role: participant | judge | admin */
export const users = sqliteTable("users", {
  address: text("address").primaryKey(),
  username: text("username"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  role: text("role").notNull().default("participant"),
  githubUrl: text("github_url"),
  // Identitas GitHub terverifikasi via OAuth. githubId (numeric id GitHub, immutable)
  // unik lintas wallet → satu akun GitHub cuma bisa dipakai satu wallet.
  githubId: text("github_id").unique(),
  githubLogin: text("github_login"),
  twitterUrl: text("twitter_url"),
  createdAt: text("created_at").notNull().default(now),
  updatedAt: text("updated_at").notNull().default(now),
});

/** status: draft | registration | submission | judging | completed */
export const hackathons = sqliteTable("hackathons", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  status: text("status").notNull().default("draft"),
  registrationOpensAt: text("registration_opens_at"),
  registrationClosesAt: text("registration_closes_at"),
  submissionOpensAt: text("submission_opens_at"),
  submissionClosesAt: text("submission_closes_at"),
  judgingClosesAt: text("judging_closes_at"),
  winnersAnnouncedAt: text("winners_announced_at"),
  createdAt: text("created_at").notNull().default(now),
});

export const tracks = sqliteTable("tracks", {
  id: text("id").primaryKey(),
  hackathonId: text("hackathon_id")
    .notNull()
    .references(() => hackathons.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  sort: integer("sort").notNull().default(0),
});

/** status: registered | checked_in */
export const registrations = sqliteTable(
  "registrations",
  {
    hackathonId: text("hackathon_id")
      .notNull()
      .references(() => hackathons.id),
    address: text("address")
      .notNull()
      .references(() => users.address),
    status: text("status").notNull().default("registered"),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [primaryKey({ columns: [t.hackathonId, t.address] })]
);

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  hackathonId: text("hackathon_id")
    .notNull()
    .references(() => hackathons.id),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  leaderAddress: text("leader_address")
    .notNull()
    .references(() => users.address),
  createdAt: text("created_at").notNull().default(now),
});

/** role: leader | member */
export const teamMembers = sqliteTable(
  "team_members",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    address: text("address")
      .notNull()
      .references(() => users.address),
    role: text("role").notNull().default("member"),
    joinedAt: text("joined_at").notNull().default(now),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.address] })]
);

/** status: draft | submitted | disqualified */
export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    hackathonId: text("hackathon_id")
      .notNull()
      .references(() => hackathons.id),
    // NULL = submission solo. Kalau diisi, project milik tim.
    teamId: text("team_id").references(() => teams.id),
    // Selalu diisi: siapa yang membuat/memiliki project (untuk solo = editor-nya).
    submitterAddress: text("submitter_address")
      .notNull()
      .references(() => users.address),
    name: text("name").notNull(),
    tagline: text("tagline"),
    problemStatement: text("problem_statement"),
    solution: text("solution"),
    description: text("description"),
    githubUrl: text("github_url"),
    demoUrl: text("demo_url"),
    demoVideoUrl: text("demo_video_url"),
    logoUrl: text("logo_url"),
    contractAddress: text("contract_address"),
    network: text("network"),
    extraLinks: text("extra_links"),
    status: text("status").notNull().default("draft"),
    submittedAt: text("submitted_at"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [
    // Backstop TOCTOU (cek-lalu-insert di createProject bisa balapan):
    // satu project per tim, dan satu project solo per (hackathon, submitter).
    uniqueIndex("uq_project_team").on(t.teamId).where(sql`${t.teamId} is not null`),
    uniqueIndex("uq_project_solo")
      .on(t.hackathonId, t.submitterAddress)
      .where(sql`${t.teamId} is null`),
  ]
);

export const projectTracks = sqliteTable(
  "project_tracks",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.trackId] })]
);

export const prizes = sqliteTable("prizes", {
  id: text("id").primaryKey(),
  hackathonId: text("hackathon_id")
    .notNull()
    .references(() => hackathons.id),
  trackId: text("track_id").references(() => tracks.id),
  name: text("name").notNull(),
  amountUsd: integer("amount_usd"),
  sponsor: text("sponsor"),
  sort: integer("sort").notNull().default(0),
});

export const criteria = sqliteTable("criteria", {
  id: text("id").primaryKey(),
  hackathonId: text("hackathon_id")
    .notNull()
    .references(() => hackathons.id),
  name: text("name").notNull(),
  description: text("description"),
  weight: integer("weight").notNull().default(1),
  sort: integer("sort").notNull().default(0),
});

export const judgeTracks = sqliteTable(
  "judge_tracks",
  {
    hackathonId: text("hackathon_id")
      .notNull()
      .references(() => hackathons.id),
    judgeAddress: text("judge_address")
      .notNull()
      .references(() => users.address),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id),
  },
  (t) => [primaryKey({ columns: [t.hackathonId, t.judgeAddress, t.trackId] })]
);

export const scores = sqliteTable(
  "scores",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    judgeAddress: text("judge_address")
      .notNull()
      .references(() => users.address),
    criterionId: text("criterion_id")
      .notNull()
      .references(() => criteria.id),
    score: integer("score").notNull(),
    comment: text("comment"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [
    check("score_range", sql`${t.score} BETWEEN 1 AND 10`),
    uniqueIndex("scores_project_judge_criterion").on(t.projectId, t.judgeAddress, t.criterionId),
  ]
);

/** Satu pemenang per prize: PK = prize_id. */
export const winners = sqliteTable("winners", {
  prizeId: text("prize_id")
    .primaryKey()
    .references(() => prizes.id),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  announcedAt: text("announced_at").notNull().default(now),
});

/** Jejak semua aksi admin/juri yang mengubah keadaan (disqualify, role, pemenang). */
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorAddress: text("actor_address").notNull(),
  action: text("action").notNull(),
  target: text("target"),
  detail: text("detail"),
  createdAt: text("created_at").notNull().default(now),
});

/** Fixed-window rate limit; key = "<route>:<address|ip>". */
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull().default(0),
});
