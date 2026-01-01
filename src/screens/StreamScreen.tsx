import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {VLCPlayer} from 'react-native-vlc-media-player';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import StorageService from '../services/StorageService';

const StreamScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const vlcRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingIntervalRef = useRef<any>(null);

  useEffect(() => {
    loadStreamUrl();
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const loadStreamUrl = async () => {
      const ip = await StorageService.getCameraIp();
      console.log('Camera IP:', ip);
    const url = await StorageService.buildStreamUrl();
    console.log('Stream URL:', url);
    setStreamUrl(url);
  };

  const connect = () => {
    if (!streamUrl) {
      setError('No stream URL configured. Go to Settings.');
      return;
    }
    setError(null);
    setIsConnected(true);
    setIsPlaying(true);
    StorageService.addHistory('stream_started', `Connected to ${streamUrl}`);
  };

  const disconnect = () => {
    if (isRecording) {
      stopRecording();
    }
    setIsConnected(false);
    setIsPlaying(false);
    StorageService.addHistory('stream_stopped', 'Disconnected from stream');
  };

  const startRecording = () => {
    recordingStartTimeRef.current = Date.now();
    setIsRecording(true);
    setRecordingDuration(0);

    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration(Date.now() - recordingStartTimeRef.current);
    }, 1000);

    StorageService.addHistory('recording_started', 'Recording started');
  };

  const stopRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    const duration = Date.now() - recordingStartTimeRef.current;
    StorageService.addHistory('recording_stopped', `Duration: ${formatDuration(duration)}`);
    
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="videocam" size={28} color="#1E88E5" />
          <Text style={styles.headerTitle}>CamStream</Text>
        </View>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.statusDot,
              isConnected ? styles.statusConnected : styles.statusDisconnected,
            ]}
          />
          <TouchableOpacity onPress={() => navigation.navigate('History')} style={styles.headerIcon}>
            <Icon name="history" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Recordings')} style={styles.headerIcon}>
            <Icon name="video-library" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerIcon}>
            <Icon name="settings" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Video Display */}
      <View style={styles.videoContainer}>
        {isConnected && streamUrl ? (
          <>
            <VLCPlayer
              ref={vlcRef}
              style={styles.vlcPlayer}
              source={{ uri: streamUrl }}
              paused={!isPlaying}
              resizeMode="contain"
              onError={(e: any) => {
                console.error('VLC error:', e);
                setError('Stream error');
                setIsConnected(false);
              }}
              onPlaying={() => {
                console.log('VLC playing');
              }}
              onStopped={() => {
                console.log('VLC stopped');
              }}
            />
            {/* Recording Indicator */}
            {isRecording && (
              <View style={styles.recordingOverlay}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>{formatDuration(recordingDuration)}</Text>
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

      {/* Control Bar */}
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

        {/* Record Button */}
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive,
            !isConnected && styles.buttonDisabled,
          ]}
          onPress={toggleRecording}
          disabled={!isConnected}
        >
          <Icon
            name={isRecording ? 'stop' : 'fiber-manual-record'}
            size={32}
            color="#FFF"
          />
        </TouchableOpacity>

        {/* Snapshot Button */}
        <TouchableOpacity
          style={[styles.snapshotButton, !isConnected && styles.buttonDisabled]}
          disabled={!isConnected}
        >
          <Icon name="camera-alt" size={24} color="#FFF" />
          <Text style={styles.snapshotButtonText}>Snapshot</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E1E1E',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  statusDisconnected: {
    backgroundColor: '#F44336',
  },
  headerIcon: {
    padding: 8,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  vlcPlayer: {
    flex: 1,
  },
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
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
    marginRight: 8,
  },
  recordingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  statusText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E88E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#1E1E1E',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E88E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  connectButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E88E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  connectBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  disconnectButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00C853',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: {
    backgroundColor: '#F44336',
  },
  snapshotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  snapshotButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default StreamScreen;