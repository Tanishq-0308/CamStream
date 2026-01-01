// API Response Types

export interface LoginResponse {
  token: string;
  username?: string;
}

export interface NetworkStatus {
  ap_mode: {
    ip: string;
    password: string;
    running: boolean;
    setup_url: string | null;
    ssid: string;
  };
  led_pattern: string;
  retry_count: number;
  state: string;
  wifi: {
    connected: boolean;
    interface: string;
    ip: string;
    saved_network: {
      has_password: boolean;
      saved_at: string;
      ssid: string;
    }[];
    ssid: string;
  };
}

export interface CameraSettings {
  flip_h: boolean;
  flip_v: boolean;
  fps: number;
  height: number;
  rotation: number;
  width: number;
}

export interface SystemStats {
  cpu_percent: number;
  disk_percent: number;
  disk_total_gb: number;
  disk_used_gb: number;
  memory_percent: number;
  memory_total_mb: number;
  memory_used_mb: number;
  temperature: number;
  uptime: string;
}

export interface ModuleResponse {
  success: boolean;
  message?: string;
}

// Local Storage Types

export interface Recording {
  id: string;
  filename: string;
  filepath: string;
  duration: number; // in milliseconds
  fileSize: number; // in bytes
  createdAt: number; // timestamp
  thumbnailPath?: string;
}

export interface HistoryEntry {
  id: string;
  action: string;
  details?: string;
  timestamp: number;
}

// App State Types

export interface AuthState {
  token: string | null;
  isLoggedIn: boolean;
  cameraIp: string | null;
  serverUrl: string;
}

export interface StreamState {
  isConnected: boolean;
  isConnecting: boolean;
  isRecording: boolean;
  recordingStartTime: number;
  recordingDuration: number;
  error: string | null;
}
