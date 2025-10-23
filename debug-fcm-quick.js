/**
 * Quick FCM Debug Test
 * Run this to quickly test FCM functionality
 */

import { fcmService } from './services/fcmService';
import { notificationService } from './services/notificationService';
import messaging from '@react-native-firebase/messaging';

export const quickFCMTest = async (userId) => {
  console.log('🔍 QUICK FCM TEST: Starting...');
  
  try {
    // 1. Test FCM Token
    console.log('1️⃣ Testing FCM Token...');
    const token = await fcmService.getFCMToken();
    console.log('FCM Token:', token ? `${token.length} chars` : 'NOT FOUND');
    
    if (!token) {
      console.log('❌ CRITICAL: No FCM token!');
      return;
    }
    
    // 2. Test Permissions
    console.log('2️⃣ Testing Permissions...');
    const hasPermission = await fcmService.checkNotificationPermission();
    console.log('Permission Status:', hasPermission ? 'GRANTED' : 'DENIED');
    
    // 3. Test Token Storage
    console.log('3️⃣ Testing Token Storage...');
    const { db } = await import('./firebaseConfig');
    const { doc, getDoc } = await import('firebase/firestore');
    
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    console.log('Token in Firestore:', userData?.fcmToken ? 'SAVED' : 'NOT SAVED');
    
    // 4. Test Push Notification
    console.log('4️⃣ Testing Push Notification...');
    console.log('Sending test notification...');
    const result = await notificationService.createTestFCMNotification(userId);
    console.log('Test notification result:', result ? 'SUCCESS' : 'FAILED');
    
    console.log('🏁 Quick FCM test completed');
    
  } catch (error) {
    console.error('❌ Quick FCM test error:', error);
  }
};

export default quickFCMTest;
