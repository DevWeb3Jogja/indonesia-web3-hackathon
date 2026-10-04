CREATE TABLE `judge_notes` (
	`project_id` text NOT NULL,
	`judge_address` text NOT NULL,
	`team_note` text,
	`internal_note` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`project_id`, `judge_address`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`judge_address`) REFERENCES `users`(`address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organizer_scores` (
	`project_id` text NOT NULL,
	`criterion_id` text NOT NULL,
	`score` integer NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`project_id`, `criterion_id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`criterion_id`) REFERENCES `criteria`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "organizer_score_range" CHECK("organizer_scores"."score" BETWEEN 1 AND 5)
);
--> statement-breakpoint
-- Ditulis tangan (bukan hasil drizzle-kit): drizzle membangun ulang tabel `criteria` untuk
-- menambah CHECK — tidak additive & salinannya rusak (SELECT kolom yang belum ada). SQLite
-- mendukung CHECK langsung di ADD COLUMN; snapshot 0007 tetap mencatat "criteria_filled_by".
ALTER TABLE `criteria` ADD `filled_by` text DEFAULT 'judge' NOT NULL CONSTRAINT "criteria_filled_by" CHECK("filled_by" IN ('judge','organizer'));