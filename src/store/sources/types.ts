/**
 * Shared Source Driver Types
 *
 * Defines common types and the base abstract class for source drivers.
 * Driver methods return types compatible with the database schema.
 */

import type { Artist as SchemaArtist } from '../artists/types';
import type { Album as SchemaAlbum } from '../albums/types';
import type { Track as SchemaTrack } from '../tracks/types';
import type { Playlist as SchemaPlaylist } from '../playlists/types';
import { InferSelectModel } from 'drizzle-orm';
import sources from './entity';

/**
 * Source types enum
 */
export enum SourceType {
    JELLYFIN_V1 = 'jellyfin.v1',
    EMBY_V1 = 'emby.v1',
}

export type Source = InferSelectModel<typeof sources>;

/**
 * Source info returned during connection
 */
export interface SourceInfo {
    id: string;
    name: string;
    version: string;
    operatingSystem?: string;
}

/**
 * Credentials
 */
export interface Credentials {
    accessToken: string;
    userId: string;
}

/**
 * List parameters for paging
 */
export interface ListParams {
    offset?: number;  // Start index
    limit?: number;   // Page size (default: 500)
}

/**
 * List result with items and paging info
 */
export interface ListResult<T> {
    items: T[];
    total: number;
    offset: number;
    limit: number;
}

/**
 * Artist entity returned from drivers.
 * sourceId, firstSyncedAt, and lastSyncedAt are omitted — they are managed
 * locally by the schema and actions, never supplied by drivers.
 * createdAt/updatedAt are optional — drivers provide source-side dates where available.
 */
export type Artist = Omit<SchemaArtist, 'sourceId' | 'firstSyncedAt' | 'lastSyncedAt' | 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
};

/**
 * Album entity returned from drivers.
 * sourceId, firstSyncedAt, and lastSyncedAt are omitted — they are managed
 * locally by the schema and actions, never supplied by drivers.
 * createdAt/updatedAt are optional — drivers provide source-side dates where available.
 * Includes temporary artistItems field for relationship data.
 */
export type Album = Omit<SchemaAlbum, 'sourceId' | 'firstSyncedAt' | 'lastSyncedAt' | 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
    artistItems?: Artist[];
};

/**
 * Track entity returned from drivers.
 * sourceId, firstSyncedAt, lastSyncedAt, and lyrics are omitted —
 * the sync timestamps are managed by the schema; lyrics are managed locally.
 * createdAt/updatedAt are optional — drivers provide source-side dates where available.
 * Includes temporary artistItems field for relationship data.
 */
export type Track = Omit<SchemaTrack, 'sourceId' | 'firstSyncedAt' | 'lastSyncedAt' | 'lyrics' | 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
    artistItems?: Artist[];
};

/**
 * Playlist entity returned from drivers.
 * sourceId, firstSyncedAt, and lastSyncedAt are omitted — they are managed
 * locally by the schema and actions, never supplied by drivers.
 * createdAt/updatedAt are optional — drivers provide source-side dates where available.
 */
export type Playlist = Omit<SchemaPlaylist, 'sourceId' | 'firstSyncedAt' | 'lastSyncedAt' | 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
};

/**
 * Search filter types
 */
export enum SearchFilterType {
    ALBUMS = 'albums',
    ARTISTS = 'artists',
    TRACKS = 'tracks',
    PLAYLISTS = 'playlists',
}

/**
 * Search filter
 */
export interface SearchFilter {
    type: SearchFilterType;
}

/**
 * Search result item
 */
export interface SearchResultItem {
    id: string;
    name: string;
    type: SearchFilterType;
    [key: string]: unknown;
}

/**
 * Codec metadata
 */
export interface CodecMetadata {
    codec?: string;
    bitrate?: number;
    sampleRate?: number;
    channels?: number;
    bitDepth?: number;
}

/**
 * Lyrics
 */
export interface Lyrics {
    lyrics: string;
}

