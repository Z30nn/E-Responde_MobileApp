import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { fcmService } from '../../services/fcmService';
import NotificationPermissionRequest from '../../components/notification-permission-request';

const TestNotifications = () => {
  const [permissionStatus, setPermissionStatus] = useState<string>('Checking...');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      // Check permission status
      const hasPermission = await fcmService.checkNotificationPermission();
      setPermissionStatus(hasPermission ? '✅ Granted' : '❌ Denied');
      
      // Get FCM token
      const token = await fcmService.getCurrentToken();
      setFcmToken(token);
    } catch (error) {
      console.error('Error checking status:', error);
      setPermissionStatus('❌ Error');
    } finally {
      setIsLoading(false);
    }
  };

  const testPermissionRequest = async () => {
    try {
      console.log('Testing permission request...');
      const granted = await fcmService.requestUserPermission();
      Alert.alert(
        'Permission Request Result',
        granted ? 'Permission granted!' : 'Permission denied',
        [{ text: 'OK' }]
      );
      checkStatus();
    } catch (error) {
      console.error('Error testing permission request:', error);
      Alert.alert('Error', 'Failed to request permission');
    }
  };

  const testNotificationFlow = async () => {
    try {
      await fcmService.testNotificationFlow();
      Alert.alert('Test Complete', 'Check console logs for results');
    } catch (error) {
      console.error('Error testing notification flow:', error);
      Alert.alert('Error', 'Failed to test notification flow');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔔 Notification Permission Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <Text style={styles.statusText}>Permission: {permissionStatus}</Text>
        <Text style={styles.statusText}>FCM Token: {fcmToken ? '✅ Available' : '❌ Not Available'}</Text>
        {fcmToken && (
          <Text style={styles.tokenText}>Token: {fcmToken.substring(0, 20)}...</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Actions</Text>
        
        <TouchableOpacity style={styles.button} onPress={checkStatus} disabled={isLoading}>
          <Text style={styles.buttonText}>
            {isLoading ? 'Checking...' : 'Refresh Status'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testPermissionRequest}>
          <Text style={styles.buttonText}>Test Permission Request</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testNotificationFlow}>
          <Text style={styles.buttonText}>Test Notification Flow</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permission Request Component</Text>
        <NotificationPermissionRequest
          onPermissionGranted={() => {
            Alert.alert('Success', 'Permission granted!');
            checkStatus();
          }}
          onPermissionDenied={() => {
            Alert.alert('Denied', 'Permission denied');
            checkStatus();
          }}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  tokenText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default TestNotifications;
