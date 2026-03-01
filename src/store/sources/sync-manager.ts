import PQueue from 'p-queue';

import type { SourceDriver } from './types';
import { EntityType, type SyncCursor } from '../sync-cursors/types';
import {
    getIncompleteCursors,
    createCursorIfNotExists,
    updateCursorOffset,
    markCursorComplete,
} from '../sync-cursors/db';
import { upsertArtists } from '../artists/actions';
import { upsertAlbums } from '../albums/actions';
import { upsertTracks } from '../tracks/actions';
import { upsertPlaylists } from '../playlists/actions';
import { upsertAlbumArtists } from '../album-artists/db';
import { upsertTrackArtists } from '../track-artists/db';
import { upsertAlbumSimilar } from '../album-similar/db';
import { setPlaylistTracks } from '../playlist-tracks/db';
import { updateTrackLyrics } from '../tracks/db';

const PAGE_SIZE = 500;

/**
 * SourceSyncManager
 *
 * Accepts multiple instantiated SourceDrivers and manages syncing their data into
 * the local SQLite database.
 *
 * Work is persisted as sync_cursor rows before execution, so it survives restarts
 * and can be resumed from the last successful page. Dependent tasks (e.g. album
 * tracks after albums) are enqueued as cursors during execution and picked up by
 * the next iteration of run().
 *
 * Usage:
 *   const manager = new SourceSyncManager([jellyfinDriver, embyDriver]);
 *   await manager.enqueueAlbumsSync(sourceId);
 *   await manager.run();
 */
export class SourceSyncManager {
    private queue: PQueue;
    private drivers: Map<string, SourceDriver>;

    constructor(drivers: SourceDriver[], concurrency = 5) {
        this.drivers = new Map(drivers.map(d => [d.getSourceId(), d]));
        this.queue = new PQueue({ concurrency });
    }

    // -------------------------------------------------------------------------
    // Public enqueue methods
    // Each method writes a cursor row if one does not already exist, making them
    // safe to call multiple times (idempotent). Actual execution only happens
    // when run() is called.
    // -------------------------------------------------------------------------

    async enqueueArtistsSync(sourceId: string): Promise<void> {
        await createCursorIfNotExists(sourceId, EntityType.ARTISTS);
    }

    async enqueueAlbumsSync(sourceId: string): Promise<void> {
        await createCursorIfNotExists(sourceId, EntityType.ALBUMS);
    }

    async enqueueAlbumTracksSync(sourceId: string, albumId: string): Promise<void> {
        await createCursorIfNotExists(sourceId, EntityType.ALBUM_TRACKS, albumId, EntityType.ALBUMS);
    }

    async enqueuePlaylistsSync(sourceId: string): Promise<void> {
        await createCursorIfNotExists(sourceId, EntityType.PLAYLISTS);
    }

    async enqueuePlaylistTracksSync(sourceId: string, playlistId: string): Promise<void> {
        await createCursorIfNotExists(sourceId, EntityType.PLAYLIST_TRACKS, playlistId, EntityType.PLAYLISTS);
    }

    async enqueueSimilarAlbumsSync(sourceId: string, albumId: string): Promise<void> {
        await createCursorIfNotExists(sourceId, EntityType.SIMILAR_ALBUMS, albumId, EntityType.ALBUMS);
    }

    async enqueueLyricsSync(sourceId: string, trackId: string): Promise<void> {
        await createCursorIfNotExists(sourceId, EntityType.LYRICS, trackId, EntityType.ALBUM_TRACKS);
    }

    // -------------------------------------------------------------------------
    // run()
    //
    // Loads all incomplete cursors and drains them through p-queue. Loops until
    // no incomplete cursors remain, which handles the case where task execution
    // itself creates new cursors (e.g. album pages creating album_tracks cursors).
    // -------------------------------------------------------------------------

    async run(): Promise<void> {
        while (true) {
            const cursors = await getIncompleteCursors();
            if (cursors.length === 0) break;

            for (const cursor of cursors) {
                this.queue.add(() => this.executeTask(cursor));
            }

            await this.queue.onIdle();
        }
    }

    // -------------------------------------------------------------------------
    // Task dispatch
    // -------------------------------------------------------------------------

