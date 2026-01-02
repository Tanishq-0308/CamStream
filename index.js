/**
 * @format
 */
import 'react-native-gesture-handler';
import { AppRegistry, NativeModules } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';

const { TTSModule } = NativeModules;

// Handle background messages
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background message:', remoteMessage);

  const { notification } = remoteMessage;

  if (notification?.title || notification?.body) {
    try {
      await TTSModule.speakNotification(
        notification.title || '',
        notification.body || ''
      );
    } catch (e) {
      console.log('Background TTS error:', e);
    }
  }
});

AppRegistry.registerComponent(appName, () => App);