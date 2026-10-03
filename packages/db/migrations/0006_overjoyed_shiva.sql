CREATE TABLE `curation_reviewers` (
	`hackathon_id` text NOT NULL,
	`address` text NOT NULL,
	`organization` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`hackathon_id`, `address`),
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`address`) REFERENCES `users`(`address`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "curation_reviewer_org" CHECK("curation_reviewers"."organization" IN ('binance-academy','coinvestasi','devweb3jogja'))
);
--> statement-breakpoint
CREATE TABLE `curation_reviews` (
	`project_id` text NOT NULL,
	`reviewer_address` text NOT NULL,
	`organization` text NOT NULL,
	`note` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`project_id`, `reviewer_address`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_address`) REFERENCES `users`(`address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `curation_scores` (
	`project_id` text NOT NULL,
	`reviewer_address` text NOT NULL,
	`criterion_id` text NOT NULL,
	`score` integer NOT NULL,
	PRIMARY KEY(`project_id`, `reviewer_address`, `criterion_id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_address`) REFERENCES `users`(`address`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`criterion_id`) REFERENCES `criteria`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "curation_score_range" CHECK("curation_scores"."score" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE `curation_screens` (
	`project_id` text PRIMARY KEY NOT NULL,
	`decision` text NOT NULL,
	`reason` text,
	`note` text,
	`reviewer_address` text NOT NULL,
	`organization` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_address`) REFERENCES `users`(`address`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "curation_screen_decision" CHECK("curation_screens"."decision" IN ('pass','fail'))
);
--> statement-breakpoint
CREATE TABLE `finalists` (
	`project_id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`slot` text NOT NULL,
	`contact_status` text DEFAULT 'pending' NOT NULL,
	`note` text,
	`updated_by` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "finalist_slot" CHECK("finalists"."slot" IN ('main','reserve')),
	CONSTRAINT "finalist_contact_status" CHECK("finalists"."contact_status" IN ('pending','contacted','confirmed','declined'))
);
