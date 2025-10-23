import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { fcmService } from '../services/fcmService';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../services/authContext';

const FCMDiagnostic = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = isError ? '❌' : '✅';
    setResults(prev => [...prev, `${timestamp} ${prefix} ${message}`]);
  };

  const clearResults = () => setResults([]);

  const testFCMToken = async () => {
    setIsLoading(true);
    addResult('Testing FCM Token...');
    
    try {
      const fcm = fcmService.getInstance();
      const token = await fcm.getFCMToken();
      
      if (token) {
        addResult(`FCM Token found: ${token.length} characters`);
        addResult(`Token preview: ${token.substring(0, 30)}...`);
      } else {
        addResult('CRITICAL: No FCM token found!', true);
        addResult('FCM is not initialized properly', true);
      }
    } catch (error) {
      addResult(`Error getting FCM token: ${error}`, true);
    }
    
    setIsLoading(false);
  };

  const testPermissions = async () => {
    setIsLoading(true);
    addResult('Testing Notification Permissions...');
    
    try {
      const fcm = fcmService.getInstance();
      const hasPermission = await fcm.checkNotificationPermission();
      
      if (hasPermission) {
        addResult('Notification permission granted');
      } else {
        addResult('CRITICAL: Notification permission denied!', true);
        addResult('Go to Settings > Apps > E-Responde > Notifications > Allow', true);
      }
    } catch (error) {
      addResult(`Error checking permissions: ${error}`, true);
    }
    
    setIsLoading(false);
  };

  const testTokenStorage = async () => {
    if (!user) {
      addResult('No user logged in', true);
      return;
    }

    setIsLoading(true);
    addResult('Testing FCM Token Storage...');
    
    try {
      const { db } = await import('../firebaseConfig');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (userData?.fcmToken) {
        addResult(`Token saved in Firestore: ${userData.fcmToken.length} characters`);
      } else {
        addResult('CRITICAL: FCM token not saved to Firestore!', true);
        addResult('Cloud Functions cannot send notifications without this token', true);
      }
    } catch (error) {
      addResult(`Error checking token storage: ${error}`, true);
    }
    
    setIsLoading(false);
  };

  const testNotificationChannels = async () => {
    setIsLoading(true);
    addResult('Testing Notification Channels...');
    
    try {
      const fcm = fcmService.getInstance();
      await fcm.createNotificationChannels();
      addResult('Notification channels created');
    } catch (error) {
      addResult(`Error creating channels: ${error}`, true);
    }
    
    setIsLoading(false);
  };

  const testPushNotification = async () => {
    if (!user) {
      addResult('No user logged in', true);
      return;
    }

    setIsLoading(true);
    addResult('Testing Push Notification...');
    addResult('Close the app after sending to test background notifications');
    
    try {
      const result = await notificationService.createTestFCMNotification(user.uid);
      
      if (result) {
        addResult('Test notification sent successfully');
        addResult('Check system tray for notification');
      } else {
        addResult('Failed to send test notification', true);
      }
    } catch (error) {
      addResult(`Error sending test notification: ${error}`, true);
    }
    
    setIsLoading(false);
  };

  const runFullDiagnostic = async () => {
    clearResults();
    addResult('🚀 Starting Full FCM Diagnostic...');
    
    await testFCMToken();
    await testPermissions();
    await testTokenStorage();
    await testNotificationChannels();
    await testPushNotification();
    
    addResult('🏁 Full FCM diagnostic completed');
  };

  const checkDeviceSettings = () => {
    Alert.alert(
      'Device Settings Checklist',
      '1. Settings > Apps > E-Responde > Notifications > Allow\n' +
      '2. Settings > Battery > Battery Optimization > E-Responde > Don\'t optimize\n' +
      '3. Settings > Apps > E-Responde > Permissions > All granted\n' +
      '4. Check notification channels are enabled',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FCM Diagnostic Tool</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testFCMToken} disabled={isLoading}>
          <Text style={styles.buttonText}>Test FCM Token</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testPermissions} disabled={isLoading}>
          <Text style={styles.buttonText}>Test Permissions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testTokenStorage} disabled={isLoading}>
          <Text style={styles.buttonText}>Test Token Storage</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testNotificationChannels} disabled={isLoading}>
          <Text style={styles.buttonText}>Test Channels</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testPushNotification} disabled={isLoading}>
          <Text style={styles.buttonText}>Test Push Notification</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.fullTestButton]} onPress={runFullDiagnostic} disabled={isLoading}>
          <Text style={styles.buttonText}>Run Full Diagnostic</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.settingsButton]} onPress={checkDeviceSettings} disabled={isLoading}>
          <Text style={styles.buttonText}>Check Device Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearResults} disabled={isLoading}>
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Diagnostic Results:</Text>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>{result}</Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  fullTestButton: {
    backgroundColor: '#34C759',
  },
  settingsButton: {
    backgroundColor: '#FF9500',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 8,
  },
  resultsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    color: '#00ff00',
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});

export default FCMDiagnostic;
