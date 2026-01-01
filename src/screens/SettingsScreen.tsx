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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import CamApi from '../api/camApi';
import StorageService from '../services/StorageService';
import { NetworkStatus, CameraSettings, SystemStats } from '../types';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { logout, cameraIp } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
      
      // Load sequentially to avoid race conditions
      await loadNetworkStatus();
      await loadCameraSettings();
      await loadSystemStats();
      await loadModuleStates();
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

  const saveCameraSettings = async () => {
    setIsSaving(true);
    try {
      const updated = await CamApi.updateCameraSettings(cameraSettings);
      setCameraSettings(updated);
      await StorageService.addHistory('settings_changed', `fps=${updated.fps}, ${updated.width}x${updated.height}`);
      Alert.alert('Success', 'Camera settings saved');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const showResolutionPicker = () => {
    const resolutions = [
      { label: '320 x 240', width: 320, height: 240 },
      { label: '640 x 480', width: 640, height: 480 },
      { label: '800 x 600', width: 800, height: 600 },
      { label: '1280 x 720', width: 1280, height: 720 },
      { label: '1920 x 1080', width: 1920, height: 1080 },
    ];
    // For simplicity, just cycle through resolutions
    const currentIdx = resolutions.findIndex(
      r => r.width === cameraSettings.width && r.height === cameraSettings.height
    );
    const nextIdx = (currentIdx + 1) % resolutions.length;
    const next = resolutions[nextIdx];
    setCameraSettings({ ...cameraSettings, width: next.width, height: next.height });
  };

  const showFpsPicker = () => {
    const fpsOptions = [5, 10, 15, 20, 25, 30];
    const currentIdx = fpsOptions.indexOf(cameraSettings.fps);
    const nextIdx = (currentIdx + 1) % fpsOptions.length;
    setCameraSettings({ ...cameraSettings, fps: fpsOptions[nextIdx] });
  };

  const showRotationPicker = () => {
    const rotations = [0, 90, 180, 270];
    const currentIdx = rotations.indexOf(cameraSettings.rotation);
    const nextIdx = (currentIdx + 1) % rotations.length;
    setCameraSettings({ ...cameraSettings, rotation: rotations[nextIdx] });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
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
          <View style={styles.cardHeader}>
            <Icon
              name="wifi"
              size={24}
              color={networkStatus?.wifi.connected ? '#1E88E5' : '#F44336'}
            />
            <Text style={styles.cardTitle}>Network Status</Text>
          </View>
          {networkStatus && (
            <View style={styles.cardContent}>
              <SettingsRow label="Status" value={networkStatus.state.toUpperCase()} />
              <SettingsRow label="WiFi SSID" value={networkStatus.wifi.ssid} />
              <SettingsRow label="Camera IP" value={cameraIp || '-'} />
              <SettingsRow label="Stream URL" value={`http://${cameraIp}:5000/video`} />
            </View>
          )}
        </View>

        {/* Camera Settings Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="camera-alt" size={24} color="#1E88E5" />
            <Text style={styles.cardTitle}>Camera Settings</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Flip Horizontal</Text>
              <Switch
                value={cameraSettings.flip_h}
                onValueChange={(value) =>
                  setCameraSettings({ ...cameraSettings, flip_h: value })
                }
                trackColor={{ false: '#444', true: '#1E88E5' }}
                thumbColor="#FFF"
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Flip Vertical</Text>
              <Switch
                value={cameraSettings.flip_v}
                onValueChange={(value) =>
                  setCameraSettings({ ...cameraSettings, flip_v: value })
                }
                trackColor={{ false: '#444', true: '#1E88E5' }}
                thumbColor="#FFF"
              />
            </View>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.selectRow} onPress={showResolutionPicker}>
              <Text style={styles.selectLabel}>Resolution</Text>
              <View style={styles.selectValue}>
                <Text style={styles.selectValueText}>
                  {cameraSettings.width} x {cameraSettings.height}
                </Text>
                <Icon name="chevron-right" size={20} color="#1E88E5" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectRow} onPress={showFpsPicker}>
              <Text style={styles.selectLabel}>Frame Rate</Text>
              <View style={styles.selectValue}>
                <Text style={styles.selectValueText}>{cameraSettings.fps} FPS</Text>
                <Icon name="chevron-right" size={20} color="#1E88E5" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectRow} onPress={showRotationPicker}>
              <Text style={styles.selectLabel}>Rotation</Text>
              <View style={styles.selectValue}>
                <Text style={styles.selectValueText}>{cameraSettings.rotation}°</Text>
                <Icon name="chevron-right" size={20} color="#1E88E5" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.buttonDisabled]}
              onPress={saveCameraSettings}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Icon name="save" size={20} color="#FFF" />
                  <Text style={styles.saveButtonText}>Save Settings</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Modules Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="extension" size={24} color="#1E88E5" />
            <Text style={styles.cardTitle}>Modules</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.moduleRow}>
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleLabel}>Face Blur</Text>
                <Text style={styles.moduleDescription}>Blur faces in video stream</Text>
              </View>
              {togglingFaceBlur ? (
                <ActivityIndicator size="small" color="#1E88E5" />
              ) : (
                <Switch
                  value={faceBlurEnabled}
                  onValueChange={toggleFaceBlur}
                  trackColor={{ false: '#444', true: '#1E88E5' }}
                  thumbColor="#FFF"
                />
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.moduleRow}>
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleLabel}>QR Safety</Text>
                <Text style={styles.moduleDescription}>Scan and validate QR codes</Text>
              </View>
              {togglingQrSafety ? (
                <ActivityIndicator size="small" color="#1E88E5" />
              ) : (
                <Switch
                  value={qrSafetyEnabled}
                  onValueChange={toggleQrSafety}
                  trackColor={{ false: '#444', true: '#1E88E5' }}
                  thumbColor="#FFF"
                />
              )}
            </View>
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
          {systemStats && (
            <View style={styles.cardContent}>
              <StatProgressRow
                label="CPU"
                value={`${systemStats.cpu_percent}%`}
                progress={systemStats.cpu_percent / 100}
              />
              <StatProgressRow
                label="Memory"
                value={`${Math.round(systemStats.memory_used_mb)} / ${Math.round(systemStats.memory_total_mb)} MB`}
                progress={systemStats.memory_percent / 100}
              />
              <StatProgressRow
                label="Disk"
                value={`${systemStats.disk_used_gb.toFixed(1)} / ${systemStats.disk_total_gb.toFixed(1)} GB`}
                progress={systemStats.disk_percent / 100}
              />
              <View style={styles.statsRow}>
                <SettingsRow label="Temperature" value={`${systemStats.temperature}°C`} />
                <SettingsRow label="Uptime" value={systemStats.uptime} />
              </View>
            </View>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={20} color="#F44336" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const SettingsRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.settingsRow}>
    <Text style={styles.settingsLabel}>{label}</Text>
    <Text style={styles.settingsValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E1E1E',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
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
    borderBottomColor: '#333',
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  cardContent: {
    padding: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingsLabel: {
    color: '#999',
    fontSize: 14,
  },
  settingsValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    color: '#FFF',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 8,
  },
  selectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  selectLabel: {
    color: '#FFF',
    fontSize: 14,
  },
  selectValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectValueText: {
    color: '#1E88E5',
    fontSize: 14,
    marginRight: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E88E5',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  moduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  moduleDescription: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  refreshStatsButton: {
    padding: 4,
  },
  statRow: {
    marginBottom: 12,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
  },
  statValue: {
    color: '#FFF',
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsRow: {
    marginTop: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 8,
    paddingVertical: 14,
  },
  logoutButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SettingsScreen;
