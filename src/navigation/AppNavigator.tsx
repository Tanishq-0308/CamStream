import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import PinSetupScreen from '../screens/PinSetupScreen';
import DrawerNavigator from './DrawerNavigation';
import StorageService from '../services/StorageService';

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View style={styles.loading}>
    <StatusBar barStyle="light-content" backgroundColor="#121212" />
    <ActivityIndicator size="large" color="#1E88E5" />
  </View>
);

const AppNavigator: React.FC = () => {
  const { isLoggedIn, isLoading } = useAuth();
  const [showPinSetup, setShowPinSetup] = useState(true);
  const [detectedIp, setDetectedIp] = useState<string | null>(null);
  const [checkingPreviousSetup, setCheckingPreviousSetup] = useState(true);

  useEffect(() => {
    checkPreviousSetup();
  }, []);

  // Reset to PIN screen when logged out
  useEffect(() => {
    if (!isLoggedIn && !isLoading && !checkingPreviousSetup) {
      setShowPinSetup(true);
      setDetectedIp(null);
    }
  }, [isLoggedIn, isLoading, checkingPreviousSetup]);

  const checkPreviousSetup = async () => {
    try {
      const savedIp = await StorageService.getCameraIp();
      // Only skip PIN if logged in AND have saved IP
      const savedToken = await StorageService.getToken();
      
      if (savedIp && savedToken) {
        setDetectedIp(savedIp);
        setShowPinSetup(false);
      }
    } catch (error) {
      console.error('Error checking previous setup:', error);
    } finally {
      setCheckingPreviousSetup(false);
    }
  };

  const handlePinSetupComplete = (ip: string) => {
    setDetectedIp(ip);
    setShowPinSetup(false);
  };

  const handleSkipSetup = () => {
    setShowPinSetup(false);
  };

  if (isLoading || checkingPreviousSetup) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" translucent={false} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isLoggedIn ? (
            <Stack.Screen name="Main" component={DrawerNavigator} />
          ) : showPinSetup ? (
            <Stack.Screen name="PinSetup">
              {() => (
                <PinSetupScreen
                  onComplete={handlePinSetupComplete}
                  onSkip={handleSkipSetup}
                />
              )}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Login">
              {() => <LoginScreen initialIp={detectedIp} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});

export default AppNavigator;