import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import StorageService from '../services/StorageService';
import { HistoryEntry } from '../types';
import TTSService from '../services/TTSService';

const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await StorageService.getHistory();
    console.log("Hello , this is a test notificaiton");
    
    await TTSService.speak("Hello, this is a test notificatioin");
    await TTSService.setRate(0.8);
    await TTSService.setLanguage('en-US');
    setHistory(data);
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadHistory();
    setIsRefreshing(false);
  }, []);

  const clearHistory = () => {
    Alert.alert('Clear History', 'Delete all history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await StorageService.clearHistory();
          loadHistory();
        },
      },
    ]);
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const getIconForAction = (action: string) => {
    switch (action) {
      case 'login': return 'login';
      case 'logout': return 'logout';
      case 'stream_started': return 'play-circle-filled';
      case 'stream_stopped': return 'stop-circle';
      case 'recording_started': return 'fiber-manual-record';
      case 'recording_stopped': return 'stop';
      case 'settings_changed': return 'settings';
      case 'module_toggled': return 'extension';
      default: return 'info';
    }
  };

  const getColorForAction = (action: string) => {
    switch (action) {
      case 'login': return '#4CAF50';
      case 'logout': return '#F44336';
      case 'stream_started': return '#1E88E5';
      case 'stream_stopped': return '#FF9800';
      case 'recording_started': return '#F44336';
      case 'recording_stopped': return '#4CAF50';
      default: return '#1E88E5';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderItem = ({ item }: { item: HistoryEntry }) => (
    <View style={styles.historyItem}>
      <View style={[styles.iconContainer, { backgroundColor: getColorForAction(item.action) + '20' }]}>
        <Icon name={getIconForAction(item.action)} size={20} color={getColorForAction(item.action)} />
      </View>
      <View style={styles.historyContent}>
        <Text style={styles.historyAction}>{item.action.replace(/_/g, ' ').toUpperCase()}</Text>
        {item.details && <Text style={styles.historyDetails}>{item.details}</Text>}
        <Text style={styles.historyTime}>{formatTime(item.timestamp)}</Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Icon name="history" size={64} color="#666" />
      <Text style={styles.emptyTitle}>No history yet</Text>
      <Text style={styles.emptyText}>Your activity will appear here</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />

      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
          <Icon name="menu" size={28} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Icon name="history" size={24} color="#1E88E5" />
          <Text style={styles.headerTitle}>History</Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
            <Icon name="delete-sweep" size={24} color="#F44336" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={history.length === 0 ? styles.emptyList : styles.list}
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
  list: { padding: 16 },
  emptyList: { flex: 1 },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: { flex: 1 },
  historyAction: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  historyDetails: { color: '#AAA', fontSize: 12, marginTop: 2 },
  historyTime: { color: '#666', fontSize: 11, marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyText: { color: '#666', fontSize: 14, marginTop: 8 },
});

export default HistoryScreen;