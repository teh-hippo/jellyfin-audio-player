/**
 * Driver Registry
 *
 * A singleton that owns a lazily-initialised, sourceId-keyed map of every
 * instantiated SourceDriver. All other modules (ArtworkManager, playback
 * helpers, etc.) should obtain driver instances through this registry instead
 * of constructing them ad-hoc, so there is always exactly one driver object
 * per source at runtime.
 *
 * Lifecycle
 * ---------
 * The registry starts empty. The first call to `getAll()` or `getById()`
 * triggers initialisation: it loads every source row from the database,
 * instantiates the correct driver class via `getDriverBySource`, and caches
 * the result. Subsequent calls return the cached map immediately.
 *
 * If sources are added, removed, or updated at runtime, call `invalidate()`
 * to clear the cache so the next access rebuilds from fresh database rows.
 */

import type { SourceDriver } from '../types';
import { getAllSourceDrivers } from '../actions';

class DriverRegistry {
    /**
     * The cached driver map. `null` means the registry has not been
     * initialised yet (or has been explicitly invalidated).
     */
    private cache: Map<string, SourceDriver> | null = null;

    /**
     * In-flight initialisation promise. Stored so that concurrent calls made
     * before the first `await` resolves all share the same promise rather than
     * racing to build separate maps.
     */
    private initPromise: Promise<Map<string, SourceDriver>> | null = null;

    constructor() {
        // Eagerly build the registry on startup so drivers are ready by the time the UI needs them.
        this.initPromise = this.build();
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Return a map of every registered driver, keyed by sourceId.
     *
     * The map is built lazily on first access and cached for all subsequent
     * calls. Concurrent calls that arrive before initialisation completes share
     * a single in-flight promise so the database is only queried once.
     */
    async getAll(): Promise<Map<string, SourceDriver>> {
        if (this.cache !== null) {
            return this.cache;
        }

        if (this.initPromise === null) {
            this.initPromise = this.build();
        }

        return this.initPromise;
    }

    /**
     * Return the driver for a specific source, or `undefined` if no driver
     * is registered for that sourceId.
     *
     * @param sourceId  The stable source identifier (primary key in `sources`).
     */
    async getById(sourceId: string): Promise<SourceDriver | undefined> {
        const map = await this.getAll();
        return map.get(sourceId);
    }

    /**
     * Synchronously return the driver for a specific source from the warm
     * cache, or `undefined` if the cache is not yet populated or no driver
     * exists for that sourceId.
     *
     * Safe to call on every render — returns `undefined` gracefully rather
     * than throwing when called before the initial build completes. Because
     * the registry eagerly builds on construction the cache is warm by the
     * time the first screen renders in practice.
     *
     * @param sourceId  The stable source identifier (primary key in `sources`).
     */
    getByIdSync(sourceId: string): SourceDriver | undefined {
        return this.cache?.get(sourceId);
    }

    /**
     * Return all drivers as an ordered array.
     *
     * Useful when iterating every source without needing the keyed map.
     */
    async toArray(): Promise<SourceDriver[]> {
        const map = await this.getAll();
        return [...map.values()];
    }

    /**
     * Invalidate the cached driver map.
     *
     * The next call to `getAll()` or `getById()` will rebuild the map from the
     * database. Call this after adding, removing, or updating a source so that
     * the registry reflects the current state.
     */
    invalidate(): void {
        this.cache = null;
        this.initPromise = null;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Build the driver map by loading all source rows and instantiating a
     * driver for each one. Stores the result in `cache` and clears the
     * in-flight promise so future reads hit the cache path directly.
     */
    private async build(): Promise<Map<string, SourceDriver>> {
        const drivers = await getAllSourceDrivers();

        const map = new Map<string, SourceDriver>(
            drivers.map(driver => [driver.getSourceId(), driver]),
        );

        this.cache = map;
        this.initPromise = null;

        return map;
    }
}

/**
 * The global driver registry.
 *
 * Import this wherever a SourceDriver is needed:
 *
 *   import { driverRegistry } from '@/store/sources/drivers/registry';
 *
 *   const driver = await driverRegistry.getById(sourceId);
 */
export const driverRegistry = new DriverRegistry();
