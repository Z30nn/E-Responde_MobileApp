import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { fcmService } from '../services/fcmService';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../services/authContext';

const FCMTestButton = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const testFCM = async () => {
    if (!user) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    setIsLoading(true);
    console.log('🧪 FCM TEST: Starting FCM test...');

    try {
      // Test 1: FCM Token
      console.log('🧪 TEST 1: Checking FCM Token...');
      const fcm = fcmService.getInstance();
      const token = await fcm.getFCMToken();
      
      if (!token) {
        console.log('❌ CRITICAL: No FCM token found!');
        Alert.alert('FCM Test', '❌ No FCM token found!\n\nThis means FCM is not initialized properly.\n\nPossible causes:\n1. Google Play Services not installed\n2. Firebase not properly initialized\n3. Device not supported');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ FCM Token found:', token.length, 'characters');
      
      // Test 2: Permissions
      console.log('🧪 TEST 2: Checking Notification Permissions...');
      const hasPermission = await fcm.checkNotificationPermission();
      
      if (!hasPermission) {
        console.log('❌ CRITICAL: Notification permission denied!');
        Alert.alert('FCM Test', '❌ Notification permission denied!\n\nGo to Settings > Apps > E-Responde > Notifications > Allow');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Notification permission granted');
      
      // Test 3: Token Storage
      console.log('🧪 TEST 3: Checking FCM Token Storage...');
      const { db } = await import('../firebaseConfig');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (!userData?.fcmToken) {
        console.log('❌ CRITICAL: FCM token not saved to Firestore!');
        console.log('Saving token now...');
        
        const saved = await fcm.saveFCMTokenToUser(user.uid, token);
        if (!saved) {
          Alert.alert('FCM Test', '❌ Failed to save FCM token to Firestore!\n\nCloud Functions cannot send notifications without this token.');
          setIsLoading(false);
          return;
        }
      }
      
      console.log('✅ FCM token saved in Firestore');
      
      // Test 4: Send Test Notification
      console.log('🧪 TEST 4: Sending Test Push Notification...');
      const result = await notificationService.createTestFCMNotification(user.uid);
      
      if (result) {
        console.log('✅ Test notification sent successfully');
        Alert.alert(
          'FCM Test', 
          '✅ Test notification sent successfully!\n\nNow:\n1. Close the app completely\n2. Wait 15-30 seconds\n3. Check system tray for notification\n\nIf no notification appears, check device settings:\n• Settings > Apps > E-Responde > Notifications > Allow\n• Settings > Battery > Battery Optimization > E-Responde > Don\'t optimize'
        );
      } else {
        console.log('❌ Failed to send test notification');
        Alert.alert('FCM Test', '❌ Failed to send test notification');
      }
      
    } catch (error) {
      console.error('❌ FCM TEST: Error during testing:', error);
      Alert.alert('FCM Test', `❌ Error during testing: ${error.message || error}`);
    }
    
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={testFCM}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing FCM...' : 'Test FCM Push Notifications'}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.instructions}>
        This will test your FCM setup and send a test notification.
        Close the app after testing to check if notifications appear in system tray.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  instructions: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default FCMTestButton;
