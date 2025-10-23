# FCM Push Notification Diagnostic Guide

## 🔍 **Step-by-Step FCM Troubleshooting**

### **Step 1: Check FCM Token Generation**

Add this to your app to test FCM token:

```javascript
import { fcmService } from './services/fcmService';

// Test FCM token
const testFCMToken = async () => {
  const fcm = fcmService.getInstance();
  const token = await fcm.getFCMToken();
  
  console.log('FCM Token available:', !!token);
  console.log('FCM Token length:', token ? token.length : 0);
  console.log('FCM Token preview:', token ? token.substring(0, 30) + '...' : 'None');
  
  if (!token) {
    console.log('❌ CRITICAL: No FCM token found!');
    console.log('This means FCM is not initialized properly');
    return false;
  }
  
  return true;
};
```

### **Step 2: Check Notification Permissions**

```javascript
// Test notification permissions
const testPermissions = async () => {
  const fcm = fcmService.getInstance();
  const hasPermission = await fcm.checkNotificationPermission();
  
  console.log('Notification permission granted:', hasPermission);
  
  if (!hasPermission) {
    console.log('❌ CRITICAL: Notification permission denied!');
    console.log('Go to Settings > Apps > E-Responde > Notifications > Allow');
    return false;
  }
  
  return true;
};
```

### **Step 3: Check FCM Token Storage**

```javascript
// Test if FCM token is saved to Firestore
const testTokenStorage = async (userId) => {
  const { db } = await import('./firebaseConfig');
  const { doc, getDoc } = await import('firebase/firestore');
  
  const userDoc = await getDoc(doc(db, 'users', userId));
  const userData = userDoc.data();
  
  console.log('Token saved in Firestore:', !!userData?.fcmToken);
  console.log('Token length in Firestore:', userData?.fcmToken?.length || 0);
  
  if (!userData?.fcmToken) {
    console.log('❌ CRITICAL: FCM token not saved to Firestore!');
    console.log('Cloud Functions cannot send notifications without this token');
    return false;
  }
  
  return true;
};
```

### **Step 4: Test Background Message Handler**

Check if background messages are being received:

```javascript
// This should be in your App.tsx
import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('🔔 BACKGROUND MESSAGE RECEIVED:', remoteMessage);
  console.log('Message ID:', remoteMessage.messageId);
  console.log('From:', remoteMessage.from);
  console.log('Data:', remoteMessage.data);
  console.log('Notification:', remoteMessage.notification);
  
  if (remoteMessage.notification) {
    console.log('✅ Background notification received');
    console.log('Title:', remoteMessage.notification.title);
    console.log('Body:', remoteMessage.notification.body);
  } else {
    console.log('❌ CRITICAL: Background message has no notification payload!');
    console.log('This is why notifications are not showing in tray');
  }
  
  return Promise.resolve();
});
```

### **Step 5: Test Cloud Function**

Check if Cloud Function is sending proper FCM messages:

```bash
# Check Cloud Function logs
npx firebase functions:log

# Look for these logs:
# "Cloud Function: ⚡ Push notification sent in [time]ms"
# "Cloud Function: ✅ FCM token found, sending notification..."
```

### **Step 6: Test Push Notification**

```javascript
// Test sending a push notification
const testPushNotification = async (userId) => {
  const { notificationService } = await import('./services/notificationService');
  
  console.log('🧪 Sending test push notification...');
  const result = await notificationService.createTestFCMNotification(userId);
  
  if (result) {
    console.log('✅ Test notification sent successfully');
    console.log('Close the app and check system tray');
  } else {
    console.log('❌ Failed to send test notification');
  }
  
  return result;
};
```

## 🚨 **Common Issues & Solutions**

### **Issue 1: No FCM Token**
```
❌ No FCM token found
```
**Causes:**
- Google Play Services not installed
- Firebase not properly initialized
- Device not supported

**Solutions:**
1. Install Google Play Services
2. Check Firebase configuration
3. Test on different device

### **Issue 2: Permission Denied**
```
❌ Notification permission denied
```
**Solutions:**
1. Go to Settings > Apps > E-Responde > Notifications > Allow
2. Check all notification channels are enabled
3. Disable battery optimization for the app

### **Issue 3: Token Not Saved**
```
❌ FCM token not saved to Firestore
```
**Solutions:**
1. Check Firebase connection
2. Verify user authentication
3. Check Firestore permissions

### **Issue 4: No Background Messages**
```
❌ Background message has no notification payload
```
**Solutions:**
1. Check Cloud Function is sending proper notification payload
2. Verify FCM message structure
3. Check notification channels

### **Issue 5: Cloud Function Not Triggered**
```
No Cloud Function logs
```
**Solutions:**
1. Check if Firestore document is created
2. Verify Cloud Function is deployed
3. Check Firestore trigger configuration

## 📱 **Device Settings Checklist**

1. **Settings > Apps > E-Responde > Notifications**
   - ✅ Allow notifications: ON
   - ✅ E-Responde Notifications channel: ON
   - ✅ SOS Emergency Alerts channel: ON

2. **Settings > Battery > Battery Optimization**
   - ✅ E-Responde: Don't optimize

3. **Settings > Apps > E-Responde > Permissions**
   - ✅ All permissions granted

4. **Settings > Apps > E-Responde > Storage**
   - ✅ Clear cache and data (if needed)

## 🧪 **Complete Test Sequence**

1. **Run the diagnostic tests above**
2. **Check all logs for errors**
3. **Send a test notification**
4. **Close the app completely**
5. **Wait 15-30 seconds**
6. **Check system tray for notification**

## 📊 **Expected Logs**

**✅ Good Signs:**
```
FCM Token available: true
FCM Token length: 163
Notification permission granted: true
Token saved in Firestore: true
🔔 BACKGROUND MESSAGE RECEIVED: [object]
✅ Background notification received
```

**❌ Problem Signs:**
```
FCM Token available: false
Notification permission granted: false
Token saved in Firestore: false
❌ Background message has no notification payload
```

Run these tests and report what logs you see!
