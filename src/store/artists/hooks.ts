import { sql } from 'drizzle-orm';
import { useLiveQuery } from '@/store/live-queries';
import { db } from '@/store';
import { useMemo } from 'react';
import type { Artist } from './types';
import artists from './entity';

export function useArtists(sourceId?: string) {
    return useLiveQuery(
        db.query.artists.findMany({
            where: sourceId ? { sourceId } : undefined,
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
 * Returns all artists grouped into alphabetical sections, pre-sorted in the
 * DB by UPPER(name). The section key is the uppercase first letter of the
 * artist name (or '#' for non-alphabetic names).
 *
 * Sorting is done in SQLite so the JS grouping is a single linear pass with
 * no re-sorting.
 */
export function useArtistsByAlphabet(sourceId?: string) {
    const { data } = useLiveQuery(
        db.select()
            .from(artists)
            .$dynamic()
            .where(sourceId ? sql`${artists.sourceId} = ${sourceId}` : undefined)
            .orderBy(sql`UPPER(${artists.name})`)
    );

    return useMemo(() => {
        if (!data) return [];

        const sections: { label: string; data: Artist[] }[] = [];

        for (const artist of data) {
            const firstChar = artist.name[0]?.toUpperCase() ?? '#';
            const label = /^[A-Z]$/.test(firstChar) ? firstChar : '#';

            const last = sections[sections.length - 1];
            if (last?.label === label) {
                last.data.push(artist);
            } else {
                sections.push({ label, data: [artist] });
            }
        }

        // '#' section lands first when names start with non-alpha; move it to end
        if (sections[0]?.label === '#') {
            sections.push(sections.shift()!);
        }

        return sections;
    }, [data]);
}