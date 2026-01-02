import axios from 'axios';
import {
  LoginResponse,
  NetworkStatus,
  CameraSettings,
  SystemStats,
  ModuleResponse,
} from '../types';

interface DeviceRegistration {
  device_id: string;
  device_name: string;
  fcm_token: string;
  platform: string;
}

class CamApi {
  private baseUrl: string = 'http://192.168.1.9:5000';
  private username: string = 'admin';
  private password: string = 'admin123';
  authToken: string | undefined;

  private getConfig() {
    return {
      auth: {
        username: this.username,
        password: this.password,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    };
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
    console.log('CamApi baseUrl set to:', url);
  }

  setCredentials(username: string, password: string) {
    this.username = username;
    this.password = password;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    this.setCredentials(username, password);
    const response = await axios.post<LoginResponse>(
      `${this.baseUrl}/api/auth/login`,
      { username, password },
      { timeout: 10000 }
    );
    return response.data;
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    const response = await axios.get<NetworkStatus>(
      `${this.baseUrl}/api/network/status`,
      this.getConfig()
    );
    return response.data;
  }

  async getCameraSettings(): Promise<CameraSettings> {
    const response = await axios.get<CameraSettings>(
      `${this.baseUrl}/api/camera/settings`,
      this.getConfig()
    );
    return response.data;
  }

  async updateCameraSettings(settings: CameraSettings): Promise<CameraSettings> {
    const response = await axios.post<CameraSettings>(
      `${this.baseUrl}/api/camera/settings`,
      settings,
      this.getConfig()
    );
    return response.data;
  }

  async getSystemStats(): Promise<SystemStats> {
    const response = await axios.get<SystemStats>(
      `${this.baseUrl}/api/system/stats`,
      this.getConfig()
    );
    return response.data;
  }

  async enableFaceBlur(): Promise<ModuleResponse> {
    const response = await axios.post<ModuleResponse>(
      `${this.baseUrl}/api/modules/face_blur/enable`,
      {},
      this.getConfig()
    );
    return response.data;
  }

  async disableFaceBlur(): Promise<ModuleResponse> {
    const response = await axios.post<ModuleResponse>(
      `${this.baseUrl}/api/modules/face_blur/disable`,
      {},
      this.getConfig()
    );
    return response.data;
  }

  async enableQrSafety(): Promise<ModuleResponse> {
    const response = await axios.post<ModuleResponse>(
      `${this.baseUrl}/api/modules/qr_safety/enable`,
      {},
      this.getConfig()
    );
    return response.data;
  }

  async disableQrSafety(): Promise<ModuleResponse> {
    const response = await axios.post<ModuleResponse>(
      `${this.baseUrl}/api/modules/qr_safety/disable`,
      {},
      this.getConfig()
    );
    return response.data;
  }

  async toggleFaceBlur(enable: boolean): Promise<ModuleResponse> {
    return enable ? this.enableFaceBlur() : this.disableFaceBlur();
  }

  async toggleQrSafety(enable: boolean): Promise<ModuleResponse> {
    return enable ? this.enableQrSafety() : this.disableQrSafety();
  }

  // Register device for push notifications
  async registerDevice(data: DeviceRegistration): Promise<any> {
    const response = await axios.post(
      `${this.baseUrl}/api/notifications/register`,
      data,
      this.getConfig()
    );
    console.log("Response register Devices :", response.data);
    
    return response.data;
  }

  // Unregister device from push notifications
  async unregisterDevice(fcm_token: string): Promise<any> {
    const response = await axios.post(
      `${this.baseUrl}/api/notifications/unregister`,
      { fcm_token },
      this.getConfig()
    );
    console.log("Response unregister Devices :", response.data);
    return response.data;
  }
}

export default new CamApi();