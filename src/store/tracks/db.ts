import { db, sqliteDb } from '@/store';
import { eq } from 'drizzle-orm';
import tracks from './entity';

/**
 * Update lyrics content for a track.
 * Called after fetching lyrics from the source driver.
 * Note: updatedAt is intentionally not set here — it reflects the server-reported
 * last-modified date, not local operations. lastSyncedAt is bumped automatically
 * by the schema $onUpdateFn.
 */
export async function updateTrackLyrics(trackId: string, lyrics: string | null): Promise<void> {
    await db.update(tracks)
        .set({
            lyrics,
        })
        .where(eq(tracks.id, trackId));

    sqliteDb.flushPendingReactiveQueries();
}
