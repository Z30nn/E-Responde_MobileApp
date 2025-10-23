import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../services/authContext';
import { fcmService } from '../services/fcmService';
import { notificationService } from '../services/notificationService';

const SimpleFCMDiagnostic = () => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
  };

  const clearLogs = () => setLogs([]);

  const testFCMToken = async () => {
    setIsRunning(true);
    addLog('🔍 Testing FCM Token...');
    
    try {
      const token = await fcmService.getFCMToken();
      
      if (token) {
        addLog(`✅ FCM Token found: ${token.length} characters`);
        addLog(`Token preview: ${token.substring(0, 30)}...`);
      } else {
        addLog('❌ CRITICAL: No FCM token found!');
        addLog('FCM is not initialized properly');
      }
    } catch (error) {
      addLog(`❌ Error getting FCM token: ${error}`);
    }
    
    setIsRunning(false);
  };

  const testPermissions = async () => {
    setIsRunning(true);
    addLog('🔍 Testing Notification Permissions...');
    
    try {
      const hasPermission = await fcmService.checkNotificationPermission();
      
      if (hasPermission) {
        addLog('✅ Notification permission granted');
      } else {
        addLog('❌ CRITICAL: Notification permission denied!');
        addLog('Go to Settings > Apps > E-Responde > Notifications > Allow');
      }
    } catch (error) {
      addLog(`❌ Error checking permissions: ${error}`);
    }
    
    setIsRunning(false);
  };

  const testTokenStorage = async () => {
    if (!user) {
      addLog('❌ No user logged in');
      return;
    }

    setIsRunning(true);
    addLog('🔍 Testing FCM Token Storage...');
    
    try {
      const { db } = await import('../firebaseConfig');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (userData?.fcmToken) {
        addLog(`✅ FCM token saved in Firestore: ${userData.fcmToken.length} characters`);
      } else {
        addLog('❌ CRITICAL: FCM token not saved to Firestore!');
        addLog('Cloud Functions cannot send notifications without this token');
        
        // Try to save the token
        const token = await fcmService.getFCMToken();
        if (token) {
          addLog('🔧 Attempting to save FCM token...');
          const saved = await fcmService.saveFCMTokenToUser(user.uid, token);
          if (saved) {
            addLog('✅ FCM token saved successfully');
          } else {
            addLog('❌ Failed to save FCM token');
          }
        }
      }
    } catch (error) {
      addLog(`❌ Error checking token storage: ${error}`);
    }
    
    setIsRunning(false);
  };

  const testPushNotification = async () => {
    if (!user) {
      addLog('❌ No user logged in');
      return;
    }

    setIsRunning(true);
    addLog('🧪 Testing Push Notification...');
    addLog('Close the app after sending to test background notifications');
    
    try {
      const result = await notificationService.createTestFCMNotification(user.uid);
      
      if (result) {
        addLog('✅ Test notification sent successfully');
        addLog('Check system tray for notification');
      } else {
        addLog('❌ Failed to send test notification');
      }
    } catch (error) {
      addLog(`❌ Error sending test notification: ${error}`);
    }
    
    setIsRunning(false);
  };

  const runFullTest = async () => {
    clearLogs();
    addLog('🚀 Starting Full FCM Test...');
    
    await testFCMToken();
    await testPermissions();
    await testTokenStorage();
    await testPushNotification();
    
    addLog('🏁 Full FCM test completed');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FCM Diagnostic</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testFCMToken} disabled={isRunning}>
          <Text style={styles.buttonText}>Test FCM Token</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testPermissions} disabled={isRunning}>
          <Text style={styles.buttonText}>Test Permissions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testTokenStorage} disabled={isRunning}>
          <Text style={styles.buttonText}>Test Token Storage</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testPushNotification} disabled={isRunning}>
          <Text style={styles.buttonText}>Test Push Notification</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.fullTestButton]} onPress={runFullTest} disabled={isRunning}>
          <Text style={styles.buttonText}>Run Full Test</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearLogs} disabled={isRunning}>
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.logsContainer}>
        <Text style={styles.logsTitle}>Diagnostic Logs:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
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
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 8,
  },
  logsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logText: {
    color: '#00ff00',
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});

export default SimpleFCMDiagnostic;
