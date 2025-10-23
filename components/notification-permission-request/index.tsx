import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { fcmService } from '../../services/fcmService';

interface NotificationPermissionRequestProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

const NotificationPermissionRequest: React.FC<NotificationPermissionRequestProps> = ({
  onPermissionGranted,
  onPermissionDenied
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const permission = await fcmService.checkNotificationPermission();
      setHasPermission(permission);
    } catch (error) {
      console.error('Error checking notification permission:', error);
    }
  };

  const requestPermission = async () => {
    setIsRequesting(true);
    try {
      console.log('NotificationPermissionRequest: Requesting permission...');
      const granted = await fcmService.requestUserPermission();
      
      if (granted) {
        console.log('NotificationPermissionRequest: ✅ Permission granted');
        setHasPermission(true);
        onPermissionGranted?.();
      } else {
        console.log('NotificationPermissionRequest: ❌ Permission denied');
        setHasPermission(false);
        onPermissionDenied?.();
      }
    } catch (error) {
      console.error('NotificationPermissionRequest: Error requesting permission:', error);
      setHasPermission(false);
      onPermissionDenied?.();
    } finally {
      setIsRequesting(false);
    }
  };

  const showSettingsGuidance = () => {
    Alert.alert(
      'Enable Notifications',
      'To receive emergency alerts and important updates, please enable notifications for E-Responde in your device settings.\n\n1. Go to Settings\n2. Tap Apps & notifications\n3. Find E-Responde\n4. Tap Notifications\n5. Turn on "Allow notifications"',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: () => {} }
      ]
    );
  };

  if (hasPermission === true) {
    return (
      <View style={styles.container}>
        <Text style={styles.successText}>✅ Notifications enabled</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔔 Enable Notifications</Text>
      <Text style={styles.description}>
        E-Responde needs notification access to send emergency alerts and keep you informed of important updates.
      </Text>
      
      <TouchableOpacity
        style={[styles.button, isRequesting && styles.buttonDisabled]}
        onPress={requestPermission}
        disabled={isRequesting}
      >
        <Text style={styles.buttonText}>
          {isRequesting ? 'Requesting...' : 'Allow Notifications'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={showSettingsGuidance}
      >
        <Text style={styles.settingsButtonText}>Manual Setup Guide</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  settingsButton: {
    padding: 10,
  },
  settingsButtonText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 14,
  },
  successText: {
    color: '#4CAF50',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NotificationPermissionRequest;
