import { NativeModules } from 'react-native';

const { TTSModule } = NativeModules;

class TTSService {
  private static instance: TTSService;

  static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  // Speak text
  async speak(text: string): Promise<void> {
    try {
      await TTSModule.speak(text);
      console.log('TTS speaking:', text);
    } catch (error) {
      console.error('TTS speak error:', error);
    }
  }

  // Speak notification
  async speakNotification(title?: string, body?: string): Promise<void> {
    try {
      await TTSModule.speakNotification(title || '', body || '');
    } catch (error) {
      console.error('TTS speakNotification error:', error);
    }
  }

  // Stop speaking
  async stop(): Promise<void> {
    try {
      await TTSModule.stop();
    } catch (error) {
      console.error('TTS stop error:', error);
    }
  }

  // Set speech rate (0.5 - 2.0, default 1.0)
  async setRate(rate: number): Promise<void> {
    try {
      await TTSModule.setRate(rate);
    } catch (error) {
      console.error('TTS setRate error:', error);
    }
  }

  // Set pitch (0.5 - 2.0, default 1.0)
  async setPitch(pitch: number): Promise<void> {
    try {
      await TTSModule.setPitch(pitch);
    } catch (error) {
      console.error('TTS setPitch error:', error);
    }
  }

  // Set language (e.g., 'en-US', 'hi-IN')
  async setLanguage(language: string): Promise<void> {
    try {
      await TTSModule.setLanguage(language);
    } catch (error) {
      console.error('TTS setLanguage error:', error);
    }
  }

  // Check if speaking
  async isSpeaking(): Promise<boolean> {
    try {
      return await TTSModule.isSpeaking();
    } catch (error) {
      console.error('TTS isSpeaking error:', error);
      return false;
    }
  }

  // Get available languages
  async getAvailableLanguages(): Promise<string[]> {
    try {
      return await TTSModule.getAvailableLanguages();
    } catch (error) {
      console.error('TTS getAvailableLanguages error:', error);
      return [];
    }
  }
}

export default TTSService.getInstance();