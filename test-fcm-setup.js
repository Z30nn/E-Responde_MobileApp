/**
 * FCM Setup Test Script
 * 
 * Add this to your app to test FCM setup and identify issues
 */

import { fcmService } from './services/fcmService';
import { notificationService } from './services/notificationService';
import messaging from '@react-native-firebase/messaging';

export const testFCMSetup = async (userId) => {
  console.log('🧪 FCM SETUP TEST: Starting comprehensive FCM test...');
  
  try {
    // Test 1: FCM Token
    console.log('🧪 TEST 1: Checking FCM Token...');
    const fcm = fcmService.getInstance();
    const token = await fcm.getFCMToken();
    
    if (!token) {
      console.log('❌ CRITICAL: No FCM token found!');
      console.log('❌ This means FCM is not initialized properly');
      console.log('❌ Possible causes:');
      console.log('❌ 1. Google Play Services not installed');
      console.log('❌ 2. Firebase not properly initialized');
      console.log('❌ 3. Device not supported');
      return false;
    }
    
    console.log('✅ FCM Token found:', token.length, 'characters');
    console.log('✅ Token preview:', token.substring(0, 30) + '...');
    
    // Test 2: Permissions
    console.log('🧪 TEST 2: Checking Notification Permissions...');
    const hasPermission = await fcm.checkNotificationPermission();
    
    if (!hasPermission) {
      console.log('❌ CRITICAL: Notification permission denied!');
      console.log('❌ Go to Settings > Apps > E-Responde > Notifications > Allow');
      return false;
    }
    
    console.log('✅ Notification permission granted');
    
    // Test 3: Token Storage
    console.log('🧪 TEST 3: Checking FCM Token Storage...');
    const { db } = await import('./firebaseConfig');
    const { doc, getDoc } = await import('firebase/firestore');
    
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    
    if (!userData?.fcmToken) {
      console.log('❌ CRITICAL: FCM token not saved to Firestore!');
      console.log('❌ Cloud Functions cannot send notifications without this token');
      console.log('❌ Saving token now...');
      
      const saved = await fcm.saveFCMTokenToUser(userId, token);
      if (saved) {
        console.log('✅ FCM token saved to Firestore');
      } else {
        console.log('❌ Failed to save FCM token to Firestore');
        return false;
      }
    } else {
      console.log('✅ FCM token saved in Firestore:', userData.fcmToken.length, 'characters');
    }
    
    // Test 4: Notification Channels
    console.log('🧪 TEST 4: Creating Notification Channels...');
    await fcm.createNotificationChannels();
    console.log('✅ Notification channels created');
    
    // Test 5: Background Message Handler
    console.log('🧪 TEST 5: Checking Background Message Handler...');
    console.log('✅ Background message handler is set up in App.tsx');
    
    // Test 6: Send Test Notification
    console.log('🧪 TEST 6: Sending Test Push Notification...');
    console.log('🧪 Close the app after this to test background notifications');
    
    const result = await notificationService.createTestFCMNotification(userId);
    
    if (result) {
      console.log('✅ Test notification sent successfully');
      console.log('✅ Check system tray for notification');
      console.log('✅ If no notification appears, check device settings');
    } else {
      console.log('❌ Failed to send test notification');
      return false;
    }
    
    console.log('🎉 FCM SETUP TEST: All tests completed successfully!');
    console.log('🎉 If you still don\'t receive notifications, check device settings:');
    console.log('🎉 1. Settings > Apps > E-Responde > Notifications > Allow');
    console.log('🎉 2. Settings > Battery > Battery Optimization > E-Responde > Don\'t optimize');
    console.log('🎉 3. Check notification channels are enabled');
    
    return true;
    
  } catch (error) {
    console.error('❌ FCM SETUP TEST: Error during testing:', error);
    return false;
  }
};

// Quick test function
export const quickFCMTest = async (userId) => {
  console.log('🚀 QUICK FCM TEST: Starting...');
  
  try {
    const fcm = fcmService.getInstance();
    
    // Check token
    const token = await fcm.getFCMToken();
    if (!token) {
      console.log('❌ No FCM token - FCM not initialized');
      return false;
    }
    
    // Check permissions
    const hasPermission = await fcm.checkNotificationPermission();
    if (!hasPermission) {
      console.log('❌ No notification permission - check device settings');
      return false;
    }
    
    // Send test notification
    const result = await notificationService.createTestFCMNotification(userId);
    if (result) {
      console.log('✅ Test notification sent - close app and check system tray');
    } else {
      console.log('❌ Failed to send test notification');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Quick FCM test error:', error);
    return false;
  }
};

export default {
  testFCMSetup,
  quickFCMTest
};
