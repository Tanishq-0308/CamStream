import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import HotspotService from '../services/HotspotService';
import StorageService from '../services/StorageService';
import icon from "../../assets/icon.png"

interface PinSetupScreenProps {
  onComplete: (ip: string) => void;
  onSkip: () => void;
}

type SetupStep = 'enter_pin' | 'setup_hotspot' | 'finding' | 'error';

const PinSetupScreen: React.FC<PinSetupScreenProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState<SetupStep>('enter_pin');
  const [pin, setPin] = useState(['', '', '', '']);
  const [hotspotCredentials, setHotspotCredentials] = useState({ ssid: '', password: '' });
  const [errorMessage, setErrorMessage] = useState('');

  const inputRefs = useRef<any[]>([]);

  const handlePinChange = (value: string, index: number) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleaned.length > 1) return;

    const newPin = [...pin];
    newPin[index] = cleaned;
    setPin(newPin);

    if (cleaned && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const isPinComplete = () => pin.every((digit) => digit !== '');

  const handleContinue = () => {
    if (!isPinComplete()) {
      Alert.alert('Error', 'Please enter complete 4-character PIN');
      return;
    }

    const fullPin = pin.join('');
    const credentials = HotspotService.generateHotspotCredentials(fullPin);
    setHotspotCredentials(credentials);
    setStep('setup_hotspot');
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const openHotspotSettings = async () => {
    await HotspotService.openHotspotSettings();
  };

  const handleDeviceConnected = async () => {
    setStep('finding');

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Finding cam device (attempt ${attempt}/3)...`);

      const ip = await HotspotService.findCamDevice();

      if (ip) {
        console.log(`Found cam at: ${ip}`);
        await StorageService.saveCameraIp(ip);
        await StorageService.saveServerUrl(`http://${ip}:5000`);
        onComplete(ip);
        return;
      }

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    setErrorMessage(
      'Could not find camera.\n\n' +
      'Make sure:\n' +
      '• Hotspot is ON\n' +
      '• Camera is connected to hotspot\n' +
      '• Camera server is running'
    );
    setStep('error');
  };

  const handleRetry = () => {
    setErrorMessage('');
    setStep('setup_hotspot');
  };

  const renderEnterPin = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.stepContainer}>
        <Icon name="pin" size={60} color="#1E88E5" />
        <Text style={styles.title}>Enter Camera PIN</Text>
        <Text style={styles.subtitle}>
          Enter the 4-character code on your camera
        </Text>

        <View style={styles.pinContainer}>
          {pin.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                if (ref) inputRefs.current[index] = ref;
              }}
              style={styles.pinInput}
              value={digit}
              onChangeText={(value) => handlePinChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="default"
              autoCapitalize="characters"
              maxLength={1}
              autoFocus={index === 0}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, !isPinComplete() && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!isPinComplete()}
        >
          <Text style={styles.buttonText}>Continue</Text>
          <Icon name="arrow-forward" size={24} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipText}>Skip & Enter IP Manually</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderSetupHotspot = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.stepContainer}>
        <Icon name="wifi-tethering" size={60} color="#FF9800" />
        <Text style={styles.title}>Setup Hotspot</Text>
        <Text style={styles.subtitle}>Create hotspot with these credentials:</Text>

        <View style={styles.credentialsCard}>
          <TouchableOpacity
            style={styles.credentialRow}
            onPress={() => copyToClipboard(hotspotCredentials.ssid, 'Hotspot name')}
            activeOpacity={0.7}
          >
            <Text style={styles.credentialLabel}>Hotspot Name (tap to copy)</Text>
            <View style={styles.credentialValueRow}>
              <Text style={styles.credentialValue}>{hotspotCredentials.ssid}</Text>
              <Icon name="content-copy" size={20} color="#1E88E5" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.credentialRow}
            onPress={() => copyToClipboard(hotspotCredentials.password, 'Password')}
            activeOpacity={0.7}
          >
            <Text style={styles.credentialLabel}>Password (tap to copy)</Text>
            <View style={styles.credentialValueRow}>
              <Text style={styles.credentialValue}>{hotspotCredentials.password}</Text>
              <Icon name="content-copy" size={20} color="#1E88E5" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={openHotspotSettings}>
          <Icon name="settings" size={24} color="#FFF" />
          <Text style={styles.buttonText}>Open Hotspot Settings</Text>
        </TouchableOpacity>

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Steps:</Text>
          <Text style={styles.instructionsText}>1. Create hotspot with above name & password</Text>
          <Text style={styles.instructionsText}>2. Wait for camera to connect</Text>
          <Text style={styles.instructionsText}>3. Tap "Find Camera" below</Text>
        </View>

        <TouchableOpacity style={styles.connectedButton} onPress={handleDeviceConnected}>
          <Icon name="search" size={24} color="#FFF" />
          <Text style={styles.buttonText}>Find Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipText}>Skip & Enter IP Manually</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderFinding = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#1E88E5" />
      <Text style={styles.title}>Finding Camera...</Text>
      <Text style={styles.subtitle}>Scanning network for camera server</Text>
    </View>
  );

  const renderError = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepContainer}>
        <Icon name="error" size={80} color="#F44336" />
        <Text style={styles.title}>Not Found</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
          <Icon name="refresh" size={24} color="#FFF" />
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipText}>Skip & Enter IP Manually</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      <View style={styles.header}>
        <Image
          source={icon}
          style={styles.logo}
        />
        {/* <Icon name="videocam" size={40} color="#1E88E5" />
        <Text style={styles.headerTitle}>CamStream Setup</Text> */}
      </View>

      {step === 'enter_pin' && renderEnterPin()}
      {step === 'setup_hotspot' && renderSetupHotspot()}
      {step === 'finding' && renderFinding()}
      {step === 'error' && renderError()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  logo: {
    height: 200,
    width: 250
  },
  header: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    color: '#999',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  pinContainer: {
    flexDirection: 'row',
    marginTop: 40,
    marginBottom: 40,
  },
  pinInput: {
    width: 60,
    height: 70,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginHorizontal: 8,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  credentialsCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginTop: 24,
  },
  credentialRow: {
    paddingVertical: 12,
  },
  credentialLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 6,
  },
  credentialValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  credentialValue: {
    color: '#1E88E5',
    fontSize: 22,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 8,
  },
  instructionsCard: {
    backgroundColor: '#1A2634',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 20,
  },
  instructionsTitle: {
    color: '#1E88E5',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  instructionsText: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 6,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E88E5',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    marginTop: 20,
  },
  connectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#333',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  skipButton: {
    marginTop: 24,
    padding: 12,
    marginBottom: 20,
  },
  skipText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default PinSetupScreen;