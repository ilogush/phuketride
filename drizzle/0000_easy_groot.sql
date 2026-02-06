CREATE TABLE `admin_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_settings_key_unique` ON `admin_settings` (`key`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`role` text,
	`company_id` integer,
	`entity_type` text NOT NULL,
	`entity_id` integer,
	`action` text NOT NULL,
	`before_state` text,
	`after_state` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`related_id` integer,
	`color` text DEFAULT '#3B82F6',
	`status` text DEFAULT 'pending',
	`notification_sent` integer DEFAULT false,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `car_brands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`logo_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `car_brands_name_unique` ON `car_brands` (`name`);--> statement-breakpoint
CREATE TABLE `car_models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand_id` integer NOT NULL,
	`name` text NOT NULL,
	`body_type` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `car_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand_id` integer NOT NULL,
	`model_id` integer NOT NULL,
	`production_year` integer,
	`transmission` text,
	`engine_volume` real,
	`body_type` text,
	`seats` integer,
	`doors` integer,
	`fuel_type` text,
	`description` text,
	`photos` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `colors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`hex_code` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `colors_name_unique` ON `colors` (`name`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`telegram` text NOT NULL,
	`location_id` integer NOT NULL,
	`district_id` integer NOT NULL,
	`street` text NOT NULL,
	`house_number` text NOT NULL,
	`address` text,
	`island_trip_price` real,
	`krabi_trip_price` real,
	`baby_seat_price_per_day` real,
	`settings` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `company_cars` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`template_id` integer,
	`color_id` integer,
	`license_plate` text NOT NULL,
	`vin` text,
	`year` integer,
	`transmission` text,
	`engine_volume` real,
	`fuel_type` text,
	`price_per_day` real DEFAULT 0,
	`deposit` real DEFAULT 0,
	`min_insurance_price` real,
	`max_insurance_price` real,
	`full_insurance_min_price` real,
	`full_insurance_max_price` real,
	`mileage` integer DEFAULT 0,
	`next_oil_change_mileage` integer,
	`oil_change_interval` integer DEFAULT 10000,
	`insurance_expiry_date` integer,
	`tax_road_expiry_date` integer,
	`registration_expiry` integer,
	`insurance_type` text,
	`status` text DEFAULT 'available',
	`photos` text,
	`document_photos` text,
	`green_book_photos` text,
	`insurance_photos` text,
	`tax_road_photos` text,
	`description` text,
	`marketing_headline` text,
	`featured_image_index` integer DEFAULT 0,
	`seasonal_prices` text,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_car_id` integer NOT NULL,
	`client_id` text NOT NULL,
	`manager_id` text,
	`booking_id` integer,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`actual_end_date` integer,
	`total_amount` real NOT NULL,
	`total_currency` text DEFAULT 'THB',
	`deposit_amount` real,
	`deposit_currency` text DEFAULT 'THB',
	`deposit_payment_method` text,
	`full_insurance_enabled` integer DEFAULT false,
	`full_insurance_price` real DEFAULT 0,
	`baby_seat_enabled` integer DEFAULT false,
	`baby_seat_price` real DEFAULT 0,
	`island_trip_enabled` integer DEFAULT false,
	`island_trip_price` real DEFAULT 0,
	`krabi_trip_enabled` integer DEFAULT false,
	`krabi_trip_price` real DEFAULT 0,
	`pickup_district_id` integer,
	`pickup_hotel` text,
	`pickup_room` text,
	`delivery_cost` real DEFAULT 0,
	`return_district_id` integer,
	`return_hotel` text,
	`return_room` text,
	`return_cost` real DEFAULT 0,
	`start_mileage` integer,
	`end_mileage` integer,
	`fuel_level` text DEFAULT 'full',
	`cleanliness` text DEFAULT 'clean',
	`status` text DEFAULT 'active',
	`photos` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `countries_code_unique` ON `countries` (`code`);--> statement-breakpoint
CREATE TABLE `districts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`location_id` integer NOT NULL,
	`delivery_price` real DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`country_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `maintenance_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_car_id` integer NOT NULL,
	`maintenance_type` text NOT NULL,
	`mileage` integer,
	`cost` real,
	`notes` text,
	`performed_at` integer NOT NULL,
	`performed_by` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `managers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`company_id` integer NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sign` text,
	`description` text,
	`company_id` integer,
	`is_system` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_types_name_unique` ON `payment_types` (`name`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contract_id` integer NOT NULL,
	`payment_type_id` integer NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'THB',
	`payment_method` text,
	`status` text DEFAULT 'completed',
	`notes` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`name` text,
	`surname` text,
	`phone` text,
	`whatsapp` text,
	`telegram` text,
	`passport_number` text,
	`citizenship` text,
	`city` text,
	`country_id` integer,
	`date_of_birth` integer,
	`gender` text,
	`passport_photos` text,
	`driver_license_photos` text,
	`avatar_url` text,
	`hotel_id` integer,
	`room_number` text,
	`location_id` integer,
	`district_id` integer,
	`address` text,
	`is_first_login` integer DEFAULT true,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);