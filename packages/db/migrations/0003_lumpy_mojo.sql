ALTER TABLE `users` ADD `github_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `github_login` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_id_unique` ON `users` (`github_id`);