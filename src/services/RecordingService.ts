import { NativeModules } from 'react-native';

const { RecordingModule } = NativeModules;

export interface Recording {
  id: string;
  path: string;
  name: string;
  size: number;
  timestamp: number;
}

class RecordingService {
  private listeners: Set<(isRecording: boolean) => void> = new Set();

  addListener(callback: (isRecording: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(isRecording: boolean): void {
    this.listeners.forEach(cb => cb(isRecording));
  }

  async startRecording(streamUrl: string): Promise<string> {
    const path = await RecordingModule.startRecording(streamUrl);
    this.notifyListeners(true);
    return path;
  }

  async stopRecording(): Promise<string> {
    const path = await RecordingModule.stopRecording();
    this.notifyListeners(false);
    return path;
  }

  async isRecording(): Promise<boolean> {
    return await RecordingModule.isRecording();
  }

  async getRecordingDuration(): Promise<number> {
    return await RecordingModule.getRecordingDuration();
  }

  async getRecordings(): Promise<Recording[]> {
    return await RecordingModule.getRecordings();
  }

  async deleteRecording(path: string): Promise<boolean> {
    return await RecordingModule.deleteRecording(path);
  }

  async deleteAllRecordings(): Promise<boolean> {
    return await RecordingModule.deleteAllRecordings();
  }

  async playVideo(path: string): Promise<boolean> {
    return await RecordingModule.playVideo(path);
  }

  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

export default new RecordingService();