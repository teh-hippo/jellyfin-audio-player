import { sql } from 'drizzle-orm';
import { useLiveQuery } from '@/store/live-queries';
import { db } from '@/store';
import { useMemo } from 'react';
import { groupByAlphabet } from '@/utility/groupByAlphabet';

export function useArtists(sourceId?: string) {
    return useLiveQuery(
        db.query.artists.findMany({
            where: sourceId ? { sourceId } : undefined,
            orderBy: (artists, { asc }) => [asc(sql`UPPER(${artists.name})`)],
        })
    );
}

export function useArtist([sourceId, id]: [sourceId: string, id: string]) {
    return useLiveQuery(
        db.query.artists.findFirst({
            where: { sourceId, id },
        })
    );
}

/**
 * Returns all artists grouped into alphabetical sections, sorted and grouped
 * by the artist name. The section key is the uppercase first letter of the
 * name, or '#' for non-alphabetic names. The '#' section is always placed
 * at the end.
 */
export function useArtistsByAlphabet(sourceId?: string) {
    const { data } = useLiveQuery(
        db.query.artists.findMany({
            where: sourceId ? { sourceId } : undefined,
            orderBy: (artists, { asc }) => [asc(sql`UPPER(${artists.name})`)],
        })
    );

    return useMemo(
        () => groupByAlphabet(data ?? [], (artist) => artist.name),
        [data],
    );
}