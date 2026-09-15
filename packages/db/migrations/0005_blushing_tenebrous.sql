CREATE TABLE `votes` (
	`hackathon_id` text NOT NULL,
	`voter_address` text NOT NULL,
	`project_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`hackathon_id`, `voter_address`),
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`voter_address`) REFERENCES `users`(`address`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `hackathons` ADD `voting_open` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `hackathons` ADD `leaderboard_public` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `demo_day` integer DEFAULT false NOT NULL;