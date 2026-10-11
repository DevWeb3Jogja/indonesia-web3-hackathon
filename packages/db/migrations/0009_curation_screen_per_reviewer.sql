PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_curation_screens` (
	`project_id` text NOT NULL,
	`reviewer_address` text NOT NULL,
	`decision` text NOT NULL,
	`reason` text,
	`note` text,
	`organization` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`project_id`, `reviewer_address`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_address`) REFERENCES `users`(`address`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "curation_screen_decision" CHECK("decision" IN ('pass','fail'))
);
--> statement-breakpoint
INSERT INTO `__new_curation_screens`("project_id", "reviewer_address", "decision", "reason", "note", "organization", "updated_at") SELECT "project_id", "reviewer_address", "decision", "reason", "note", "organization", "updated_at" FROM `curation_screens`;--> statement-breakpoint
DROP TABLE `curation_screens`;--> statement-breakpoint
ALTER TABLE `__new_curation_screens` RENAME TO `curation_screens`;--> statement-breakpoint
PRAGMA foreign_keys=ON;