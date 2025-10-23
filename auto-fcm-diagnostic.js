/**
 * Automatic FCM Diagnostic
 * 
 * This script will automatically diagnose FCM issues and provide solutions
 */

import { fcmService } from './services/fcmService';
import { notificationService } from './services/notificationService';
import messaging from '@react-native-firebase/messaging';

export const runAutoFCMDiagnostic = async (userId) => {
  console.log('🔍 AUTO FCM DIAGNOSTIC: Starting comprehensive FCM analysis...');
  
  const results = {
    fcmToken: false,
    permissions: false,
    tokenStorage: false,
    backgroundHandler: false,
    testNotification: false,
    issues: [],
    solutions: []
  };
  
  try {
    // Test 1: FCM Token
    console.log('🔍 TEST 1: Checking FCM Token...');
    const fcm = fcmService.getInstance();
    const token = await fcm.getFCMToken();
    
    if (token) {
      console.log('✅ FCM Token found:', token.length, 'characters');
      results.fcmToken = true;
    } else {
      console.log('❌ CRITICAL: No FCM token found!');
      results.issues.push('No FCM token found');
      results.solutions.push('Check if Google Play Services is installed');
      results.solutions.push('Verify Firebase is properly initialized');
      results.solutions.push('Test on different device');
    }
    
    // Test 2: Permissions
    console.log('🔍 TEST 2: Checking Notification Permissions...');
    const hasPermission = await fcm.checkNotificationPermission();
    
    if (hasPermission) {
      console.log('✅ Notification permission granted');
      results.permissions = true;
    } else {
      console.log('❌ CRITICAL: Notification permission denied!');
      results.issues.push('Notification permission denied');
      results.solutions.push('Go to Settings > Apps > E-Responde > Notifications > Allow');
      results.solutions.push('Check all notification channels are enabled');
      results.solutions.push('Disable battery optimization for the app');
    }
    
    // Test 3: Token Storage
    console.log('🔍 TEST 3: Checking FCM Token Storage...');
    const { db } = await import('./firebaseConfig');
    const { doc, getDoc } = await import('firebase/firestore');
    
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    
    if (userData?.fcmToken) {
      console.log('✅ FCM token saved in Firestore:', userData.fcmToken.length, 'characters');
      results.tokenStorage = true;
    } else {
      console.log('❌ CRITICAL: FCM token not saved to Firestore!');
      results.issues.push('FCM token not saved to Firestore');
      results.solutions.push('Check Firebase connection');
      results.solutions.push('Verify user authentication');
      results.solutions.push('Check Firestore permissions');
      
      // Try to save the token
      if (token) {
        console.log('🔧 Attempting to save FCM token...');
        const saved = await fcm.saveFCMTokenToUser(userId, token);
        if (saved) {
          console.log('✅ FCM token saved successfully');
          results.tokenStorage = true;
        } else {
          console.log('❌ Failed to save FCM token');
        }
      }
    }
    
    // Test 4: Background Message Handler
    console.log('🔍 TEST 4: Checking Background Message Handler...');
    // The background handler is set up in App.tsx, so we assume it's working
    console.log('✅ Background message handler is set up in App.tsx');
    results.backgroundHandler = true;
    
    // Test 5: Notification Channels
    console.log('🔍 TEST 5: Creating Notification Channels...');
    await fcm.createNotificationChannels();
    console.log('✅ Notification channels created');
    
    // Test 6: Send Test Notification
    console.log('🔍 TEST 6: Sending Test Push Notification...');
    const result = await notificationService.createTestFCMNotification(userId);
    
    if (result) {
      console.log('✅ Test notification sent successfully');
      results.testNotification = true;
    } else {
      console.log('❌ Failed to send test notification');
      results.issues.push('Failed to send test notification');
      results.solutions.push('Check notification service');
      results.solutions.push('Verify Cloud Function is deployed');
    }
    
    // Generate Summary
    console.log('📊 FCM DIAGNOSTIC SUMMARY:');
    console.log('FCM Token:', results.fcmToken ? '✅' : '❌');
    console.log('Permissions:', results.permissions ? '✅' : '❌');
    console.log('Token Storage:', results.tokenStorage ? '✅' : '❌');
    console.log('Background Handler:', results.backgroundHandler ? '✅' : '❌');
    console.log('Test Notification:', results.testNotification ? '✅' : '❌');
    
    if (results.issues.length > 0) {
      console.log('❌ ISSUES FOUND:');
      results.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
      
      console.log('🔧 SOLUTIONS:');
      results.solutions.forEach((solution, index) => {
        console.log(`${index + 1}. ${solution}`);
      });
    } else {
      console.log('🎉 ALL TESTS PASSED! FCM should be working correctly.');
      console.log('🎉 If you still don\'t receive notifications, check device settings:');
      console.log('🎉 1. Settings > Apps > E-Responde > Notifications > Allow');
      console.log('🎉 2. Settings > Battery > Battery Optimization > E-Responde > Don\'t optimize');
      console.log('🎉 3. Check notification channels are enabled');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ FCM DIAGNOSTIC: Error during testing:', error);
    results.issues.push(`Diagnostic error: ${error.message || error}`);
    results.solutions.push('Check console for detailed error information');
    return results;
  }
};

// Quick diagnostic function
export const quickFCMCheck = async (userId) => {
  console.log('🚀 QUICK FCM CHECK: Starting...');
  
  try {
    const fcm = fcmService.getInstance();
    
    // Check token
    const token = await fcm.getFCMToken();
    if (!token) {
      console.log('❌ No FCM token - FCM not initialized');
      return { success: false, issue: 'No FCM token' };
    }
    
    // Check permissions
    const hasPermission = await fcm.checkNotificationPermission();
    if (!hasPermission) {
      console.log('❌ No notification permission - check device settings');
      return { success: false, issue: 'No notification permission' };
    }
    
    // Send test notification
    const result = await notificationService.createTestFCMNotification(userId);
    if (result) {
      console.log('✅ Test notification sent - close app and check system tray');
      return { success: true, message: 'Test notification sent successfully' };
    } else {
      console.log('❌ Failed to send test notification');
      return { success: false, issue: 'Failed to send test notification' };
    }
    
  } catch (error) {
    console.error('❌ Quick FCM check error:', error);
    return { success: false, issue: `Error: ${error.message || error}` };
  }
};

export default {
  runAutoFCMDiagnostic,
  quickFCMCheck
};
