import { NativeModules } from 'react-native';

const { HotspotModule } = NativeModules;

interface CamDeviceResult {
  found: boolean;
  ip?: string;
  error?: string;
}

interface PhoneIpInfo {
  ip: string;
  interface: string;
  subnet: string;
}

class HotspotService {
  private static instance: HotspotService;

  static getInstance(): HotspotService {
    if (!HotspotService.instance) {
      HotspotService.instance = new HotspotService();
    }
    return HotspotService.instance;
  }

  async findCamDevice(): Promise<string | null> {
    try {
      console.log('Finding cam device...');
      const result: CamDeviceResult = await HotspotModule.findCamDevice();
      console.log('Result:', result);

      if (result.found && result.ip) {
        return result.ip;
      }
      return null;
    } catch (error) {
      console.error('Error finding cam:', error);
      return null;
    }
  }

  async getPhoneIp(): Promise<PhoneIpInfo[]> {
    try {
      return await HotspotModule.getPhoneIp();
    } catch (error) {
      console.error('Error getting phone IP:', error);
      return [];
    }
  }

  async openHotspotSettings(): Promise<boolean> {
    try {
      return await HotspotModule.openHotspotSettings();
    } catch (error) {
      console.error('Error opening settings:', error);
      return false;
    }
  }

  generateHotspotCredentials(pin: string): { ssid: string; password: string } {
    return {
      ssid: `CAM${pin}`,
      password: '12345678',
    };
  }
}

export default HotspotService.getInstance();