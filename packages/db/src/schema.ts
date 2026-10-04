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
  // Data peserta (wajib utk profil lengkap): nama lengkap, no HP, kota/kabupaten,
  // tipe (community|company|student) + nama institusi (universitas/perusahaan/komunitas).
  fullName: text("full_name"),
  phone: text("phone"),
  city: text("city"),
  occupation: text("occupation"), // community | company | student
  organization: text("organization"),
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
  // Vote demo day (offline): buka/tutup voting + kapan leaderboard boleh publik.
  votingOpen: integer("voting_open", { mode: "boolean" }).notNull().default(false),
  leaderboardPublic: integer("leaderboard_public", { mode: "boolean" }).notNull().default(false),
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
    // Finalis demo day (dipilih admin) → kandidat vote publik.
    demoDay: integer("demo_day", { mode: "boolean" }).notNull().default(false),
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

/** filledBy: judge (dinilai juri di /judge) | organizer (diisi panitia di rekap backoffice,
 *  mis. Participation). Nilai organizer TIDAK masuk `scores` → tak pernah dihitung sebagai juri. */
export const criteria = sqliteTable(
  "criteria",
  {
    id: text("id").primaryKey(),
    hackathonId: text("hackathon_id")
      .notNull()
      .references(() => hackathons.id),
    name: text("name").notNull(),
    description: text("description"),
    weight: integer("weight").notNull().default(1),
    sort: integer("sort").notNull().default(0),
    filledBy: text("filled_by").notNull().default("judge"),
  },
  (t) => [check("criteria_filled_by", sql`${t.filledBy} IN ('judge','organizer')`)]
);

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

/** Vote demo day (offline): SATU vote per wallet per edisi (PK backstop anti-dobel).
 *  voterAddress = dari session (bukan input), projectId wajib finalis demo day. */
export const votes = sqliteTable(
  "votes",
  {
    hackathonId: text("hackathon_id")
      .notNull()
      .references(() => hackathons.id),
    voterAddress: text("voter_address")
      .notNull()
      .references(() => users.address),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [primaryKey({ columns: [t.hackathonId, t.voterAddress] })]
);

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

// ── Kurasi (backoffice, panitia + admin) ─────────────────────────────────────
// Semua tabel kurasi INTERNAL: hanya dibaca route backoffice. Jangan pernah join
// ke query publik/peserta — hasil kurasi & finalis rahasia sampai demo day.

/** organization: binance-academy | coinvestasi | devweb3jogja. Dipilih sekali oleh
 *  penilai (wallet), disalin ke tiap penilaian sebagai jejak. */
export const curationReviewers = sqliteTable(
  "curation_reviewers",
  {
    hackathonId: text("hackathon_id")
      .notNull()
      .references(() => hackathons.id),
    address: text("address")
      .notNull()
      .references(() => users.address),
    organization: text("organization").notNull(),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [
    primaryKey({ columns: [t.hackathonId, t.address] }),
    check(
      "curation_reviewer_org",
      sql`${t.organization} IN ('binance-academy','coinvestasi','devweb3jogja')`
    ),
  ]
);

/** Tahap 1 — saring lolos/gugur. SATU keputusan per project (penilai terakhir menang;
 *  riwayat lengkap ada di audit_logs). decision: pass | fail. */
export const curationScreens = sqliteTable(
  "curation_screens",
  {
    projectId: text("project_id")
      .primaryKey()
      .references(() => projects.id),
    decision: text("decision").notNull(),
    reason: text("reason"),
    note: text("note"),
    reviewerAddress: text("reviewer_address")
      .notNull()
      .references(() => users.address),
    organization: text("organization").notNull(),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [check("curation_screen_decision", sql`${t.decision} IN ('pass','fail')`)]
);

/** Tahap 2 — satu penilaian per (project, penilai): catatan + organisasi saat menilai.
 *  Nilai per kriteria di curation_scores. */
export const curationReviews = sqliteTable(
  "curation_reviews",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    reviewerAddress: text("reviewer_address")
      .notNull()
      .references(() => users.address),
    organization: text("organization").notNull(),
    note: text("note"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.reviewerAddress] })]
);

