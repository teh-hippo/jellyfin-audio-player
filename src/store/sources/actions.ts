import { db, sqliteDb } from "..";
import getDriverBySource from "./drivers";
import { SourceType } from "./types";
import sources from "./entity";

/**
 * Retrieve all sources from the database
 */
export async function getSources() {
    return db.query.sources.findMany();
}

/**
 * Instantiate all sources with their respective drivers
 */
export async function getAllSourceDrivers() {
    // Retrieve all sources first
    const allSources = await getSources();

    // Then, loop through all sources
    return allSources.map((source) => {
        // Retrieve the appropriate driver class for this source type
        const Driver = getDriverBySource(source.type as SourceType);

        // Instantiate and return the driver for this source
        return new Driver(source);
    });
}

/**
 * Upsert Jellyfin/Emby credentials as a source row.
 */
export async function setCredentials(credentials: {
    uri: string;
    userId: string;
    accessToken: string;
    deviceId: string;
    type: 'jellyfin' | 'emby';
}): Promise<void> {
    const sourceType = credentials.type === 'jellyfin' ? 'jellyfin.v1' : 'emby.v1';
    const sourceId = credentials.deviceId;

    await db.insert(sources)
        .values({
            id: sourceId,
            uri: credentials.uri,
            userId: credentials.userId,
            accessToken: credentials.accessToken,
            deviceId: credentials.deviceId,
            type: sourceType,
        })
        .onConflictDoUpdate({
            target: sources.id,
            set: {
                uri: credentials.uri,
                userId: credentials.userId,
                accessToken: credentials.accessToken,
                deviceId: credentials.deviceId,
                type: sourceType,
            },
        });

    sqliteDb.flushPendingReactiveQueries();
}
