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
 *
 * Usage
 * -----
 *   import { artworkManager } from '@/store/sources/artwork-manager';
 *
 *   const url = await artworkManager.getUrl(album);
 *   const url = await artworkManager.getUrl(track, { width: 512 });
 */

import type { ArtworkEntity, ArtworkOptions } from './types';
import { driverRegistry } from './drivers/registry';

class ArtworkManager {
    /**
     * Resolve an artwork URL for a given entity.
     *
     * Looks up the driver registered for `entity.sourceId` in the driver
     * registry and delegates to its `getArtworkUrl` method. Returns `undefined`
     * when no driver is registered for the entity's source (e.g. source was
     * removed) or when the driver itself cannot produce a URL.
     *
     * @param entity   Any member of the ArtworkEntity union.
     * @param options  Optional hints for image dimensions, quality, and format.
     * @returns        A fully-qualified image URL, or `undefined`.
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
     * Resolve artwork URLs for a batch of entities in a single call.
     *
     * Entities belonging to different sources are dispatched to their
     * respective drivers concurrently. The result array preserves the input
     * order; entries whose driver is missing resolve to `undefined`.
     *
     * @param entities  An array of ArtworkEntity members.
     * @param options   Optional hints applied uniformly to every item.
     * @returns         An array of URL strings (or `undefined`) in input order.
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
 *   import { artworkManager } from '@/store/sources/artwork-manager';
 */
const Artwork = new ArtworkManager();

export default Artwork;