    private async executeTask(cursor: SyncCursor): Promise<void> {
        const driver = this.drivers.get(cursor.sourceId);
        if (!driver) return;

        const { sourceId, entityType, parentEntityId, startIndex } = cursor;

        switch (entityType as EntityType) {
            case EntityType.ARTISTS:
                await this.executeArtistsPage(driver, sourceId, startIndex);
                break;
            case EntityType.ALBUMS:
                await this.executeAlbumsPage(driver, sourceId, startIndex);
                break;
            case EntityType.ALBUM_TRACKS:
                await this.executeAlbumTracksPage(driver, sourceId, parentEntityId, startIndex);
                break;
            case EntityType.PLAYLISTS:
                await this.executePlaylistsPage(driver, sourceId, startIndex);
                break;
            case EntityType.PLAYLIST_TRACKS:
                await this.executePlaylistTracks(driver, sourceId, parentEntityId);
                break;
            case EntityType.SIMILAR_ALBUMS:
                await this.executeSimilarAlbums(driver, sourceId, parentEntityId);
                break;
            case EntityType.LYRICS:
                await this.executeLyrics(driver, sourceId, parentEntityId);
                break;
        }
    }

    // -------------------------------------------------------------------------
    // Entity executors
    //
    // Pagination is handled inline: if a page is full, the cursor offset is
    // updated and the next page is added directly to the queue. This keeps all
    // pages of a single entity type within one run() iteration.
    //
    // Dependent tasks (e.g. album_tracks after albums) are written as cursor
    // rows only — not added to the current queue. The outer loop in run() picks
    // them up in the next iteration, naturally sequencing parents before children.
    // -------------------------------------------------------------------------

    private async executeArtistsPage(
        driver: SourceDriver,
        sourceId: string,
        offset: number,
    ): Promise<void> {
        const result = await driver.getArtists({ offset, limit: PAGE_SIZE });

        await upsertArtists(result.items.map(a => ({
            ...a,
            sourceId,
        })));

        const newOffset = offset + result.items.length;

        if (result.items.length === PAGE_SIZE) {
            await updateCursorOffset(sourceId, EntityType.ARTISTS, newOffset);
            this.queue.add(() => this.executeArtistsPage(driver, sourceId, newOffset));
        } else {
            await markCursorComplete(sourceId, EntityType.ARTISTS);
        }
    }

    private async executeAlbumsPage(
        driver: SourceDriver,
        sourceId: string,
        offset: number,
    ): Promise<void> {
        const result = await driver.getAlbums({ offset, limit: PAGE_SIZE });

        // Upsert artists embedded in album responses before inserting albums,
        // so they exist before album_artists relations reference them.
        const embeddedArtists = result.items.flatMap(a => a.artistItems ?? []);
        if (embeddedArtists.length > 0) {
            await upsertArtists(embeddedArtists.map(a => ({
                ...a,
                sourceId,
            })));
        }

        await upsertAlbums(result.items.map(({ artistItems: _artistItems, ...album }) => ({
            ...album,
            sourceId,
        })));

        for (const album of result.items) {
            if (album.artistItems?.length) {
                await upsertAlbumArtists(sourceId, album.id, album.artistItems);
            }
        }

        // Create album_tracks cursors for every album in this page.
        // These are picked up in the next run() iteration, after all album pages complete.
        for (const album of result.items) {
            await this.enqueueAlbumTracksSync(sourceId, album.id);
        }

        const newOffset = offset + result.items.length;

        if (result.items.length === PAGE_SIZE) {
            await updateCursorOffset(sourceId, EntityType.ALBUMS, newOffset);
            this.queue.add(() => this.executeAlbumsPage(driver, sourceId, newOffset));
        } else {
            await markCursorComplete(sourceId, EntityType.ALBUMS);
        }
    }

    private async executeAlbumTracksPage(
        driver: SourceDriver,
        sourceId: string,
        albumId: string,
        offset: number,
    ): Promise<void> {
        const result = await driver.getTracksByAlbum(albumId, { offset, limit: PAGE_SIZE });

        const embeddedArtists = result.items.flatMap(t => t.artistItems ?? []);
        if (embeddedArtists.length > 0) {
            await upsertArtists(embeddedArtists.map(a => ({
                ...a,
                sourceId,
            })));
        }

        await upsertTracks(result.items.map(({ artistItems: _artistItems, ...track }) => ({
            ...track,
            sourceId,
        })));

        for (const track of result.items) {
            if (track.artistItems?.length) {
                await upsertTrackArtists(sourceId, track.id, track.artistItems);
            }
        }

        const newOffset = offset + result.items.length;

        if (result.items.length === PAGE_SIZE) {
            await updateCursorOffset(sourceId, EntityType.ALBUM_TRACKS, newOffset, albumId);
            this.queue.add(() => this.executeAlbumTracksPage(driver, sourceId, albumId, newOffset));
        } else {
            await markCursorComplete(sourceId, EntityType.ALBUM_TRACKS, albumId);
        }
    }

