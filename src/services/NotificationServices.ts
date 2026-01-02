import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import StorageService from './StorageService';
import CamApi from '../api/camApi';

interface DeviceRegistration {
  device_id: string;
  device_name: string;
  fcm_token: string;
  platform: string;
}

class NotificationService {
  private static instance: NotificationService;
  private fcmToken: string | null = null;
  private isRegistered: boolean = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Request notification permissions
  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission denied');
          return false;
        }
      }

      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Notification permission granted');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  // Get FCM token
  async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      this.fcmToken = token;
      console.log('FCM Token:', token);
      await StorageService.saveFcmToken(token);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Get device info
  async getDeviceInfo(): Promise<{ device_id: string; device_name: string; platform: string }> {
    const device_id = await DeviceInfo.getUniqueId();
    const brand = await DeviceInfo.getBrand();
    const model = await DeviceInfo.getModel();
    const device_name = `${brand} ${model}`;
    const platform = Platform.OS;

    return { device_id, device_name, platform };
  }

  // Register device with backend
  async registerDevice(): Promise<boolean> {
    try {
      const fcm_token = await this.getToken();
      if (!fcm_token) {
        console.error('No FCM token available');
        return false;
      }

      const deviceInfo = await this.getDeviceInfo();

      const registrationData: DeviceRegistration = {
        device_id: deviceInfo.device_id,
        device_name: deviceInfo.device_name,
        fcm_token,
        platform: deviceInfo.platform,
      };

      console.log('Registering device:', registrationData);

      await CamApi.registerDevice(registrationData);

      this.isRegistered = true;
      await StorageService.saveDeviceRegistered(true);

      console.log('Device registered successfully');
      return true;
    } catch (error) {
      console.error('Error registering device:', error);
      return false;
    }
  }

  // Initialize and register
  async initialize(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermission();

      if (!hasPermission) {
        console.log('No notification permission');
        return false;
      }

      const registered = await this.registerDevice();
      return registered;
    } catch (error) {
      console.error('Notification initialization error:', error);
      return false;
    }
  }

  // Listen for token refresh
  onTokenRefresh(callback?: (token: string) => void): () => void {
    return messaging().onTokenRefresh(async (token) => {
      console.log('FCM Token refreshed:', token);
      this.fcmToken = token;
      await StorageService.saveFcmToken(token);
      await this.registerDevice();
      if (callback) callback(token);
    });
  }

  // Handle foreground messages
  onForegroundMessage(callback: (message: any) => void): () => void {
    return messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message:', remoteMessage);
      callback(remoteMessage);
    });
  }

  // Handle notification opened app
  onNotificationOpenedApp(callback: (message: any) => void): () => void {
    return messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app:', remoteMessage);
      callback(remoteMessage);
    });
  }

  // Check if app was opened from notification
  async getInitialNotification(): Promise<any> {
    return await messaging().getInitialNotification();
  }

  // Get current token
  getCurrentToken(): string | null {
    return this.fcmToken;
  }
}

export default NotificationService.getInstance();