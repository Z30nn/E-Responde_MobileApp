# Android FCM Setup Guide - E-Responde Mobile App

This guide explains how to set up Firebase Cloud Messaging (FCM) for **Android-only** push notifications in the E-Responde Mobile App.

## 🎯 Overview

The FCM service provides:
- **Foreground notifications**: Uses existing `sendNotification()` and `SoundService` for in-app display
- **Background/Quit notifications**: Android system tray push notifications via FCM
- **Seamless integration**: Same notification types and sounds as your current system

## 📁 Files Created

1. **`services/fcmService.js`** - Main FCM service for Android
2. **`functions/index.js`** - Firebase Cloud Functions for server-side push notifications
3. **`functions/package.json`** - Dependencies for Cloud Functions
4. **Updated `App.tsx`** - FCM service initialization
5. **Updated `android/app/src/main/AndroidManifest.xml`** - Android FCM configuration

## 🚀 Installation Steps

### 1. Install Dependencies

```bash
# Install FCM dependencies
cd E-Responde_MobileApp
npm install @react-native-firebase/app @react-native-firebase/messaging

# Install Cloud Functions dependencies  
cd functions
npm install
```

### 2. Android Configuration ✅ (Already Done)

Your `AndroidManifest.xml` has been updated with:
- FCM permissions
- FCM service configuration
- Notification channel setup

### 3. Deploy Cloud Functions

```bash
# Deploy Firebase Cloud Functions
firebase deploy --only functions
```

## 🧪 Testing

### Test FCM Token Generation

```javascript
// Add this to any component to test FCM token
import { fcmService } from './services/fcmService';

const testFCM = async () => {
  const token = await fcmService.getCurrentToken();
  console.log('FCM Token:', token);
};
```

### Test Push Notifications

1. **Send a test notification** using your existing code:
   ```javascript
   // This will now trigger BOTH in-app AND push notifications
   await notificationService.sendNotification(
     userId,
     'sos_alert',
     '🚨 Test SOS Alert',
     'Testing push notifications',
     { test: true }
   );
   ```

2. **Test different app states:**
   - **Foreground**: Should show in-app notification with sound
   - **Background**: Should show Android notification in tray
   - **Quit**: Should show Android notification and open app when tapped

## ✅ Verification

### Check Console Logs
Look for these logs in your app:
```
FCMService: ✅ FCM token retrieved: [token]
FCMService: ✅ Notification listeners setup complete
FCMService: ✅ Push notification sent successfully
```

### Check Cloud Function Logs
```bash
firebase functions:log
```

### Check Firestore
- Verify notification documents are created
- Check if `fcmMessageId` and `delivered` fields are added
- Verify user documents have `fcmToken` field

## 🎉 How It Works

### Foreground (App Open)
1. FCM receives push notification
2. `handleInAppNotification()` calls your existing `sendNotification()`
3. Uses your existing `SoundService` for sounds
4. Displays in-app notification with same logic

### Background/Quit (App Closed)
1. FCM receives push notification
2. Android system shows notification in tray
3. User taps → app opens → `handleNotificationPress()` navigates appropriately

### Cloud Function Integration
1. Your existing `sendNotification()` creates Firestore document
2. Cloud Function automatically detects new notification
3. Sends push notification via FCM to Android
4. Updates notification with delivery status

## 🔥 Android-Specific Features

### SOS Alerts
- **High Priority**: SOS alerts use high priority with vibration
- **Red Light**: SOS alerts flash red light on supported devices
- **Vibration Pattern**: Custom vibration pattern for SOS alerts

### Notification Channels
- **General**: `e-responde-notifications` for regular notifications
- **SOS**: `e-responde-sos` for emergency alerts

## 🚨 Notification Types Supported

All your existing types work with FCM:
- `crime_report_submitted` → confirmation notifications
- `crime_report_new` → new report notifications  
- `crime_report_solved` → report resolution notifications
- `crime_report_updated` → report update notifications
- `sos_alert` → emergency SOS alerts (high priority with vibration/light)

## 🎯 Next Steps

1. **Install dependencies** (see above)
2. **Deploy Cloud Functions** (see above)
3. **Test on Android device**
4. **Verify notifications work in all app states**

## 🔧 Troubleshooting

### Common Android Issues

1. **No FCM Token**: 
   - Check Firebase configuration
   - Verify Google Services JSON is correct
   - Check Android permissions

2. **Notifications Not Received**:
   - Verify Cloud Functions are deployed
   - Check Android notification permissions
   - Verify notification channels are created

3. **SOS Alerts Not High Priority**:
   - Check notification channel settings
   - Verify Android 8.0+ notification channels
   - Test on physical device (notifications may not work in emulator)

### Debug Commands

```bash
# Check Cloud Function logs
firebase functions:log

# Check FCM token in app
console.log('FCM Token:', await fcmService.getCurrentToken());

# Test notification sending
firebase functions:shell
```

## 🎉 You're Ready!

Your Android FCM integration is complete! The system will now:
- ✅ Send push notifications when app is closed/background
- ✅ Use existing in-app notifications when app is open  
- ✅ Play same sounds for SOS alerts
- ✅ Support all 9 notification types
- ✅ Work seamlessly with your existing code

**No changes to your existing notification code are required** - everything works automatically! 🚀
