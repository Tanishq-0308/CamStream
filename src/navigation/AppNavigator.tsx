import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import DrawerNavigator from './DrawerNavigation';

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View style={styles.loading}>
    <StatusBar barStyle="light-content" backgroundColor="#121212" />
    <ActivityIndicator size="large" color="#1E88E5" />
  </View>
);

const AppNavigator: React.FC = () => {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" translucent={false} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isLoggedIn ? (
            <Stack.Screen name="Main" component={DrawerNavigator} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
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