-- Add missing fields to companies table
ALTER TABLE `companies` ADD COLUMN `bank_name` text;
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `account_number` text;
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `account_name` text;
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `swift_code` text;
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `preparation_time` integer DEFAULT 30;
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `delivery_fee_after_hours` real DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `weekly_schedule` text;
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `holidays` text;
