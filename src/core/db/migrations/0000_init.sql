CREATE TABLE `care_events` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`start_local` text NOT NULL,
	`has_explicit_time` integer NOT NULL,
	`timezone_id` text NOT NULL,
	`recurrence_json` text NOT NULL,
	`alert_lead_min` integer,
	`notes` text,
	`cancelled` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `care_events_pet_idx` ON `care_events` (`pet_id`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`label` text NOT NULL,
	`kind` text NOT NULL,
	`mime_type` text NOT NULL,
	`local_path` text NOT NULL,
	`bytes` integer NOT NULL,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `documents_pet_idx` ON `documents` (`pet_id`);--> statement-breakpoint
CREATE TABLE `notification_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`occurrence_key` text NOT NULL,
	`planned_at_utc` integer NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `care_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_jobs_event_idx` ON `notification_jobs` (`event_id`);--> statement-breakpoint
CREATE TABLE `occurrence_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`occurrence_key` text NOT NULL,
	`state` text NOT NULL,
	`completed_at` integer,
	`revised_at` text,
	FOREIGN KEY (`event_id`) REFERENCES `care_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `occurrence_overrides_event_key_uq` ON `occurrence_overrides` (`event_id`,`occurrence_key`);--> statement-breakpoint
CREATE TABLE `pets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`breed` text,
	`birth_date` text,
	`age_label` text,
	`sex` text,
	`photo_path` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vaccinations` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`vaccine_name` text NOT NULL,
	`administered_on` text NOT NULL,
	`vet_name` text,
	`next_due_on` text,
	`notes` text,
	`certificate_document_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`certificate_document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `vaccinations_pet_idx` ON `vaccinations` (`pet_id`);