# Firebase Cloud Messaging (FCM) Setup Guide

This guide explains how to set up and use the Firebase Cloud Messaging service for push notifications in the E-Responde Mobile App.

## Overview

The FCM service integrates with your existing notification system to provide:
- **Foreground notifications**: Uses existing `sendNotification()` and `SoundService` for in-app display
- **Background/Quit notifications**: System tray push notifications via FCM
- **Seamless integration**: Same notification types and sounds as your current system

## Files Created

1. **`services/fcmService.js`** - Main FCM service for the mobile app
2. **`functions/index.js`** - Firebase Cloud Functions for server-side push notifications
3. **`functions/package.json`** - Dependencies for Cloud Functions
4. **Updated `App.tsx`** - FCM service initialization

## Dependencies Required

### Mobile App Dependencies
Add these to your `package.json`:

```json
{
  "dependencies": {
    "@react-native-firebase/app": "^18.6.1",
    "@react-native-firebase/messaging": "^18.6.1"
  }
}
```

### Firebase Cloud Functions Dependencies
The `functions/package.json` already includes:
- `firebase-admin`: ^11.8.0
- `firebase-functions`: ^4.3.1

## Installation Steps

### 1. Install Mobile App Dependencies

```bash
cd E-Responde_MobileApp
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### 2. Install Cloud Functions Dependencies

```bash
cd functions
npm install
```

### 3. Android Configuration

#### Update `android/app/src/main/AndroidManifest.xml`:

```xml
<application>
  <!-- FCM Service -->
  <service
    android:name=".MyFirebaseMessagingService"
    android:exported="false">
    <intent-filter>
      <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
  </service>

  <!-- Notification Channel for E-Responde -->
  <meta-data
    android:name="com.google.firebase.messaging.default_notification_channel_id"
    android:value="e-responde-notifications" />
</application>
```

#### Create `android/app/src/main/java/com/yourapp/MyFirebaseMessagingService.java`:

```java
package com.yourapp; // Replace with your actual package name

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        // Handle FCM messages here if needed
        // The FCM service will handle most of the logic
    }
}
```

### 4. iOS Configuration

**Note**: Since this app is Android-only, iOS configuration is not needed.

### 5. Deploy Cloud Functions

```bash
# From the functions directory
firebase deploy --only functions
```

## How It Works

### 1. FCM Service Initialization

The FCM service is automatically initialized in `App.tsx` when a user authenticates:

```javascript
// In App.tsx - already added
useEffect(() => {
  if (isAuthenticated && user && authChecked) {
    fcmService.setupNotificationListeners(user.uid);
  }
}, [isAuthenticated, user, authChecked]);
```

### 2. Notification Flow

#### Foreground (App Open):
1. FCM receives push notification
2. `handleInAppNotification()` is called
3. Uses existing `sendNotification()` and `SoundService`
4. Displays in-app notification with sound

#### Background/Quit (App Closed):
1. FCM receives push notification
2. System displays notification in tray
3. User taps notification → app opens
4. `handleNotificationPress()` navigates to appropriate screen

### 3. Cloud Function Integration

When your existing `sendNotification()` creates a notification in Firestore, the Cloud Function automatically:
1. Detects new notification document
2. Gets user's FCM token
3. Sends push notification via FCM
4. Updates notification with delivery status

## Usage Examples

### Sending Notifications (No Changes Required)

Your existing code continues to work exactly the same:

```javascript
// This will now trigger both in-app AND push notifications
await notificationService.sendNotification(
  userId,
  'sos_alert',
  '🚨 SOS Alert from John',
  'Emergency SOS alert with location data',
  { fromUserId: 'user123', location: userLocation }
);
```

### SOS Alert Flow

```javascript
// Your existing SOS alert code
const result = await EmergencyContactsService.sendSOSAlert(userId, message);

// This automatically:
// 1. Creates notification documents in Firestore
// 2. Cloud Function sends push notifications
// 3. Recipients get both in-app and system notifications
```

## Notification Types Supported

All your existing notification types work with FCM:

- `crime_report_submitted` - Confirmation notifications
- `crime_report_new` - New report notifications  
- `crime_report_solved` - Report resolution notifications
- `crime_report_updated` - Report update notifications
- `sos_alert` - Emergency SOS alerts (high priority)

## Testing

### 1. Test FCM Token Generation

```javascript
// In your app, check if FCM token is generated
const token = await fcmService.getCurrentToken();
console.log('FCM Token:', token);
```

### 2. Test Push Notifications

1. Send a notification using your existing code
2. Check Firestore for the notification document
3. Verify Cloud Function logs in Firebase Console
4. Check device receives push notification

### 3. Test Different App States

- **Foreground**: Should show in-app notification with sound
- **Background**: Should show system notification
- **Quit**: Should show system notification and open app when tapped

## Troubleshooting

### Common Issues

1. **No FCM Token**: Check Firebase configuration and permissions
2. **Notifications Not Received**: Verify Cloud Functions are deployed
3. **Android Notifications**: Check notification channels and permissions
4. **iOS Notifications**: Verify APNs configuration

### Debug Logs

The FCM service includes comprehensive logging:

```javascript
// Check console for FCM service logs
console.log('FCMService: Setting up notification listeners...');
console.log('FCMService: FCM token retrieved:', token);
console.log('FCMService: ✅ Push notification sent successfully');
```

### Cloud Function Logs

```bash
# View Cloud Function logs
firebase functions:log
```

## Security Considerations

1. **FCM Tokens**: Stored securely in user documents
2. **Permissions**: Users must grant notification permissions
3. **Data**: Notification data is encrypted in transit
4. **Cleanup**: Old notifications are automatically cleaned up

## Performance

- **Batch Processing**: Cloud Functions handle multiple notifications efficiently
- **Token Management**: Automatic token refresh and cleanup
- **Error Handling**: Comprehensive error handling and retry logic
- **Cleanup**: Daily cleanup of old notifications (30+ days)

## Next Steps

1. Install dependencies
2. Configure Android/iOS settings
3. Deploy Cloud Functions
4. Test with your existing notification system
5. Monitor logs for any issues

The FCM service is designed to work seamlessly with your existing notification system - no changes to your current code are required!
