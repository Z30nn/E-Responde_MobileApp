# Local Notification System Testing Guide

## Overview
This guide explains how to test the local notification system implemented in the E-Responde mobile application.

## Features Implemented

### 1. Notification Service (`services/notificationsService.ts`)
- **useNotifications()** hook for easy integration
- **Android notification channels** with proper priorities
- **Permission handling** for iOS and Android
- **Background/foreground/closed app** notification support
- **Predefined notification templates** for common use cases

### 2. Integration Points

#### SOS Trigger Notifications
- **Location**: `app/dashboard/tabs/sos-tab/index.tsx`
- **Trigger**: When SOS alert is successfully sent
- **Notification**: "🚨 SOS Sent — Your emergency alert has been dispatched."

#### Crime Report Notifications
- **Location**: `CrimeReportForm.tsx`
- **Trigger**: When crime report is successfully submitted
- **Notification**: "✅ Report Submitted — Police have received your report."

## Testing Instructions

### Prerequisites
1. Install the expo-notifications package:
   ```bash
   npm install expo-notifications
   ```

2. For Android, ensure the app has notification permissions in `android/app/src/main/AndroidManifest.xml`

### Testing Scenarios

#### 1. Foreground Notifications (App Open)
1. Open the E-Responde app
2. Navigate to SOS tab and trigger SOS
3. **Expected**: Notification appears in notification tray + in-app alert
4. Submit a crime report
5. **Expected**: Notification appears in notification tray + in-app alert

#### 2. Background Notifications (App Minimized)
1. Open the E-Responde app
2. Minimize the app (press home button)
3. Trigger SOS or submit crime report
4. **Expected**: Notification appears in system notification tray
5. Tap notification to return to app

#### 3. Closed App Notifications (App Completely Closed)
1. Force close the E-Responde app
2. Open the app and trigger SOS or submit crime report
3. **Expected**: Notification appears in system notification tray
4. Tap notification to open the app

#### 4. Lock Screen Notifications (Phone Locked)
1. Lock your phone
2. Open the E-Responde app and trigger SOS or submit crime report
3. **Expected**: Notification appears on lock screen
4. Unlock phone and tap notification

### Testing Commands

#### Install Dependencies
```bash
npm install expo-notifications
```

#### Run on Android
```bash
npx react-native run-android
```

#### Run on iOS
```bash
npx react-native run-ios
```

### Debugging

#### Check Notification Permissions
```typescript
import { useNotifications } from './services/notificationsService';

const { hasPermission, requestPermissions } = useNotifications();

// Check if permissions are granted
console.log('Has permission:', hasPermission);

// Request permissions if needed
await requestPermissions();
```

#### Manual Notification Test
```typescript
import { useNotifications, NotificationTemplates } from './services/notificationsService';

const { sendLocal } = useNotifications();

// Send test notification
await sendLocal(NotificationTemplates.SOS_SENT);
```

### Android Notification Channels

The system creates three notification channels:

1. **SOS Alerts** (High Priority)
   - For emergency notifications
   - Red light, vibration, sound enabled

2. **Crime Reports** (Normal Priority)
   - For crime report notifications
   - Blue light, vibration, sound enabled

3. **General** (Normal Priority)
   - For general app notifications
   - Blue light, vibration, sound enabled

### Troubleshooting

#### Notifications Not Appearing
1. Check if notification permissions are granted
2. Verify Android notification channels are created
3. Check console logs for errors
4. Ensure app is not in battery optimization mode

#### Permission Issues
1. Go to Settings > Apps > E-Responde > Notifications
2. Enable notifications and set priority to "High"
3. For Android 13+, ensure "POST_NOTIFICATIONS" permission is granted

#### Background Limitations
1. Some Android devices may limit background notifications
2. Add app to battery optimization whitelist
3. Ensure app has "WAKE_LOCK" permission

### Code Examples

#### Using the Hook
```typescript
import { useNotifications, NotificationTemplates } from './services/notificationsService';

const MyComponent = () => {
  const { sendLocal, scheduleLocal, hasPermission, requestPermissions } = useNotifications();

  const handleTestNotification = async () => {
    if (!hasPermission) {
      await requestPermissions();
    }
    
    // Send immediate notification
    await sendLocal(NotificationTemplates.SOS_SENT);
    
    // Schedule notification for 5 seconds
    await scheduleLocal(NotificationTemplates.CRIME_REPORT_SUBMITTED, 5000);
  };

  return (
    <TouchableOpacity onPress={handleTestNotification}>
      <Text>Test Notification</Text>
    </TouchableOpacity>
  );
};
```

#### Custom Notification
```typescript
const customNotification = {
  type: 'general' as NotificationType,
  title: 'Custom Title',
  body: 'Custom message body',
  data: { customData: 'value' },
  sound: true,
  vibrate: true,
  priority: 'high' as const,
};

await sendLocal(customNotification);
```

## Production Considerations

1. **Battery Optimization**: Ensure app is whitelisted from battery optimization
2. **Notification Limits**: Android may limit notifications per app
3. **User Preferences**: Respect user's notification settings
4. **Testing**: Test on various Android versions and devices
5. **Performance**: Monitor notification service performance

## Support

For issues or questions:
1. Check console logs for error messages
2. Verify notification permissions in device settings
3. Test on different devices and Android versions
4. Review Android notification channel settings
