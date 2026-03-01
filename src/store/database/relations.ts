import { defineRelations } from "drizzle-orm";
import sources from "../sources/entity";
import albums from "../albums/entity";
import artists from "../artists/entity";
import tracks from "../tracks/entity";
import playlists from "../playlists/entity";
import albumArtists from "../album-artists/entity";
import trackArtists from "../track-artists/entity";
import playlistTracks from "../playlist-tracks/entity";
import albumSimilar from "../album-similar/entity";

/**
 * Drizzle v2 relations.
 *
 * Many-to-many joins use the through shorthand so callers never touch the join
 * table -- they just write with: { artists: true } etc.
 * The join tables also expose their own one sides for direct row access.
 */
export const relations = defineRelations(
    { sources, albums, artists, tracks, playlists, albumArtists, trackArtists, playlistTracks, albumSimilar },
    (r) => ({

        // --- Sources --------------------------------------------------------------
        sources: {
            albums: r.many.albums(),
            artists: r.many.artists(),
            tracks: r.many.tracks(),
            playlists: r.many.playlists(),
        },

        // --- Albums ---------------------------------------------------------------
        albums: {
            source: r.one.sources({
                from: r.albums.sourceId,
                to: r.sources.id,
                optional: false,
            }),
            artists: r.many.artists({
                from: r.albums.id.through(r.albumArtists.albumId),
                to: r.artists.id.through(r.albumArtists.artistId),
            }),
            tracks: r.many.tracks(),
            similarAlbums: r.many.albums({
                from: r.albums.id.through(r.albumSimilar.albumId),
                to: r.albums.id.through(r.albumSimilar.similarAlbumId),
            }),
        },

        // --- Artists --------------------------------------------------------------
        artists: {
            source: r.one.sources({
                from: r.artists.sourceId,
                to: r.sources.id,
                optional: false,
            }),
            albums: r.many.albums({
                from: r.artists.id.through(r.albumArtists.artistId),
                to: r.albums.id.through(r.albumArtists.albumId),
            }),
            tracks: r.many.tracks({
                from: r.artists.id.through(r.trackArtists.artistId),
                to: r.tracks.id.through(r.trackArtists.trackId),
            }),
        },

        // --- Tracks ---------------------------------------------------------------
        tracks: {
            source: r.one.sources({
                from: r.tracks.sourceId,
                to: r.sources.id,
                optional: false,
            }),
            album: r.one.albums({
                from: r.tracks.albumId,
                to: r.albums.id,
            }),
            artists: r.many.artists({
                from: r.tracks.id.through(r.trackArtists.trackId),
                to: r.artists.id.through(r.trackArtists.artistId),
            }),
            playlists: r.many.playlists({
                from: r.tracks.id.through(r.playlistTracks.trackId),
                to: r.playlists.id.through(r.playlistTracks.playlistId),
            }),
        },

        // --- Playlists ------------------------------------------------------------
        playlists: {
            source: r.one.sources({
                from: r.playlists.sourceId,
                to: r.sources.id,
                optional: false,
            }),
            tracks: r.many.tracks({
                from: r.playlists.id.through(r.playlistTracks.playlistId),
                to: r.tracks.id.through(r.playlistTracks.trackId),
            }),
        },

        // --- Join tables (for direct row access) ----------------------------------

        albumArtists: {
            source: r.one.sources({ from: r.albumArtists.sourceId, to: r.sources.id, optional: false }),
            album: r.one.albums({ from: r.albumArtists.albumId, to: r.albums.id }),
            artist: r.one.artists({ from: r.albumArtists.artistId, to: r.artists.id }),
        },

        trackArtists: {
            source: r.one.sources({ from: r.trackArtists.sourceId, to: r.sources.id, optional: false }),
            track: r.one.tracks({ from: r.trackArtists.trackId, to: r.tracks.id }),
            artist: r.one.artists({ from: r.trackArtists.artistId, to: r.artists.id }),
        },

        playlistTracks: {
            source: r.one.sources({ from: r.playlistTracks.sourceId, to: r.sources.id, optional: false }),
            playlist: r.one.playlists({ from: r.playlistTracks.playlistId, to: r.playlists.id }),
            track: r.one.tracks({ from: r.playlistTracks.trackId, to: r.tracks.id }),
        },

        albumSimilar: {
            source: r.one.sources({ from: r.albumSimilar.sourceId, to: r.sources.id, optional: false }),
            album: r.one.albums({ from: r.albumSimilar.albumId, to: r.albums.id, alias: "albumSimilar_album" }),
            similarAlbum: r.one.albums({ from: r.albumSimilar.similarAlbumId, to: r.albums.id, alias: "albumSimilar_similarAlbum" }),
        },
    }));
