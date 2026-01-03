import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import StorageService from '../services/StorageService';
import NotificationService from '../services/NotificationServices';
import CamApi from '../api/camApi';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  token: string | null;
  cameraIp: string | null;
  serverUrl: string;
  streamUrl: string | null;
  login: (serverUrl: string,username: string, password: string ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const buildStreamUrl = (ip: string, username: string, password: string) => {
  return `http://${username}:${password}@${ip}:5000/video`;
};

const extractIpFromUrl = (url: string): string => {
  const match = url.match(/\/\/([^:\/]+)/);
  return match ? match[1] : '192.168.1.9';
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [cameraIp, setCameraIp] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState('http://192.168.1.9:5000');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const savedToken = await StorageService.getToken();

      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      const savedUrl = await StorageService.getServerUrl();
      const { username, password } = await StorageService.getStreamCredentials();

      // Set CamApi config
      CamApi.setBaseUrl(savedUrl);
      CamApi.setCredentials(username, password);

      setToken(savedToken);
      setServerUrl(savedUrl);

      // Try to get fresh IP from API
      let ip: string;
      try {
        console.log('Getting network status on app start...');
        const networkStatus = await CamApi.getNetworkStatus();
        ip = networkStatus.wifi.ip;
        console.log('Got IP from API:', ip);
        await StorageService.saveCameraIp(ip);
      } catch (e) {
        console.log('Network status failed, using saved/fallback IP');
        const savedIp = await StorageService.getCameraIp();
        ip = savedIp || extractIpFromUrl(savedUrl);
      }

      setCameraIp(ip);
      setStreamUrl(buildStreamUrl(ip, username, password));
      setIsLoggedIn(true);

    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (url: string, username: string, password: string, ) => {
    try {
      CamApi.setBaseUrl(url);
      CamApi.setCredentials(username, password);

      console.log('Logging in to:', url);
      const response = await CamApi.login(username, password);
      console.log('Login successful');

      // Save credentials
      await StorageService.saveToken(response.token);
      await StorageService.saveServerUrl(url);
      await StorageService.saveStreamCredentials(username, password);

      setToken(response.token);
      setServerUrl(url);

      // Get IP from network status API
      let ip: string;
      try {
        console.log('Getting network status...');
        const networkStatus = await CamApi.getNetworkStatus();
        ip = networkStatus.wifi.ip;
        console.log('Got IP from API:', ip);
      } catch (e) {
        console.log('Network status failed, extracting IP from URL');
        ip = extractIpFromUrl(url);
      }

      await StorageService.saveCameraIp(ip);
      setCameraIp(ip);

      const stream = buildStreamUrl(ip, username, password);
      setStreamUrl(stream);
      console.log('Stream URL:', stream);

      await StorageService.addHistory('login', `Logged in. Camera IP: ${ip}`);
      setIsLoggedIn(true);

    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      // Unregister device from notifications
      const fcmToken = NotificationService.getCurrentToken();
      if (fcmToken) {
        await CamApi.unregisterDevice(fcmToken);
        console.log("Device unregistered from notifications");
      }
    } catch (error) {
      console.error('Error logging out:', error);
      console.error('Failed to unregister device:', error);
    }
    await StorageService.addHistory('logout', 'User logged out');
    await StorageService.clearToken();
    setToken(null);
    setCameraIp(null);
    setStreamUrl(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isLoading,
        token,
        cameraIp,
        serverUrl,
        streamUrl,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};