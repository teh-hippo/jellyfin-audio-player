import 'react-native-gesture-handler';
import { AppRegistry, Platform } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from './src/components/App';
import { name as appName } from './app.json';
import PlaybackService from './src/utility/PlaybackService';
import { setupSentry } from '@/utility/Sentry';
import { enableScreens } from 'react-native-screens';
import { patchTrackPlayer } from '@/utility/AddedTrackEvents';

setupSentry();
enableScreens();
patchTrackPlayer();
AppRegistry.registerComponent(appName, () => App);
TrackPlayer.registerPlaybackService(() => PlaybackService);

// AutoPlay (CarPlay/Android Auto) native module is excluded from the iOS
// build via react-native.config.js, so only register on Android.
if (Platform.OS !== 'ios') {
    const { registerAutoPlay } = require('./src/screens/carplay/register');
    registerAutoPlay();
}