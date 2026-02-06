CREATE TABLE `hotels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`location_id` integer NOT NULL,
	`district_id` integer NOT NULL,
	`address` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_hotels_location_id` ON `hotels` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_hotels_district_id` ON `hotels` (`district_id`);