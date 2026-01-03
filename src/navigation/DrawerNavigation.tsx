import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

import StreamScreen from '../screens/StreamScreen';
import HistoryScreen from '../screens/HistoryScreen';
import RecordingsScreen from '../screens/RecordingsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import icon from "../../assets/icon.png"

const Drawer = createDrawerNavigator();

interface DrawerItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  isActive?: boolean;
  color?: string;
}

const DrawerItem: React.FC<DrawerItemProps> = ({ icon, label, onPress, isActive, color }) => (
  <TouchableOpacity
    style={[styles.drawerItem, isActive && styles.drawerItemActive]}
    onPress={onPress}
  >
    <Icon name={icon} size={24} color={color || (isActive ? '#1E88E5' : '#AAA')} />
    <Text style={[styles.drawerItemText, isActive && styles.drawerItemTextActive, color && { color }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const { logout, cameraIp } = useAuth();
  const currentRoute = props.state.routeNames[props.state.index];

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.drawerContainer}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerScroll}>
        {/* Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.logoContainer}>
            
                    <Image
                      source={icon}
                      style={styles.logo}
                    />

            {/* <Icon name="videocam" size={40} color="#1E88E5" /> */}
          </View>
          <Text style={styles.appName}>DynaStream</Text>
          {/* <Text style={styles.cameraIp}>{cameraIp || 'Not connected'}</Text> */}
        </View>

        <View style={styles.divider} />

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <DrawerItem
            icon="videocam"
            label="Live Stream"
            isActive={currentRoute === 'Stream'}
            onPress={() => props.navigation.navigate('Stream')}
          />
          <DrawerItem
            icon="video-library"
            label="Recordings"
            isActive={currentRoute === 'Recordings'}
            onPress={() => props.navigation.navigate('Recordings')}
          />
          {/* <DrawerItem
            icon="history"
            label="History"
            isActive={currentRoute === 'History'}
            onPress={() => props.navigation.navigate('History')}
          /> */}
          <DrawerItem
            icon="settings"
            label="Settings"
            isActive={currentRoute === 'Settings'}
            onPress={() => props.navigation.navigate('Settings')}
          />
        </View>
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={styles.drawerFooter}>
        <View style={styles.divider} />
        <DrawerItem
          icon="logout"
          label="Logout"
          color="#F44336"
          onPress={handleLogout}
        />
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </View>
  );
};

const DrawerNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#1E1E1E',
          width: 280,
        },
        drawerType: 'front',
        overlayColor: 'rgba(0, 0, 0, 0.7)',
      }}
    >
      <Drawer.Screen name="Stream" component={StreamScreen} />
      <Drawer.Screen name="Recordings" component={RecordingsScreen} />
      <Drawer.Screen name="History" component={HistoryScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  logo: {
    height: 100,
    width: 150
  },
  drawerScroll: {
    flexGrow: 1,
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  cameraIp: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  menuContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  drawerItemActive: {
    backgroundColor: 'rgba(30, 136, 229, 0.15)',
  },
  drawerItemText: {
    color: '#AAA',
    fontSize: 16,
    marginLeft: 16,
  },
  drawerItemTextActive: {
    color: '#1E88E5',
    fontWeight: '600',
  },
  drawerFooter: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  versionText: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});

export default DrawerNavigator;