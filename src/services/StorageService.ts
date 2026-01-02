import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recording, HistoryEntry } from '../types';

const KEYS = {
  AUTH_TOKEN: '@camstream_token',
  SERVER_URL: '@camstream_server_url',
  CAMERA_IP: '@camstream_camera_ip',
  STREAM_USERNAME: '@camstream_stream_username',
  STREAM_PASSWORD: '@camstream_stream_password',
  RECORDINGS: '@camstream_recordings',
  HISTORY: '@camstream_history',
  FACE_BLUR_ENABLED: '@camstream_face_blur',
  QR_SAFETY_ENABLED: '@camstream_qr_safety',
  FCM_TOKEN: 'fcm_token',
  DEVICE_REGISTERED: 'device_registered',
  TTS_ENABLED: 'tts_enabled',
};

class StorageService {
  // Auth Token
  async saveToken(token: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
  }

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.AUTH_TOKEN);
  }

  async clearToken(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
  }

  // Server URL
  async saveServerUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.SERVER_URL, url);
  }

  async getServerUrl(): Promise<string> {
    const url = await AsyncStorage.getItem(KEYS.SERVER_URL);
    return url || 'http://192.168.1.9:5000';
  }

  // Camera IP
  async saveCameraIp(ip: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.CAMERA_IP, ip);
  }

  async getCameraIp(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.CAMERA_IP);
  }

  // Stream Credentials
  async saveStreamCredentials(username: string, password: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.STREAM_USERNAME, username);
    await AsyncStorage.setItem(KEYS.STREAM_PASSWORD, password);
  }

  async getStreamCredentials(): Promise<{ username: string; password: string }> {
    const username = (await AsyncStorage.getItem(KEYS.STREAM_USERNAME)) || 'admin';
    const password = (await AsyncStorage.getItem(KEYS.STREAM_PASSWORD)) || 'admin123';
    return { username, password };
  }

  // Build Stream URL
  async buildStreamUrl(): Promise<string | null> {
    const ip = await this.getCameraIp();
    if (!ip) return null;
    const { username, password } = await this.getStreamCredentials();
    return `http://${username}:${password}@${ip}:5000/video_feed`;
  }

  // Recordings
  async getRecordings(): Promise<Recording[]> {
    const data = await AsyncStorage.getItem(KEYS.RECORDINGS);
    return data ? JSON.parse(data) : [];
  }

  async saveRecording(recording: Recording): Promise<void> {
    const recordings = await this.getRecordings();
    recordings.unshift(recording);
    await AsyncStorage.setItem(KEYS.RECORDINGS, JSON.stringify(recordings));
  }

  async deleteRecording(id: string): Promise<void> {
    const recordings = await this.getRecordings();
    const filtered = recordings.filter(r => r.id !== id);
    await AsyncStorage.setItem(KEYS.RECORDINGS, JSON.stringify(filtered));
  }

  async clearRecordings(): Promise<void> {
    await AsyncStorage.setItem(KEYS.RECORDINGS, JSON.stringify([]));
  }

  // History
  async getHistory(): Promise<HistoryEntry[]> {
    const data = await AsyncStorage.getItem(KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  }

  async addHistory(action: string, details?: string): Promise<void> {
    const history = await this.getHistory();
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      action,
      details,
      timestamp: Date.now(),
    };
    history.unshift(entry);
    // Keep only last 100 entries
    const trimmed = history.slice(0, 100);
    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(trimmed));
  }

  async clearHistory(): Promise<void> {
    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify([]));
  }

  // Module States
  async saveFaceBlurEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.FACE_BLUR_ENABLED, JSON.stringify(enabled));
  }

  async getFaceBlurEnabled(): Promise<boolean> {
    const data = await AsyncStorage.getItem(KEYS.FACE_BLUR_ENABLED);
    return data ? JSON.parse(data) : false;
  }

  async saveQrSafetyEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.QR_SAFETY_ENABLED, JSON.stringify(enabled));
  }

  async getQrSafetyEnabled(): Promise<boolean> {
    const data = await AsyncStorage.getItem(KEYS.QR_SAFETY_ENABLED);
    return data ? JSON.parse(data) : false;
  }

  // Clear All
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  }

  async saveFcmToken(token: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.FCM_TOKEN, token);
  }

  async getFcmToken(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.FCM_TOKEN);
  }

  async saveDeviceRegistered(registered: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.DEVICE_REGISTERED, JSON.stringify(registered));
  }

  async isDeviceRegistered(): Promise<boolean> {
    const value = await AsyncStorage.getItem(KEYS.DEVICE_REGISTERED);
    return value ? JSON.parse(value) : false;
  }
  async saveTtsEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.TTS_ENABLED, JSON.stringify(enabled));
  }

  async getTtsEnabled(): Promise<boolean> {
    const value = await AsyncStorage.getItem(KEYS.TTS_ENABLED);
    return value !== null ? JSON.parse(value) : true; // Default: enabled
  }
}

export default new StorageService();
