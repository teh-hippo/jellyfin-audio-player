/**
 * Artwork Manager
 *
 * A singleton that resolves artwork URLs for any locally-stored entity
 * (album, artist, track, or playlist) by delegating to the correct
 * SourceDriver via the driver registry.
 *
 * Design goals
 * ------------
 * - Single responsibility: "given an entity, give me an image URL".
 * - No network calls — drivers build URLs synchronously from the cached
 *   source credentials; the manager just routes to the right driver.
 * - Works with any member of the ArtworkEntity union, which covers every
 *   entity table in the local database.
 * - Provides both a synchronous and an async variant:
 *   - getUrlSync  — for render paths (useMemo, useCallback, JSX); returns
 *                   undefined if the registry cache is not yet warm.
 *   - getUrl      — for imperative / async contexts; always waits for the
 *                   registry to finish building before resolving.
 *
 * Usage
 * -----
 *   import Artwork from '@/store/sources/artwork-manager';
 *
 *   // Synchronous (render path):
 *   const url = Artwork.getUrlSync(album);
 *   const url = Artwork.getUrlSync(track, { width: 512 });
 *
 *   // Async (imperative path):
 *   const url = await Artwork.getUrl(album);
 *   const url = await Artwork.getUrl(track, { width: 512 });
 */

import type { ArtworkEntity, ArtworkOptions } from './types';
import { driverRegistry } from './drivers/registry';

class ArtworkManager {
    /**
     * Synchronously resolve an artwork URL for a given entity.
     *
     * Reads from the driver registry's warm cache — no async work is done.
     * Returns `undefined` when the cache has not yet been populated (i.e. on
     * the very first render before the initial build completes) or when no
     * driver is registered for the entity's source.
     *
     * Because the registry eagerly builds on construction, the cache is warm
     * by the time the first screen renders in practice, so `undefined` is only
     * ever returned transiently.
     *
     * Safe to call inside `useMemo`, `useCallback`, and JSX — no side-effects,
     * no awaiting.
     */
    getUrlSync(
        entity: ArtworkEntity | null | undefined,
        options?: ArtworkOptions,
    ): string | undefined {
        if (!entity) {
            return undefined;
        }

        const driver = driverRegistry.getByIdSync(entity.sourceId);

        if (!driver) {
            return undefined;
        }

        return driver.getArtworkUrl(entity, options);
    }

    /**
     * Asynchronously resolve an artwork URL for a given entity.
     *
     * Waits for the driver registry to finish its initial build before
     * resolving, so this always returns a result even if called before the
     * cache is warm. Prefer `getUrlSync` on render paths.
     *
     * Returns `undefined` when no driver is registered for the entity's source
     * (e.g. the source was removed) or when the driver itself cannot produce a
     * URL.
     */
    async getUrl(
        entity: ArtworkEntity,
        options?: ArtworkOptions,
    ): Promise<string | undefined> {
        const driver = await driverRegistry.getById(entity.sourceId);

        if (!driver) {
            if (__DEV__) {
                console.warn(
                    `[ArtworkManager] No driver found for sourceId "${entity.sourceId}". ` +
                    'Ensure the source exists and the registry has not been invalidated.',
                );
            }
            return undefined;
        }

        return driver.getArtworkUrl(entity, options);
    }

    /**
     * Resolve artwork URLs for a batch of entities in a single async call.
     *
     * Entities belonging to different sources are dispatched to their
     * respective drivers concurrently. The result array preserves the input
     * order; entries whose driver is missing resolve to `undefined`.
     */
    async getBatchUrls(
        entities: ArtworkEntity[],
        options?: ArtworkOptions,
    ): Promise<(string | undefined)[]> {
        return Promise.all(
            entities.map(entity => this.getUrl(entity, options)),
        );
    }
}

/**
 * The global artwork manager.
 *
 * Import this wherever an artwork URL is needed:
 *
 *   import Artwork from '@/store/sources/artwork-manager';
 */
const Artwork = new ArtworkManager();

export default Artwork;