/**
 * Stream options
 */
export interface StreamOptions {
    bitrate?: number;
    maxStreamingBitrate?: number;
    audioCodec?: string;
}

/**
 * Download options
 */
export interface DownloadOptions {
    bitrate?: number;
}

/**
 * Download info
 */
export interface DownloadInfo {
    url: string;
    filename: string;
    mimetype?: string;
}

/**
 * Source Driver Abstract Class
 *
 * All source drivers (Jellyfin, Emby, etc.) must extend this class
 * Optional methods have default implementations
 */
export abstract class SourceDriver {
    protected source: Source;

    constructor(source: Source) {
        this.source = source;
    }

    getSourceId(): string {
        return this.source.id;
    }

    /**
     * Connect to the source and retrieve server info
     */
    abstract connect(): Promise<SourceInfo>;

    /**
     * Refresh credentials (re-authenticate)
     * Default implementation throws error
     */
    refreshCredentials(): Promise<Credentials> {
        throw new Error('refreshCredentials not implemented');
    }

    /**
     * Validate current credentials
     * Default implementation tries to connect
     */
    async validateCredentials(): Promise<boolean> {
        try {
            await this.connect();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Sign out from the source
     * Default implementation does nothing
     */
    async signOut(): Promise<void> {
        // Default: no-op
    }

    /**
     * Get list of artists with paging
     */
    abstract getArtists(params?: ListParams): Promise<ListResult<Artist>>;

    /**
     * Get list of albums with paging
     */
    abstract getAlbums(params?: ListParams): Promise<ListResult<Album>>;

    /**
     * Get a specific album by ID
     */
    abstract getAlbum(albumId: string): Promise<Album>;

    /**
     * Get tracks for an album with paging
     */
    abstract getTracksByAlbum(albumId: string, params?: ListParams): Promise<ListResult<Track>>;

    /**
     * Get list of playlists with paging
     */
    abstract getPlaylists(params?: ListParams): Promise<ListResult<Playlist>>;

    /**
     * Get a specific playlist by ID
     */
    abstract getPlaylist(playlistId: string): Promise<Playlist>;

    /**
     * Get tracks for a playlist with paging
     */
    abstract getTracksByPlaylist(playlistId: string, params?: ListParams): Promise<ListResult<Track>>;

    /**
     * Search for items
     */
    abstract search(query: string, filters: SearchFilter[], params?: ListParams): Promise<ListResult<SearchResultItem>>;

    /**
     * Get recent albums with paging
     */
    abstract getRecentAlbums(params?: ListParams): Promise<ListResult<Album>>;

    /**
     * Get similar albums for an album with paging
     */
    abstract getSimilarAlbums(albumId: string, params?: ListParams): Promise<ListResult<Album>>;

    /**
     * Get instant mix for an entity with paging
     */
    abstract getInstantMix(entityId: string, params?: ListParams): Promise<ListResult<Track>>;

    /**
     * Get codec metadata for a track
     */
    abstract getTrackCodecMetadata(trackId: string): Promise<CodecMetadata | null>;

    /**
     * Get lyrics for a track
     */
    abstract getTrackLyrics(trackId: string): Promise<Lyrics | null>;

    /**
     * Get stream URL for a track
     */
    abstract getStreamUrl(trackId: string, options?: StreamOptions): Promise<string>;

    /**
     * Get download info for a track
     */
    abstract getDownloadInfo(trackId: string, options?: DownloadOptions): Promise<DownloadInfo>;

    /**
     * Report playback start
     */
    abstract reportPlaybackStart(trackId: string, positionTicks: number): Promise<void>;

    /**
     * Report playback progress
     */
    abstract reportPlaybackProgress(trackId: string, positionTicks: number): Promise<void>;

    /**
     * Report playback stop
     */
    abstract reportPlaybackStop(trackId: string, positionTicks: number): Promise<void>;
}
