import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import useNotifications from './src/hooks/useNotifications';

const AppContent: React.FC = () => {
  const { isLoggedIn } = useAuth();
  useNotifications(isLoggedIn);
  return <AppNavigator />;
};

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{flex:1}}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default App;