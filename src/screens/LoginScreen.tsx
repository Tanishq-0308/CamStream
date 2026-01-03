import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import StorageService from '../services/StorageService';

interface LoginScreenProps {
  initialIp?: string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ initialIp }) => {
  const { login } = useAuth();

  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadSavedSettings();
  }, []);

const loadSavedSettings = async () => {
  try {
    // Use initialIp if provided, otherwise load from storage
    if (initialIp) {
      setServerUrl(`http://${initialIp}:5000`);
    } else {
      const savedUrl = await StorageService.getServerUrl();
      const savedIp = await StorageService.getCameraIp();
      
      if (savedUrl) {
        setServerUrl(savedUrl);
      } else if (savedIp) {
        setServerUrl(`http://${savedIp}:5000`);
      } else {
        setServerUrl('http://192.168.43.1:5000');
      }
    }

    // Use getStreamCredentials instead of getCredentials
    const credentials = await StorageService.getStreamCredentials();
    setUsername(credentials.username);
    setPassword(credentials.password);
  } catch (error) {
    console.error('Error loading settings:', error);
  }
};

  const handleLogin = async () => {
    if (!serverUrl || !username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      console.log(serverUrl);
      
      await login(serverUrl, username, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Could not connect to camera');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Icon name="videocam" size={60} color="#1E88E5" />
          <Text style={styles.title}>CamStream</Text>
          <Text style={styles.subtitle}>Connect to your camera</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Icon name="dns" size={24} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Server URL"
              placeholderTextColor="#666"
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="person" size={24} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#666"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock" size={24} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Icon
                name={showPassword ? 'visibility-off' : 'visibility'}
                size={24}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="login" size={24} color="#FFF" />
                <Text style={styles.loginButtonText}>Login</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {initialIp && (
          <View style={styles.detectedInfo}>
            <Icon name="check-circle" size={20} color="#4CAF50" />
            <Text style={styles.detectedText}>
              Camera detected at {initialIp}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: '#FFF',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E88E5',
    borderRadius: 12,
    height: 56,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#333',
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  detectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  detectedText: {
    color: '#4CAF50',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default LoginScreen;