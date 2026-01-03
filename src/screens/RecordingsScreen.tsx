import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import RecordingService, { Recording } from '../services/RecordingService';

const RecordingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      const data = await RecordingService.getRecordings();
      setRecordings(data);
    } catch (e) {
      console.error('Failed to load recordings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadRecordings();
    setIsRefreshing(false);
  }, []);

  const playRecording = async (recording: Recording) => {
    if (playingId) return;

    setPlayingId(recording.id);

    try {
      if (recording.size === 0) {
        Alert.alert('Error', 'Recording file is empty');
        return;
      }

      // Small delay to ensure file is ready
      await new Promise(resolve => setTimeout(resolve, 300));

      await RecordingService.playVideo(recording.path);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to play: ' + e.message);
    } finally {
      setTimeout(() => setPlayingId(null), 1000);
    }
  };

  const deleteRecording = (recording: Recording) => {
    Alert.alert('Delete Recording', `Delete "${recording.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await RecordingService.deleteRecording(recording.path);
          loadRecordings();
        },
      },
    ]);
  };

  const clearAll = () => {
    if (recordings.length === 0) return;

    Alert.alert('Delete All', 'Delete all recordings?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: async () => {
          await RecordingService.deleteAllRecordings();
          loadRecordings();
        },
      },
    ]);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const renderRecording = ({ item }: { item: Recording }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => playRecording(item)}
      disabled={playingId === item.id}
    >
      <View style={styles.thumbnail}>
        {playingId === item.id ? (
          <ActivityIndicator color="#1E88E5" />
        ) : (
          <Icon name="play-circle-filled" size={48} color="#1E88E5" />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.filename} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.date}>{formatDate(item.timestamp)}</Text>
        <Text style={styles.size}>{RecordingService.formatSize(item.size)}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => deleteRecording(item)}>
          <Icon name="delete" size={22} color="#F44336" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Icon name="videocam-off" size={64} color="#666" />
      <Text style={styles.emptyTitle}>No recordings yet</Text>
      <Text style={styles.emptyText}>Press the record button while streaming</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />
        <ActivityIndicator size="large" color="#1E88E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />

      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
          <Icon name="menu" size={28} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Icon name="video-library" size={24} color="#1E88E5" />
          <Text style={styles.headerTitle}>Recordings</Text>
        </View>
        {recordings.length > 0 && (
          <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
            <Icon name="delete-sweep" size={24} color="#F44336" />
          </TouchableOpacity>
        )}
      </View>

      {recordings.length > 0 && (
        <View style={styles.stats}>
          <Text style={styles.statsText}>
            {recordings.length} recording{recordings.length !== 1 ? 's' : ''} •{' '}
            {RecordingService.formatSize(recordings.reduce((acc, r) => acc + r.size, 0))}
          </Text>
        </View>
      )}

      <FlatList
        data={recordings}
        renderItem={renderRecording}
        keyExtractor={(item) => item.id}
        contentContainerStyle={recordings.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#1E88E5" />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
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
  clearBtn: { padding: 8 },
  stats: { backgroundColor: '#1E1E1E', paddingHorizontal: 16, paddingBottom: 12 },
  statsText: { color: '#888', fontSize: 12 },
  list: { padding: 16 },
  emptyList: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderRadius: 8,
  },
  info: { flex: 1, marginLeft: 12 },
  filename: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  date: { color: '#888', fontSize: 12, marginTop: 2 },
  size: { color: '#666', fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row' },
  actionBtn: { padding: 8 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyText: { color: '#666', fontSize: 14, marginTop: 8, textAlign: 'center' },
});

export default RecordingsScreen;