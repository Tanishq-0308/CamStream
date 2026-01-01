import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import { useNavigation } from '@react-navigation/native';
import StorageService from '../services/StorageService';
import { Recording } from '../types';

const RecordingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    const data = await StorageService.getRecordings();
    setRecordings(data);
    const size = data.reduce((sum, r) => sum + r.fileSize, 0);
    setTotalSize(size);
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadRecordings();
    setIsRefreshing(false);
  }, []);

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

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1_000_000_000) {
      return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
    }
    if (bytes >= 1_000_000) {
      return `${(bytes / 1_000_000).toFixed(1)} MB`;
    }
    if (bytes >= 1_000) {
      return `${(bytes / 1_000).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const deleteRecording = async (recording: Recording) => {
    Alert.alert(
      'Delete Recording?',
      `Delete "${recording.filename}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete file
              const exists = await RNFS.exists(recording.filepath);
              if (exists) {
                await RNFS.unlink(recording.filepath);
              }
              // Remove from storage
              await StorageService.deleteRecording(recording.id);
              await loadRecordings();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const deleteAllRecordings = () => {
    if (recordings.length === 0) return;

    Alert.alert(
      'Delete All Recordings?',
      `This will permanently delete all ${recordings.length} recordings (${formatFileSize(totalSize)}). This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all files
              for (const recording of recordings) {
                const exists = await RNFS.exists(recording.filepath);
                if (exists) {
                  await RNFS.unlink(recording.filepath);
                }
              }
              // Clear storage
              await StorageService.clearRecordings();
              await loadRecordings();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const shareRecording = async (recording: Recording) => {
    try {
      const exists = await RNFS.exists(recording.filepath);
      if (!exists) {
        Alert.alert('Error', 'File not found');
        return;
      }
      await Share.share({
        url: `file://${recording.filepath}`,
        title: recording.filename,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderRecording = ({ item }: { item: Recording }) => (
    <View style={styles.recordingItem}>
      <View style={styles.recordingThumbnail}>
        <Icon name="videocam" size={28} color="#1E88E5" />
      </View>
      <View style={styles.recordingInfo}>
        <Text style={styles.recordingFilename} numberOfLines={1}>
          {item.filename}
        </Text>
        <Text style={styles.recordingMeta}>
          {formatDuration(item.duration)} • {formatFileSize(item.fileSize)}
        </Text>
        <Text style={styles.recordingDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <View style={styles.recordingActions}>
        <TouchableOpacity onPress={() => shareRecording(item)} style={styles.actionButton}>
          <Icon name="share" size={22} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteRecording(item)} style={styles.actionButton}>
          <Icon name="delete" size={22} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="video-library" size={64} color="#444" />
      <Text style={styles.emptyTitle}>No recordings yet</Text>
      <Text style={styles.emptySubtitle}>Start streaming and tap record</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recordings</Text>
        {recordings.length > 0 && (
          <TouchableOpacity onPress={deleteAllRecordings} style={styles.deleteAllButton}>
            <Icon name="delete-sweep" size={24} color="#F44336" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Header */}
      {recordings.length > 0 && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{recordings.length}</Text>
            <Text style={styles.statLabel}>Recordings</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatFileSize(totalSize)}</Text>
            <Text style={styles.statLabel}>Total Size</Text>
          </View>
        </View>
      )}

      {/* Recordings List */}
      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        renderItem={renderRecording}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={recordings.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#1E88E5" />
        }
      />
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
  deleteAllButton: {
    padding: 8,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    backgroundColor: '#1E3A5F',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#999',
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  recordingThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#2A3A4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recordingFilename: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  recordingMeta: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  recordingDate: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  recordingActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
});

export default RecordingsScreen;
