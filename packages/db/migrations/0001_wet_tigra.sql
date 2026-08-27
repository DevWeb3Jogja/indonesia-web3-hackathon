-- projects: team_id jadi nullable (solo), tambah submitter_address.
-- Tabel projects masih kosong (belum ada flow submission ke Turso), jadi
-- recreate langsung tanpa menyalin data (SQLite tak bisa ubah nullability in-place).
PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`team_id` text,
	`submitter_address` text NOT NULL,
	`name` text NOT NULL,
	`tagline` text,
	`problem_statement` text,
	`solution` text,
	`description` text,
	`github_url` text,
	`demo_url` text,
	`demo_video_url` text,
	`logo_url` text,
	`contract_address` text,
	`network` text,
	`extra_links` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`submitted_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submitter_address`) REFERENCES `users`(`address`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
PRAGMA foreign_keys=ON;
