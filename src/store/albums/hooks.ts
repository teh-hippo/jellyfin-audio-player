import { sql } from 'drizzle-orm';
import { useLiveQuery } from '@/store/live-queries';
import { db } from '@/store';
import { useMemo } from 'react';

import type { EntityId } from '@/store/types';
import { groupByAlphabet } from '@/utility/groupByAlphabet';

export function useAlbums() {
    return useLiveQuery(
        db.query.albums.findMany()
    );
}

export function useAlbum([sourceId, id]: EntityId) {
    return useLiveQuery(
        db.query.albums.findFirst({
            where: { sourceId, id },
        })
    );
}

export function useRecentAlbums(limit: number = 24) {
    return useLiveQuery(
        db.query.albums.findMany({
            orderBy: { createdAt: 'desc' },
            limit,
        })
    );
}

/**
 * Returns all albums grouped into alphabetical sections, sorted and grouped
 * by the album artist name (falling back to the album name). The section key
 * is the uppercase first letter of that value, or '#' for non-alphabetic names.
 * The '#' section is always placed at the end.
 */
export function useAlbumsByAlphabet() {
    const { data } = useLiveQuery(
        db.query.albums.findMany({
            orderBy: (albums, { asc }) => [
                asc(sql`UPPER(COALESCE(${albums.albumArtist}, ${albums.name}))`),
                asc(sql`UPPER(${albums.name})`),
            ],
        })
    );

    return useMemo(
        () => groupByAlphabet(data ?? [], (album) => album.albumArtist ?? album.name),
        [data],
    );
}

/**
 * Returns all albums that belong to a given artist via the through relation.
 * Pass [artist.sourceId, artist.id].
 */
export function useAlbumsByArtist([sourceId, artistId]: EntityId) {
    return useLiveQuery(
        db.query.artists.findFirst({
            where: { sourceId, id: artistId },
            with: { albums: true },
        })
    );
}

/**
 * Returns albums that are marked as similar to the given album via the
 * through relation. Pass [album.sourceId, album.id].
 */
export function useAlbumSimilar([sourceId, albumId]: EntityId) {
    return useLiveQuery(
        db.query.albums.findFirst({
            where: { sourceId, id: albumId },
            with: { similarAlbums: true },
        })
    );
}