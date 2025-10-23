# 🧪 Manual Push Notification Test

## Quick Test Steps:

### 1. Check FCM Token
1. Open your app
2. Check console logs for: `FCMService: ✅ FCM token retrieved`
3. Go to Firebase Console → Firestore → users → your user document
4. Verify `fcmToken` field exists and has a long string

### 2. Create Test Notification
1. In your app, trigger any notification (SOS, crime report, etc.)
2. Go to Firebase Console → Firestore → notifications collection
3. Look for new document with your notification
4. Check if it has `delivered: true` and `fcmMessageId`

### 3. Check Cloud Function Logs
```bash
npx firebase functions:log --only sendPushNotification
```

### 4. Test with Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter test message
4. Select your device (if FCM token is registered)
5. Send message

### 5. Android Device Settings
1. Settings → Apps → E-Responde → Notifications
2. Make sure notifications are enabled
3. Check notification channels
4. Disable battery optimization for your app

## Expected Results:

✅ **FCM Token exists in Firestore**
✅ **Notification document created with `delivered: true`**
✅ **Cloud Function logs show successful processing**
✅ **Push notification appears on device**

## If Still Not Working:

1. **Check Android version** - Some older versions have issues
2. **Test on different device** - Hardware-specific issues
3. **Check network** - FCM requires internet connection
4. **Verify Firebase project** - Make sure you're using the right project
