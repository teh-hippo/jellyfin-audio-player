/**
 * Database-backed hooks for playlists
 */

import { useLiveQuery } from '@/store/live-queries';
import { db } from '@/store';

export function usePlaylists(sourceId?: string) {
    return useLiveQuery(
        db.query.playlists.findMany({
            where: sourceId ? { sourceId } : undefined,
        })
    );
}

export function usePlaylist([sourceId, id]: [sourceId: string, id: string]) {
    return useLiveQuery(
        db.query.playlists.findFirst({
            where: { sourceId, id },
        })
    );
}