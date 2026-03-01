ALTER TABLE `downloads` ADD `artwork_path` text;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_downloads` (
	`source_id` text NOT NULL,
	`id` text PRIMARY KEY,
	`hash` text,
	`filename` text NOT NULL,
	`artwork_path` text,
	`mimetype` text NOT NULL,
	`file_size` integer,
	`progress` integer,
	`is_failed` integer NOT NULL,
	`is_complete` integer NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `downloads_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_downloads`(`source_id`, `id`, `hash`, `filename`, `mimetype`, `file_size`, `progress`, `is_failed`, `is_complete`, `metadata`, `created_at`, `updated_at`) SELECT `source_id`, `id`, `hash`, `filename`, `mimetype`, `file_size`, `progress`, `is_failed`, `is_complete`, `metadata`, `created_at`, `updated_at` FROM `downloads`;--> statement-breakpoint
DROP TABLE `downloads`;--> statement-breakpoint
ALTER TABLE `__new_downloads` RENAME TO `downloads`;--> statement-breakpoint
PRAGMA foreign_keys=ON;