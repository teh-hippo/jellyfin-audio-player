import { useLiveQuery, useFtsQuery } from '@/store/live-queries';
import { db } from '@/store';
import type { EntityId } from '@/store/types';
import type { Track } from './types';

/** A track row with its local download entry attached (null when none exists). */
export type TrackWithDownload = NonNullable<
    ReturnType<typeof useTracksByAlbum>['data']
>[number];

export function useTracks() {
    return useLiveQuery(
        db.query.tracks.findMany()
    );
}

export function useTrack([sourceId, id]: EntityId) {
    return useLiveQuery(
        db.query.tracks.findFirst({
            where: { sourceId, id },
        })
    );
}

export function useTrackWithDownload([sourceId, id]: EntityId) {
    return useLiveQuery(
        db.query.tracks.findFirst({
            where: { sourceId, id },
            with: { download: true },
        })
    );
}

/**
 * Returns the ordered list of tracks belonging to the given album, each
 * paired with its download row (null when none exists).
 * Sorted in the DB by disc number then track number.
 */
export function useTracksByAlbum([sourceId, albumId]: EntityId) {
    // TrackWithDownload is inferred from this return type
    return useLiveQuery(
        db.query.tracks.findMany({
            where: { sourceId, albumId },
            with: { download: true },
            orderBy: {
                parentIndexNumber: 'asc',
                indexNumber: 'asc',
            },
        })
    );
}

/**
 * Full-text search across tracks using the tracks_fts virtual table.
 * Searches name, album, and album_artist columns. Returns at most 50 results.
 * Pass an empty string (or omit) to get no results.
 */
export function useTrackSearch(term: string) {
    const trimmed = term.trim();
    const matchTerm = trimmed ? trimmed + '*' : '';

    return useFtsQuery<Track>(
        `SELECT tracks.*
         FROM tracks_fts
         JOIN tracks ON tracks.rowid = tracks_fts.rowid
         WHERE tracks_fts MATCH ?
         ORDER BY rank
         LIMIT 50`,
        [matchTerm],
        ['tracks'],
        trimmed.length > 0,
    );
}

/**
 * Returns the ordered list of tracks belonging to the given playlist,
 * each paired with its download row (null when none exists).
 * Sorted in the DB by the position column in playlist_tracks.
 */
export function useTracksByPlaylist([sourceId, playlistId]: EntityId) {
    const { data, error } = useLiveQuery(
        db.query.playlistTracks.findMany({
            where: { sourceId, playlistId },
            orderBy: { position: 'asc' },
            with: {
                track: {
                    with: { download: true },
                },
            },
        })
    );

    return {
        data: data?.flatMap(r => r.track ? [r.track] : []) ?? null,
        error,
    };
}