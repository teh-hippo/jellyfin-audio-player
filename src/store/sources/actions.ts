import { db } from "..";
import getDriverBySource from "./drivers";
import { SourceType } from "./types";

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
    const sources = await getSources();

    // Then, loop through all sources
    return sources.map((source) => {
        // Retrieve the appropriate driver class for this source type
        const Driver = getDriverBySource(source.type as SourceType);

        // Instantiate and return the driver for this source
        return new Driver(source);
    });
}
