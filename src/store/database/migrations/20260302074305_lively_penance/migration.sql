PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sync_cursors` (
	`source_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`parent_entity_id` text,
	`parent_entity_type` text,
	`start_index` integer NOT NULL,
	`page_size` integer NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`failed_at` integer,
	`last_error` text,
	`updated_at` integer NOT NULL,
	CONSTRAINT `sync_cursors_source_id_entity_type_parent_entity_id_pk` PRIMARY KEY(`source_id`, `entity_type`, `parent_entity_id`),
	CONSTRAINT `sync_cursors_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_sync_cursors`(`source_id`, `entity_type`, `parent_entity_id`, `parent_entity_type`, `start_index`, `page_size`, `completed`, `attempts`, `failed_at`, `last_error`, `updated_at`) SELECT `source_id`, `entity_type`, `parent_entity_id`, `parent_entity_type`, `start_index`, `page_size`, `completed`, `attempts`, `failed_at`, `last_error`, `updated_at` FROM `sync_cursors`;--> statement-breakpoint
DROP TABLE `sync_cursors`;--> statement-breakpoint
ALTER TABLE `__new_sync_cursors` RENAME TO `sync_cursors`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `search_queries` DROP COLUMN `timestamp`;