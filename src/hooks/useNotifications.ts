import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import NotificationService from '../services/NotificationServices';
import TTSService from '../services/TTSService';
import StorageService from '../services/StorageService';

const useNotifications = (isLoggedIn: boolean = false) => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const initializeNotifications = useCallback(async () => {
    if (!isLoggedIn) {
      console.log('User not logged in, skipping notification setup');
      return;
    }

    console.log('Initializing notifications...');

    try {
      // Load TTS preference
      const ttsPreference = await StorageService.getTtsEnabled();
      setTtsEnabled(ttsPreference);

      // Initialize notifications
      const success = await NotificationService.initialize();

      if (success) {
        const token = NotificationService.getCurrentToken();
        setFcmToken(token);
        setIsRegistered(true);
        console.log('Notifications initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    initializeNotifications();

    // Foreground message listener
    const unsubscribeForeground = NotificationService.onForegroundMessage(async (message) => {
      const { notification: notif, data } = message;

      console.log('Foreground notification received:', notif);

      // Speak the notification
      if (ttsEnabled && (notif?.title || notif?.body)) {
        await TTSService.speakNotification(notif?.title, notif?.body);
      }

      // Show alert
      if (notif?.title || notif?.body) {
        Alert.alert(notif?.title || 'Notification', notif?.body || '', [{ text: 'OK' }]);
      }
    });

    // Token refresh listener
    const unsubscribeTokenRefresh = NotificationService.onTokenRefresh((token) => {
      console.log('FCM Token refreshed');
      setFcmToken(token);
    });

    // Notification opened app listener
    const unsubscribeNotificationOpened = NotificationService.onNotificationOpenedApp(async (message) => {
      console.log('Notification opened app:', message.data);

      // Speak when app opened from notification
      const { notification: notif } = message;
      if (ttsEnabled && (notif?.title || notif?.body)) {
        await TTSService.speakNotification(notif?.title, notif?.body);
      }
    });

    return () => {
      unsubscribeForeground();
      unsubscribeTokenRefresh();
      unsubscribeNotificationOpened();
    };
  }, [initializeNotifications, ttsEnabled]);

  // Toggle TTS
  const toggleTTS = async (enabled: boolean) => {
    setTtsEnabled(enabled);
    await StorageService.saveTtsEnabled(enabled);

    if (enabled) {
      await TTSService.speak('Notifications will be read aloud');
    }
  };

  // Manually speak text
  const speak = async (text: string) => {
    await TTSService.speak(text);
  };

  // Stop speaking
  const stopSpeaking = async () => {
    await TTSService.stop();
  };

  return {
    fcmToken,
    isRegistered,
    ttsEnabled,
    toggleTTS,
    speak,
    stopSpeaking,
  };
};

export default useNotifications;