    private async executePlaylistsPage(
        driver: SourceDriver,
        sourceId: string,
        offset: number,
    ): Promise<void> {
        const result = await driver.getPlaylists({ offset, limit: PAGE_SIZE });

        await upsertPlaylists(result.items.map(p => ({
            ...p,
            sourceId,
        })));

        for (const playlist of result.items) {
            await this.enqueuePlaylistTracksSync(sourceId, playlist.id);
        }

        const newOffset = offset + result.items.length;

        if (result.items.length === PAGE_SIZE) {
            await updateCursorOffset(sourceId, EntityType.PLAYLISTS, newOffset);
            this.queue.add(() => this.executePlaylistsPage(driver, sourceId, newOffset));
        } else {
            await markCursorComplete(sourceId, EntityType.PLAYLISTS);
        }
    }

    /**
     * Fetches all pages of tracks for a playlist in a single execution slot,
     * then replaces the playlist's tracks atomically via setPlaylistTracks.
     * Playlist tracks are not paginated across cursors because setPlaylistTracks
     * requires the complete ordered list.
     */
    private async executePlaylistTracks(
        driver: SourceDriver,
        sourceId: string,
        playlistId: string,
    ): Promise<void> {
        const trackIds: string[] = [];
        let offset = 0;

        while (true) {
            const result = await driver.getTracksByPlaylist(playlistId, { offset, limit: PAGE_SIZE });

            const embeddedArtists = result.items.flatMap(t => t.artistItems ?? []);
            if (embeddedArtists.length > 0) {
                await upsertArtists(embeddedArtists.map(a => ({
                    ...a,
                    sourceId,
                })));
            }

            await upsertTracks(result.items.map(({ artistItems: _artistItems, ...track }) => ({
                ...track,
                sourceId,
            })));

            for (const track of result.items) {
                if (track.artistItems?.length) {
                    await upsertTrackArtists(sourceId, track.id, track.artistItems);
                }
                trackIds.push(track.id);
            }

            offset += result.items.length;
            if (result.items.length < PAGE_SIZE) break;
        }

        await setPlaylistTracks(sourceId, playlistId, trackIds);
        await markCursorComplete(sourceId, EntityType.PLAYLIST_TRACKS, playlistId);
    }

    /**
     * Fetches similar albums for a single album. No pagination — the API returns
     * a bounded list and we take the first page.
     */
    private async executeSimilarAlbums(
        driver: SourceDriver,
        sourceId: string,
        albumId: string,
    ): Promise<void> {
        const result = await driver.getSimilarAlbums(albumId, { limit: PAGE_SIZE });

        const embeddedArtists = result.items.flatMap(a => a.artistItems ?? []);
        if (embeddedArtists.length > 0) {
            await upsertArtists(embeddedArtists.map(a => ({
                ...a,
                sourceId,
            })));
        }

        await upsertAlbums(result.items.map(({ artistItems: _artistItems, ...album }) => ({
            ...album,
            sourceId,
        })));

        for (const album of result.items) {
            if (album.artistItems?.length) {
                await upsertAlbumArtists(sourceId, album.id, album.artistItems);
            }
        }

        await upsertAlbumSimilar(sourceId, albumId, result.items.map(a => a.id));
        await markCursorComplete(sourceId, EntityType.SIMILAR_ALBUMS, albumId);
    }

    /**
     * Fetches lyrics for a single track and stores the result.
     * If the source returns null, lyrics is set to null on the track.
     */
    private async executeLyrics(
        driver: SourceDriver,
        sourceId: string,
        trackId: string,
    ): Promise<void> {
        const result = await driver.getTrackLyrics(trackId);
        await updateTrackLyrics(trackId, result?.lyrics ?? null);
        await markCursorComplete(sourceId, EntityType.LYRICS, trackId);
    }
}
