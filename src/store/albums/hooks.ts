import { sql } from 'drizzle-orm';
import { useLiveQuery } from '@/store/live-queries';
import { db } from '@/store';
import { useMemo } from 'react';
import type { Album } from './types';
import type { EntityId } from '@/store/types';
import albums from './entity';

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
 * Returns all albums grouped into alphabetical sections, pre-sorted in the
 * DB by UPPER(COALESCE(album_artist, name)) then UPPER(name). The section key
 * is the uppercase first letter of the album artist (falling back to the album
 * name), or '#' for non-alphabetic names.
 *
 * Sorting is done in SQLite so the JS grouping is a single linear pass with
 * no re-sorting.
 */
export function useAlbumsByAlphabet() {
    const { data } = useLiveQuery(
        db.select()
            .from(albums)
            .orderBy(sql`UPPER(COALESCE(${albums.albumArtist}, ${albums.name})), UPPER(${albums.name})`)
    );

    return useMemo(() => {
        if (!data) return [];

        const sections: { label: string; data: Album[] }[] = [];

        for (const album of data) {
            const firstChar = (album.albumArtist ?? album.name)[0]?.toUpperCase() ?? '#';
            const label = /^[A-Z]$/.test(firstChar) ? firstChar : '#';

            const last = sections[sections.length - 1];
            if (last?.label === label) {
                last.data.push(album);
            } else {
                sections.push({ label, data: [album] });
            }
        }

        // '#' section lands first when names start with non-alpha; move it to end
        if (sections[0]?.label === '#') {
            sections.push(sections.shift()!);
        }

        return sections;
    }, [data]);
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