import type { Track } from '@/store/sources/types';
import type { EntityId } from '@/store/types';
import { driverRegistry } from '@/store/sources/drivers/registry';

/**
 * Retrieves an instant mix (radio-style queue) seeded from the given track.
 * Delegates to the source driver so it works for both Jellyfin and Emby.
 *
 * Returns an array of Track objects in playback order. The first item is
 * typically the seed track itself — callers should shift() it off if they are
 * already playing it.
 */
export async function retrieveInstantMixByTrackId([sourceId, trackId]: EntityId): Promise<Track[]> {
    const driver = await driverRegistry.getById(sourceId);

    if (!driver) {
        console.warn('[playlist] No driver found for source', sourceId);
        return [];
    }

    try {
        const result = await driver.getInstantMix(trackId);
        return result.items;
    } catch (error) {
        console.error('[playlist] Failed to retrieve instant mix for track', trackId, error);
        return [];
    }
}