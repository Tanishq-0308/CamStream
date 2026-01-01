import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import StorageService from '../services/StorageService';
import { HistoryEntry } from '../types';

const HistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await StorageService.getHistory();
    setHistory(data);
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadHistory();
    setIsRefreshing(false);
  }, []);

  const clearHistory = () => {
    if (history.length === 0) return;

    Alert.alert(
      'Clear History?',
      'This will delete all history entries. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearHistory();
            await loadHistory();
          },
        },
      ]
    );
  };

  const getActionIcon = (action: string): { name: string; color: string } => {
    switch (action) {
      case 'stream_started':
        return { name: 'play-arrow', color: '#1E88E5' };
      case 'stream_stopped':
        return { name: 'stop', color: '#00C853' };
      case 'recording_started':
        return { name: 'fiber-manual-record', color: '#F44336' };
      case 'recording_stopped':
        return { name: 'stop-circle', color: '#FF9800' };
      case 'settings_changed':
        return { name: 'settings', color: '#00C853' };
      case 'module_toggled':
        return { name: 'extension', color: '#1E88E5' };
      case 'login':
        return { name: 'login', color: '#1E88E5' };
      case 'logout':
        return { name: 'logout', color: '#F44336' };
      default:
        return { name: 'info', color: '#999' };
    }
  };

  const formatActionTitle = (action: string): string => {
    switch (action) {
      case 'stream_started':
        return 'Stream Started';
      case 'stream_stopped':
        return 'Stream Stopped';
      case 'recording_started':
        return 'Recording Started';
      case 'recording_stopped':
        return 'Recording Stopped';
      case 'settings_changed':
        return 'Settings Changed';
      case 'module_toggled':
        return 'Module Toggled';
      case 'login':
        return 'Logged In';
      case 'logout':
        return 'Logged Out';
      default:
        return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  const getDateGroup = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    if (diff < oneDay) return 'Today';
    if (diff < 2 * oneDay) return 'Yesterday';
    if (diff < oneWeek) return 'This Week';

    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group history by date
  const groupedHistory = history.reduce((groups, entry) => {
    const group = getDateGroup(entry.timestamp);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(entry);
    return groups;
  }, {} as Record<string, HistoryEntry[]>);

  const sections = Object.entries(groupedHistory).map(([title, data]) => ({
    title,
    data,
  }));

  const renderHistoryItem = ({ item }: { item: HistoryEntry }) => {
    const { name, color } = getActionIcon(item.action);
    return (
      <View style={styles.historyItem}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}33` }]}>
          <Icon name={name} size={20} color={color} />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.actionTitle}>{formatActionTitle(item.action)}</Text>
          {item.details && (
            <Text style={styles.actionDetails} numberOfLines={1}>
              {item.details}
            </Text>
          )}
        </View>
        <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
      </View>
    );
  };

  const renderSectionHeader = (title: string) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="history" size={64} color="#444" />
      <Text style={styles.emptyTitle}>No history yet</Text>
      <Text style={styles.emptySubtitle}>Your actions will appear here</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
            <Icon name="delete-sweep" size={24} color="#F44336" />
          </TouchableOpacity>
        )}
      </View>

      {/* History List */}
      {history.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.title}
          renderItem={({ item: section }) => (
            <View>
              {renderSectionHeader(section.title)}
              {section.data.map((entry) => (
                <View key={entry.id}>{renderHistoryItem({ item: entry })}</View>
              ))}
            </View>
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#1E88E5" />
          }
        />
      )}
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
  clearButton: {
    padding: 8,
  },
  list: {
    padding: 16,
  },
  sectionHeader: {
    color: '#1E88E5',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  actionDetails: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  timeText: {
    color: '#666',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
});

export default HistoryScreen;
