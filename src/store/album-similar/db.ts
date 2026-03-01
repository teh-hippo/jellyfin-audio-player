import { db, sqliteDb } from '@/store';
import albumSimilar from './entity';

export async function upsertAlbumSimilar(
    sourceId: string,
    albumId: string,
    similarAlbumIds: string[],
): Promise<void> {
    if (similarAlbumIds.length === 0) return;

    for (const similarAlbumId of similarAlbumIds) {
        await db.insert(albumSimilar).values({
            sourceId,
            albumId,
            similarAlbumId,
        }).onConflictDoNothing();
    }

    sqliteDb.flushPendingReactiveQueries();
}
