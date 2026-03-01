/**
 * Database actions for tracks
 */

import { db, sqliteDb } from '@/store';
import tracks from './entity';
import type { InsertTrack } from './types';

/**
 * createdAt and updatedAt are optional — they reflect server-provided timestamps
 * and are stored as-is. Null when the server does not supply them.
 *
 * firstSyncedAt and lastSyncedAt are always managed by the schema and are
 * excluded from the upsert type: firstSyncedAt is set once on insert and never
 * overwritten; lastSyncedAt is set automatically on every insert and update.
 */
type UpsertTrack = Omit<InsertTrack, 'firstSyncedAt' | 'lastSyncedAt'>;

export async function upsertTrack(track: UpsertTrack): Promise<void> {
    await db.insert(tracks).values({
        ...track,
    }).onConflictDoUpdate({
        target: tracks.id,
        set: {
            sourceId: track.sourceId,
            name: track.name,
            albumId: track.albumId,
            album: track.album,
            albumArtist: track.albumArtist,
            productionYear: track.productionYear,
            indexNumber: track.indexNumber,
            parentIndexNumber: track.parentIndexNumber,
            runTimeTicks: track.runTimeTicks,
            metadata: track.metadata,
            // createdAt and updatedAt reflect source-provided values; store as-is.
            createdAt: track.createdAt,
            updatedAt: track.updatedAt,
            // firstSyncedAt is intentionally absent — preserve the original insert value.
            // lastSyncedAt is intentionally absent — the schema $onUpdateFn handles it.
        },
    });

    sqliteDb.flushPendingReactiveQueries();
}

export async function upsertTracks(trackList: UpsertTrack[]): Promise<void> {
    for (const track of trackList) {
        await upsertTrack(track);
    }
}