CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`season_name` text NOT NULL,
	`start_month` integer NOT NULL,
	`start_day` integer NOT NULL,
	`end_month` integer NOT NULL,
	`end_day` integer NOT NULL,
	`price_multiplier` real DEFAULT 1 NOT NULL,
	`discount_label` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_seasons_company_id` ON `seasons` (`company_id`);