/** Nilai kurasi 1..5 per kriteria. Terpisah dari `scores` (juri final) supaya dua
 *  babak tak tercampur di ranking. */
export const curationScores = sqliteTable(
  "curation_scores",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    reviewerAddress: text("reviewer_address")
      .notNull()
      .references(() => users.address),
    criterionId: text("criterion_id")
      .notNull()
      .references(() => criteria.id),
    score: integer("score").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.reviewerAddress, t.criterionId] }),
    check("curation_score_range", sql`${t.score} BETWEEN 1 AND 5`),
  ]
);

/** Shortlist hasil kurasi (admin). slot: main (maks 10) | reserve (maks 5);
 *  contactStatus: pending | contacted | confirmed | declined. Yang declined tak
 *  dihitung ke kuota. TERPISAH dari projects.demoDay — demoDay baru dinyalakan
 *  saat demo day supaya tak ada yang bocor. */
export const finalists = sqliteTable(
  "finalists",
  {
    projectId: text("project_id")
      .primaryKey()
      .references(() => projects.id),
    hackathonId: text("hackathon_id")
      .notNull()
      .references(() => hackathons.id),
    slot: text("slot").notNull(),
    contactStatus: text("contact_status").notNull().default("pending"),
    note: text("note"),
    updatedBy: text("updated_by").notNull(),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [
    check("finalist_slot", sql`${t.slot} IN ('main','reserve')`),
    check(
      "finalist_contact_status",
      sql`${t.contactStatus} IN ('pending','contacted','confirmed','declined')`
    ),
  ]
);

// ── Penjurian final (demo day) ───────────────────────────────────────────────
// Rahasia sampai pengumuman: hanya route backoffice (admin) yang membaca rekap;
// juri hanya membaca nilai/catatan miliknya sendiri lewat /api/judge/*.

/** Nilai kriteria `filled_by = organizer` (mis. Participation), 1..5, satu per
 *  (project, kriteria). Terpisah dari `scores` supaya tak dihitung sebagai juri. */
export const organizerScores = sqliteTable(
  "organizer_scores",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    criterionId: text("criterion_id")
      .notNull()
      .references(() => criteria.id),
    score: integer("score").notNull(),
    updatedBy: text("updated_by").notNull(),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.criterionId] }),
    check("organizer_score_range", sql`${t.score} BETWEEN 1 AND 5`),
  ]
);

/** Catatan juri per project (satu baris per juri), menggantikan `scores.comment` yang
 *  dulu diduplikasi di tiap baris skor. teamNote = untuk tim; internalNote = untuk panitia. */
export const judgeNotes = sqliteTable(
  "judge_notes",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    judgeAddress: text("judge_address")
      .notNull()
      .references(() => users.address),
    teamNote: text("team_note"),
    internalNote: text("internal_note"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.judgeAddress] })]
);

/** Urutan presentasi finalis di demo day (diatur admin; form juri & rekap mengikutinya).
 *  Tabel terpisah, BUKAN kolom di `projects`: baris project sampai ke peserta, dan urutan
 *  ini membocorkan siapa finalisnya. Diganti utuh tiap simpan (setPresentationOrder). */
export const presentationOrder = sqliteTable(
  "presentation_order",
  {
    projectId: text("project_id")
      .primaryKey()
      .references(() => projects.id),
    hackathonId: text("hackathon_id")
      .notNull()
      .references(() => hackathons.id),
    position: integer("position").notNull(),
    updatedBy: text("updated_by").notNull(),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (t) => [
    check("presentation_position", sql`${t.position} >= 1`),
    uniqueIndex("uq_presentation_position").on(t.hackathonId, t.position),
  ]
);
