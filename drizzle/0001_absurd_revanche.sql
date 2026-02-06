CREATE TABLE `rental_durations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`range_name` text NOT NULL,
	`min_days` integer NOT NULL,
	`max_days` integer,
	`price_multiplier` real DEFAULT 1 NOT NULL,
	`discount_label` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rental_durations_company_id` ON `rental_durations` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_companies_owner_id` ON `companies` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_companies_location_id` ON `companies` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_managers_user_id` ON `managers` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_managers_company_id` ON `managers` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);