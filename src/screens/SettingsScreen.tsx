import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useAuth } from '../context/AuthContext';
import CamApi from '../api/camApi';
import TTSService from '../services/TTSService';
import StorageService from '../services/StorageService';
import { NetworkStatus, CameraSettings, SystemStats } from '../types';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const { logout, cameraIp } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [togglingTts, setTogglingTts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>({
    flip_h: false,
    flip_v: false,
    fps: 15,
    height: 480,
    rotation: 0,
    width: 640,
  });
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [faceBlurEnabled, setFaceBlurEnabled] = useState(false);
  const [qrSafetyEnabled, setQrSafetyEnabled] = useState(false);

  // Loading states for individual toggles
  const [togglingFlipH, setTogglingFlipH] = useState(false);
  const [togglingFlipV, setTogglingFlipV] = useState(false);
  const [togglingFaceBlur, setTogglingFaceBlur] = useState(false);
  const [togglingQrSafety, setTogglingQrSafety] = useState(false);

  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    setIsLoading(true);
    try {
      const serverUrl = await StorageService.getServerUrl();
      CamApi.setBaseUrl(serverUrl);

      await Promise.all([
        loadNetworkStatus(),
        loadCameraSettings(),
        loadSystemStats(),
        loadModuleStates(),
      ]);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNetworkStatus = async () => {
    try {
      const status = await CamApi.getNetworkStatus();
      setNetworkStatus(status);
      if (status.wifi?.ip) {
        await StorageService.saveCameraIp(status.wifi.ip);
      }
    } catch (error) {
      console.error('Error loading network status:', error);
    }
  };

  const loadCameraSettings = async () => {
    try {
      const settings = await CamApi.getCameraSettings();
      setCameraSettings(settings);
    } catch (error) {
      console.error('Error loading camera settings:', error);
    }
  };

  const loadSystemStats = async () => {
    try {
      const stats = await CamApi.getSystemStats();
      setSystemStats(stats);
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  // Load TTS state in loadAllSettings
  const loadTtsState = async () => {
    const enabled = await StorageService.getTtsEnabled();
    setTtsEnabled(enabled);
  };

  // Toggle function
  const toggleTts = async (value: boolean) => {
    setTogglingTts(true);
    try {
      await StorageService.saveTtsEnabled(value);
      setTtsEnabled(value);

      // Test TTS when enabled
      if (value) {
        await TTSService.speak('Text to speech enabled');
      }
    } catch (error) {
      console.error('Error toggling TTS:', error);
    } finally {
      setTogglingTts(false);
    }
  };

  const loadModuleStates = async () => {
    const faceBlur = await StorageService.getFaceBlurEnabled();
    const qrSafety = await StorageService.getQrSafetyEnabled();
    setFaceBlurEnabled(faceBlur);
    setQrSafetyEnabled(qrSafety);
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAllSettings();
    setIsRefreshing(false);
  }, []);

  // Toggle Flip Horizontal - Immediate API call
  const toggleFlipH = async (value: boolean) => {
    setTogglingFlipH(true);
    try {
      const updated = await CamApi.updateCameraSettings({ ...cameraSettings, flip_h: value });
      setCameraSettings(updated);
      await StorageService.addHistory('settings_changed', `Flip H ${value ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update flip horizontal');
    } finally {
      setTogglingFlipH(false);
    }
  };

  // Toggle Flip Vertical - Immediate API call
  const toggleFlipV = async (value: boolean) => {
    setTogglingFlipV(true);
    try {
      const updated = await CamApi.updateCameraSettings({ ...cameraSettings, flip_v: value });
      setCameraSettings(updated);
      await StorageService.addHistory('settings_changed', `Flip V ${value ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update flip vertical');
    } finally {
      setTogglingFlipV(false);
    }
  };

  // Toggle Face Blur - Immediate API call
  const toggleFaceBlur = async (value: boolean) => {
    setTogglingFaceBlur(true);
    try {
      await CamApi.toggleFaceBlur(value);
      setFaceBlurEnabled(value);
      await StorageService.saveFaceBlurEnabled(value);
      await StorageService.addHistory('module_toggled', `Face Blur ${value ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to toggle face blur');
    } finally {
      setTogglingFaceBlur(false);
    }
  };

  // Toggle QR Safety - Immediate API call
  const toggleQrSafety = async (value: boolean) => {
    setTogglingQrSafety(true);
    try {
      await CamApi.toggleQrSafety(value);
      setQrSafetyEnabled(value);
      await StorageService.saveQrSafetyEnabled(value);
      await StorageService.addHistory('module_toggled', `QR Safety ${value ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to toggle QR safety');
    } finally {
      setTogglingQrSafety(false);
    }
  };

  // Save Video Settings (Resolution, FPS, Rotation)
  const saveVideoSettings = async () => {
    setIsSavingVideo(true);
    try {
      const updated = await CamApi.updateCameraSettings(cameraSettings);
      setCameraSettings(updated);
      await StorageService.addHistory(
        'settings_changed',
        `${updated.width}x${updated.height} @ ${updated.fps}fps, ${updated.rotation}°`
      );
      Alert.alert('Success', 'Video settings saved');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save video settings');
    } finally {
      setIsSavingVideo(false);
    }
  };

  const cycleResolution = () => {
    const resolutions = [
      { width: 320, height: 240 },
      { width: 640, height: 480 },
      { width: 800, height: 600 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
    ];
    const currentIdx = resolutions.findIndex(
      (r) => r.width === cameraSettings.width && r.height === cameraSettings.height
    );
    const nextIdx = (currentIdx + 1) % resolutions.length;
    const next = resolutions[nextIdx];
    setCameraSettings({ ...cameraSettings, width: next.width, height: next.height });
  };

  const cycleFps = () => {
    const fpsOptions = [5, 10, 15, 20, 25, 30];
    const currentIdx = fpsOptions.indexOf(cameraSettings.fps);
    const nextIdx = (currentIdx + 1) % fpsOptions.length;
    setCameraSettings({ ...cameraSettings, fps: fpsOptions[nextIdx] });
  };

  const cycleRotation = () => {
    const rotations = [0, 90, 180, 270];
    const currentIdx = rotations.indexOf(cameraSettings.rotation);
    const nextIdx = (currentIdx + 1) % rotations.length;
    setCameraSettings({ ...cameraSettings, rotation: rotations[nextIdx] });
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />
        <ActivityIndicator size="large" color="#1E88E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
          <Icon name="menu" size={28} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Icon name="settings" size={24} color="#1E88E5" />
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Icon name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#1E88E5" />
        }
      >
        {/* Network Status Card */}
        <View style={styles.card}>
          {/* <View style={styles.cardHeader}>
            <Icon
              name="wifi"
              size={24}
              color={networkStatus?.wifi?.connected ? '#4CAF50' : '#F44336'}
            />
            <Text style={styles.cardTitle}>Network Status</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: networkStatus?.wifi?.connected ? '#4CAF5020' : '#F4433620' },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: networkStatus?.wifi?.connected ? '#4CAF50' : '#F44336' },
                ]}
              >
                {networkStatus?.wifi?.connected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View> */}
          <View style={styles.cardContent}>
            <InfoRow icon="router" label="SSID" value={networkStatus?.wifi?.ssid || 'N/A'} />
            <InfoRow icon="language" label="Camera IP" value={cameraIp || 'N/A'} />
            <InfoRow
              icon="videocam"
              label="Stream URL"
              value={cameraIp ? `http://${cameraIp}:5000/video` : 'N/A'}
              small
            />
          </View>
        </View>

        {/* Quick Toggles Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="toggle-on" size={24} color="#1E88E5" />
            <Text style={styles.cardTitle}>Quick Settings</Text>
          </View>
          <View style={styles.cardContent}>
            {/* <ToggleRow
              icon="flip"
              label="Flip Horizontal"
              description="Mirror the video horizontally"
              value={cameraSettings.flip_h}
              onValueChange={toggleFlipH}
              isLoading={togglingFlipH}
            />
            <View style={styles.divider} />
            <ToggleRow
              icon="flip-camera-android"
              label="Flip Vertical"
              description="Flip the video vertically"
              value={cameraSettings.flip_v}
              onValueChange={toggleFlipV}
              isLoading={togglingFlipV}
            /> */}
            <View style={styles.divider} />
            <ToggleRow
              icon="face"
              label="Face Blur"
              description="Blur detected faces in stream"
              value={faceBlurEnabled}
              onValueChange={toggleFaceBlur}
              isLoading={togglingFaceBlur}
            />
            <View style={styles.divider} />
            <ToggleRow
              icon="qr-code-scanner"
              label="QR Safety"
              description="Scan and validate QR codes"
              value={qrSafetyEnabled}
              onValueChange={toggleQrSafety}
              isLoading={togglingQrSafety}
            />
            <View style={styles.divider} />
            <ToggleRow
              icon="record-voice-over"
              label="Speak Notifications"
              description="Read notifications out loud"
              value={ttsEnabled}
              onValueChange={toggleTts}
              isLoading={togglingTts}
            />
          </View>
        </View>

        {/* Video Settings Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="videocam" size={24} color="#1E88E5" />
            <Text style={styles.cardTitle}>Video Settings</Text>
          </View>
          <View style={styles.cardContent}>
            <TouchableOpacity style={styles.settingRow} onPress={cycleResolution}>
              <View style={styles.settingLeft}>
                <Icon name="aspect-ratio" size={22} color="#888" />
                <Text style={styles.settingLabel}>Resolution</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>
                  {cameraSettings.width} × {cameraSettings.height}
                </Text>
                <Icon name="chevron-right" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} onPress={cycleFps}>
              <View style={styles.settingLeft}>
                <Icon name="speed" size={22} color="#888" />
                <Text style={styles.settingLabel}>Frame Rate</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{cameraSettings.fps} FPS</Text>
                <Icon name="chevron-right" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} onPress={cycleRotation}>
              <View style={styles.settingLeft}>
                <Icon name="rotate-right" size={22} color="#888" />
                <Text style={styles.settingLabel}>Rotation</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{cameraSettings.rotation}°</Text>
                <Icon name="chevron-right" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, isSavingVideo && styles.buttonDisabled]}
              onPress={saveVideoSettings}
              disabled={isSavingVideo}
            >
              {isSavingVideo ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Icon name="save" size={20} color="#FFF" />
                  <Text style={styles.saveButtonText}>Apply Video Settings</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* System Stats Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="memory" size={24} color="#1E88E5" />
            <Text style={styles.cardTitle}>System Stats</Text>
            <TouchableOpacity onPress={loadSystemStats} style={styles.refreshStatsButton}>
              <Icon name="refresh" size={20} color="#1E88E5" />
            </TouchableOpacity>
          </View>
          {systemStats ? (
            <View style={styles.cardContent}>
              <StatProgressRow
                label="CPU"
                value={`${systemStats.cpu_percent || 0}%`}
                progress={(systemStats.cpu_percent || 0) / 100}
              />
              <StatProgressRow
                label="Memory"
                value={`${Math.round(systemStats.memory_used_mb || 0)} / ${Math.round(
                  systemStats.memory_total_mb || 0
                )} MB`}
                progress={(systemStats.memory_percent || 0) / 100}
              />
              <StatProgressRow
                label="Disk"
                value={`${(systemStats.disk_used_gb || 0).toFixed(1)} / ${(
                  systemStats.disk_total_gb || 0
                ).toFixed(1)} GB`}
                progress={(systemStats.disk_percent || 0) / 100}
              />
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Icon name="thermostat" size={20} color="#FF9800" />
                  <Text style={styles.statItemValue}>{systemStats.temperature || 0}°C</Text>
                  <Text style={styles.statItemLabel}>Temp</Text>
                </View>
                <View style={styles.statItem}>
                  <Icon name="schedule" size={20} color="#4CAF50" />
                  <Text style={styles.statItemValue}>{systemStats.uptime || 'N/A'}</Text>
                  <Text style={styles.statItemLabel}>Uptime</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.cardContent}>
              <Text style={styles.noDataText}>No system stats available</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// Info Row Component
const InfoRow: React.FC<{ icon: string; label: string; value: string; small?: boolean }> = ({
  icon,
  label,
  value,
  small,
}) => (
  <View style={styles.infoRow}>
    <Icon name={icon} size={20} color="#666" style={styles.infoIcon} />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, small && styles.infoValueSmall]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

// Toggle Row Component
const ToggleRow: React.FC<{
  icon: string;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLoading: boolean;
}> = ({ icon, label, description, value, onValueChange, isLoading }) => (
  <View style={styles.toggleRow}>
    <Icon name={icon} size={24} color="#1E88E5" style={styles.toggleIcon} />
    <View style={styles.toggleInfo}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Text style={styles.toggleDescription}>{description}</Text>
    </View>
    {isLoading ? (
      <ActivityIndicator size="small" color="#1E88E5" style={styles.toggleLoader} />
    ) : (
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#444', true: '#1E88E5' }}
        thumbColor={value ? '#FFF' : '#CCC'}
      />
    )}
  </View>
);

// Stat Progress Row Component
const StatProgressRow: React.FC<{ label: string; value: string; progress: number }> = ({
  label,
  value,
  progress,
}) => {
  const getProgressColor = () => {
    if (progress > 0.9) return '#F44336';
    if (progress > 0.7) return '#FF9800';
    return '#1E88E5';
  };

  return (
    <View style={styles.statRow}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: getProgressColor() },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#1E1E1E',
  },
  menuButton: { padding: 8 },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  refreshButton: { padding: 8 },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 12,
  },
  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
    width: 100,
  },
  infoValue: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  infoValueSmall: {
    fontSize: 12,
  },
  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleIcon: {
    marginRight: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
  },
  toggleDescription: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  toggleLoader: {
    marginRight: 8,
  },
  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    color: '#FFF',
    fontSize: 15,
    marginLeft: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    color: '#1E88E5',
    fontSize: 15,
    fontWeight: '500',
    marginRight: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E88E5',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Stats
  refreshStatsButton: {
    padding: 4,
  },
  statRow: {
    marginBottom: 16,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    color: '#888',
    fontSize: 13,
  },
  statValue: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  statItem: {
    alignItems: 'center',
  },
  statItemValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
  },
  statItemLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  noDataText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export default SettingsScreen;