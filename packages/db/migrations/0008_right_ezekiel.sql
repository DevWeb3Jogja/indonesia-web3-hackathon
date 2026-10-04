CREATE TABLE `presentation_order` (
	`project_id` text PRIMARY KEY NOT NULL,
	`hackathon_id` text NOT NULL,
	`position` integer NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hackathon_id`) REFERENCES `hackathons`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "presentation_position" CHECK("presentation_order"."position" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_presentation_position` ON `presentation_order` (`hackathon_id`,`position`);