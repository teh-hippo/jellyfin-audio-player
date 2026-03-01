ALTER TABLE `app_settings` RENAME TO `settings`;--> statement-breakpoint
ALTER TABLE `downloads` RENAME COLUMN "metadata_json" TO "metadata";--> statement-breakpoint
ALTER TABLE `search_queries` RENAME COLUMN "metadata_json" TO "metadata";--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_albums` (
	`source_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`production_year` integer,
	`is_folder` integer NOT NULL,
	`album_artist` text,
	`metadata` text,
	`first_synced_at` integer NOT NULL,
	`last_synced_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_albums`("source_id", "id", "name", "production_year", "is_folder", "album_artist", "metadata", "first_synced_at", "last_synced_at", "created_at", "updated_at") SELECT "source_id", "id", "name", "production_year", "is_folder", "album_artist", "metadata", "first_synced_at", "last_synced_at", "created_at", "updated_at" FROM `albums`;--> statement-breakpoint
DROP TABLE `albums`;--> statement-breakpoint
ALTER TABLE `__new_albums` RENAME TO `albums`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `albums_source_name_idx` ON `albums` (`source_id`,`name`);--> statement-breakpoint
CREATE INDEX `albums_source_year_idx` ON `albums` (`source_id`,`production_year`);--> statement-breakpoint
CREATE TABLE `__new_artists` (
	`source_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_folder` integer NOT NULL,
	`metadata` text,
	`first_synced_at` integer NOT NULL,
	`last_synced_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_artists`("source_id", "id", "name", "is_folder", "metadata", "first_synced_at", "last_synced_at", "created_at", "updated_at") SELECT "source_id", "id", "name", "is_folder", "metadata", "first_synced_at", "last_synced_at", "created_at", "updated_at" FROM `artists`;--> statement-breakpoint
DROP TABLE `artists`;--> statement-breakpoint
ALTER TABLE `__new_artists` RENAME TO `artists`;--> statement-breakpoint
CREATE INDEX `artists_source_name_idx` ON `artists` (`source_id`,`name`);--> statement-breakpoint
CREATE TABLE `__new_playlists` (
	`source_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`can_delete` integer NOT NULL,
	`child_count` integer,
	`metadata` text,
	`first_synced_at` integer NOT NULL,
	`last_synced_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_playlists`("source_id", "id", "name", "can_delete", "child_count", "metadata", "first_synced_at", "last_synced_at", "created_at", "updated_at") SELECT "source_id", "id", "name", "can_delete", "child_count", "metadata", "first_synced_at", "last_synced_at", "created_at", "updated_at" FROM `playlists`;--> statement-breakpoint
DROP TABLE `playlists`;--> statement-breakpoint
ALTER TABLE `__new_playlists` RENAME TO `playlists`;--> statement-breakpoint
CREATE INDEX `playlists_source_name_idx` ON `playlists` (`source_id`,`name`);--> statement-breakpoint
CREATE TABLE `__new_tracks` (
	`source_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`album_id` text,
	`album` text,
	`album_artist` text,
	`production_year` integer,
	`index_number` integer,
	`parent_index_number` integer,
	`run_time_ticks` integer,
	`lyrics` text,
	`metadata` text,
	`first_synced_at` integer NOT NULL,
	`last_synced_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_tracks`("source_id", "id", "name", "album_id", "album", "album_artist", "production_year", "index_number", "parent_index_number", "run_time_ticks", "lyrics", "metadata", "first_synced_at", "last_synced_at", "created_at", "updated_at") SELECT "source_id", "id", "name", "album_id", "album", "album_artist", "production_year", "index_number", "parent_index_number", "run_time_ticks", "lyrics", "metadata", "first_synced_at", "last_synced_at", "created_at", "updated_at" FROM `tracks`;--> statement-breakpoint
DROP TABLE `tracks`;--> statement-breakpoint
ALTER TABLE `__new_tracks` RENAME TO `tracks`;--> statement-breakpoint
CREATE INDEX `tracks_source_album_idx` ON `tracks` (`source_id`,`album_id`);--> statement-breakpoint
CREATE INDEX `tracks_source_name_idx` ON `tracks` (`source_id`,`name`);--> statement-breakpoint
CREATE TABLE `__new_sync_cursors` (
	`source_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`parent_entity_id` text DEFAULT '' NOT NULL,
	`parent_entity_type` text,
	`start_index` integer NOT NULL,
	`page_size` integer NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`failed_at` integer,
	`last_error` text,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`source_id`, `entity_type`, `parent_entity_id`),
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sync_cursors`("source_id", "entity_type", "parent_entity_id", "parent_entity_type", "start_index", "page_size", "completed", "attempts", "failed_at", "last_error", "updated_at") SELECT "source_id", "entity_type", "parent_entity_id", "parent_entity_type", "start_index", "page_size", "completed", "attempts", "failed_at", "last_error", "updated_at" FROM `sync_cursors`;--> statement-breakpoint
DROP TABLE `sync_cursors`;--> statement-breakpoint
ALTER TABLE `__new_sync_cursors` RENAME TO `sync_cursors`;