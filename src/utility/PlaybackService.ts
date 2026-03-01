/**
* This is the code that will run tied to the player.
*
* The code here might keep running in the background.
*
* You should put everything here that should be tied to the playback but not the UI
* such as processing media buttons or analytics
*/

import TrackPlayer, { Event, State, type Track } from 'react-native-track-player';
import store from '@/store';
import { setTimerDate } from '@/store/sleep-timer';
import { driverRegistry } from '@/store/sources/drivers/registry';
import type { EntityId } from '@/store/types';

/**
 * Report a playback event to the appropriate source driver.
 *
 * @param event       Which playback event to report.
 * @param track       The track to report for. Falls back to the currently
 *                    active TrackPlayer track when omitted.
 * @param positionS   Playback position in seconds. Falls back to the current
 *                    TrackPlayer position when omitted.
 */
async function sendPlaybackEvent(
    event: 'start' | 'progress' | 'stop',
    track?: Track,
    positionS?: number,
): Promise<void> {
    try {
        const resolvedTrack = track ?? await TrackPlayer.getActiveTrack();
        if (!resolvedTrack) {
            return;
        }

        const entityId = resolvedTrack.entityId as EntityId | undefined;
        if (!entityId) {
            return;
        }

        const [sourceId, trackId] = entityId;
        const driver = await driverRegistry.getById(sourceId);
        if (!driver) {
            return;
        }

        const resolvedPositionS = positionS ?? await TrackPlayer.getPosition();
        const positionTicks = Math.round(resolvedPositionS * 10_000_000);

        switch (event) {
            case 'start':
                await driver.reportPlaybackStart(trackId, positionTicks);
                break;
            case 'progress':
                await driver.reportPlaybackProgress(trackId, positionTicks);
                break;
            case 'stop':
                await driver.reportPlaybackStop(trackId, positionTicks);
                break;
        }
    } catch (err) {
        // Playback reporting is best-effort — never crash the service.
        console.warn('[PlaybackService] Failed to report playback event:', event, err);
    }
}

export default async function() {
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        TrackPlayer.play();
    });
    
    TrackPlayer.addEventListener(Event.RemotePause, () => {
        TrackPlayer.pause();
    });
    
    TrackPlayer.addEventListener(Event.RemoteNext, () => {
        TrackPlayer.skipToNext();
    });
    
    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
        TrackPlayer.skipToPrevious();
    });
    
    TrackPlayer.addEventListener(Event.RemoteStop, () => {
        TrackPlayer.reset();
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        TrackPlayer.seekTo(event.position);
    });

    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (e) => {
        // Retrieve the current settings from the Redux store
        const settings = store.getState().settings;

        // GUARD: Only report playback when the setting is enabled
        if (settings.enablePlaybackReporting && 'track' in e) {
            // End the previous track session before starting the new one
            if (e.lastTrack) {
                sendPlaybackEvent('stop', e.lastTrack, e.lastPosition ?? undefined);
            }

            sendPlaybackEvent('start', e.track);
        }
    });

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, () => {
        // Retrieve the current settings from the Redux store
        const { settings, sleepTimer } = store.getState();

        // GUARD: Only report playback when the setting is enabled
        if (settings.enablePlaybackReporting) {
            sendPlaybackEvent('progress');
        }

        // check if timerDate is undefined, otherwise start timer
        if (sleepTimer.date && sleepTimer.date < new Date().valueOf()) {
            TrackPlayer.pause();
            store.dispatch(setTimerDate(null));
        }
    });

    TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
        // Retrieve the current settings from the Redux store
        const settings = store.getState().settings;

        // GUARD: Only report playback when the setting is enabled
        if (settings.enablePlaybackReporting) {
            if (event.state === State.Stopped) {
                sendPlaybackEvent('stop');
            } else if (event.state === State.Paused) {
                sendPlaybackEvent('progress');
            }
        }
    });
    
}