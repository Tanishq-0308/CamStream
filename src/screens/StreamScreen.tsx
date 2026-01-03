import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  AppState,
  StatusBar,
} from 'react-native';
import { VLCPlayer } from 'react-native-vlc-media-player';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import StorageService from '../services/StorageService';
import RecordingService from '../services/RecordingService';

type NavigationProp = DrawerNavigationProp<any>;

const StreamScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [autoRecordTriggered, setAutoRecordTriggered] = useState(false);

  const vlcRef = useRef<any>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    loadStreamUrl();
    checkRecordingState();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  const handleAppStateChange = (nextAppState: string) => {
    if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
      setShowPlayer(false);
    } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      if (isConnected) {
        setTimeout(() => setShowPlayer(true), 100);
      }
    }
    appState.current = nextAppState as any;
  };

  useFocusEffect(
    React.useCallback(() => {
      checkRecordingState();
      if (isConnected) {
        setShowPlayer(true);
      }
      return () => {
        setShowPlayer(false);
      };
    }, [isConnected])
  );

  const loadStreamUrl = async () => {
    const url = await StorageService.buildStreamUrl();
    setStreamUrl(url);
  };

  const checkRecordingState = async () => {
    try {
      const recording = await RecordingService.isRecording();
      setIsRecording(recording);
      if (recording) {
        startDurationTimer();
      }
    } catch (e) {
      console.log('Recording check failed:', e);
    }
  };

  const startDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    durationIntervalRef.current = setInterval(async () => {
      try {
        const duration = await RecordingService.getRecordingDuration();
        setRecordingDuration(duration);
      } catch (e) { }
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setRecordingDuration(0);
  };

  const connect = () => {
    if (!streamUrl) {
      setError('No stream URL configured. Go to Settings.');
      return;
    }
    setError(null);
    setIsConnected(true);
    setShowPlayer(true);
    setAutoRecordTriggered(false);
    StorageService.addHistory('stream_started', 'Connected to stream');
  };

  const disconnect = () => {
    setShowPlayer(false);
    setTimeout(() => {
      setIsConnected(false);
    }, 100);
    StorageService.addHistory('stream_stopped', 'Disconnected from stream');
  };

  const startRecording = async () => {
    if (!streamUrl) return;
    try {
      await RecordingService.startRecording(streamUrl);
      setIsRecording(true);
      startDurationTimer();
      StorageService.addHistory('recording_started', 'Recording started');
    } catch (e: any) {
      Alert.alert('Error', 'Failed to start recording: ' + e.message);
    }
  };

  const stopRecording = async () => {
    try {
      await RecordingService.stopRecording();
      setIsRecording(false);
      stopDurationTimer();
      const duration = RecordingService.formatDuration(recordingDuration);
      StorageService.addHistory('recording_stopped', `Duration: ${duration}`);
      Alert.alert('Recording Saved', `Duration: ${duration}`);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to stop recording: ' + e.message);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleStreamPlaying = async () => {
    console.log('VLC playing');
    if (!autoRecordTriggered && !isRecording) {
      setAutoRecordTriggered(true);
      try {
        await RecordingService.startRecording(streamUrl!);
        setIsRecording(true);
        startDurationTimer();
        StorageService.addHistory('recording_started', 'Auto-recording started');
      } catch (e: any) {
        console.log('Auto-record failed:', e.message);
      }
    }
  };

  const openDrawer = () => {
    navigation.openDrawer();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
          <Icon name="menu" size={28} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Icon name="videocam" size={24} color="#28316A" />
          <Text style={styles.headerTitle}>Live Stream</Text>
        </View>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.statusDot,
              isConnected ? styles.statusConnected : styles.statusDisconnected,
            ]}
          />
          {isRecording && (
            <View style={styles.headerRecording}>
              <View style={styles.headerRecordingDot} />
              <Text style={styles.headerRecordingText}>REC</Text>
            </View>
          )}
        </View>
      </View>

      {/* Video */}
      <View style={styles.videoContainer}>
        {isConnected && showPlayer && streamUrl ? (
          <>
            <VLCPlayer
              ref={vlcRef}
              style={styles.vlcPlayer}
              source={{
                uri: streamUrl,
                initOptions: [
                  '--network-caching=150',
                  '--live-caching=150',
                  '--file-caching=150',
                  '--clock-jitter=0',
                  '--clock-synchro=0',
                  '--drop-late-frames',
                  '--skip-frames',
                ]
              }}
              paused={false}
              resizeMode="contain"
              onError={(e: any) => {
                console.error('VLC error:', e);
                setError('Stream error');
                setShowPlayer(false);
                setIsConnected(false);
              }}
              onPlaying={handleStreamPlaying}
            />
            {isRecording && (
              <View style={styles.recordingOverlay}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  {RecordingService.formatDuration(recordingDuration)}
                </Text>
              </View>
            )}
          </>
        ) : error ? (
          <View style={styles.centerContent}>
            <Icon name="error-outline" size={64} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={connect}>
              <Icon name="refresh" size={20} color="#FFF" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : isConnected && !showPlayer ? (
          <View style={styles.centerContent}>
            <Icon name="pause-circle-outline" size={64} color="#666" />
            <Text style={styles.statusText}>Stream paused</Text>
          </View>
        ) : (
          <View style={styles.centerContent}>
            <Icon name="videocam-off" size={64} color="#666" />
            <Text style={styles.statusText}>
              {streamUrl ? 'Not connected' : 'No stream URL configured.\nGo to Settings.'}
            </Text>
            {streamUrl && (
              <TouchableOpacity style={styles.connectButton} onPress={connect}>
                <Icon name="play-arrow" size={20} color="#FFF" />
                <Text style={styles.connectButtonText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controlBar}>
        {isConnected ? (
          <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
            <Icon name="stop" size={24} color="#F44336" />
            <Text style={styles.disconnectButtonText}>Disconnect</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.connectBtn, !streamUrl && styles.buttonDisabled]}
            onPress={connect}
            disabled={!streamUrl}
          >
            <Icon name="play-arrow" size={24} color="#FFF" />
            <Text style={styles.connectBtnText}>Connect</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive,
            !isConnected && !isRecording && styles.buttonDisabled,
          ]}
          onPress={toggleRecording}
          disabled={!isConnected && !isRecording}
        >
          <Icon
            name={isRecording ? 'stop' : 'fiber-manual-record'}
            size={32}
            color="#FFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
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
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  statusConnected: { backgroundColor: '#4CAF50' },
  statusDisconnected: { backgroundColor: '#F44336' },
  headerRecording: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  headerRecordingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF', marginRight: 4 },
  headerRecordingText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  videoContainer: { flex: 1, backgroundColor: '#000' },
  vlcPlayer: { flex: 1 },
  recordingOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF', marginRight: 8 },
  recordingText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  statusText: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 16 },
  errorText: { color: '#F44336', fontSize: 14, textAlign: 'center', marginTop: 16 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28316A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#1E1E1E',
    gap: 24,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28316A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  connectButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28316A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  connectBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F44336',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  disconnectButtonText: { color: '#F44336', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#00C853',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: { backgroundColor: '#F44336' },
  buttonDisabled: { opacity: 0.5 },
});

export default StreamScreen;