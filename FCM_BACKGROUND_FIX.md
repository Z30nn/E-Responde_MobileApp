# FCM Background Notification Fix

## Problem
FCM notifications don't work when the app is removed from recently used apps (completely killed).

## Root Causes
1. **Battery Optimization**: Android kills background processes aggressively
2. **Missing Background Service**: No persistent service to handle FCM
3. **Notification Channel Issues**: Improper channel configuration
4. **FCM Priority Settings**: Not configured for background delivery

## Solutions Implemented

### 1. Enhanced Android Manifest
- Added battery optimization permissions
- Added foreground service permissions
- Added FCM background service declaration

### 2. FCM Background Service
- Created persistent background service (`FCMBackgroundService.java`)
- Service runs as foreground to prevent being killed
- Maintains wake lock to prevent CPU sleep
- Automatically restarts if killed

### 3. Battery Optimization Handling
- Added battery optimization exemption request
- Guides users to disable battery optimization
- Shows alert with instructions

### 4. Enhanced FCM Configuration
- High-priority FCM settings
- Enhanced notification channels
- Better background delivery settings

## User Instructions

### For Users (Manual Fix Required)

1. **Disable Battery Optimization**:
   - Go to Settings > Apps > E-Responde
   - Tap "Battery" > "Battery optimization"
   - Select "Don't optimize" for E-Responde

2. **Enable Background App Refresh**:
   - Go to Settings > Apps > E-Responde
   - Tap "Battery" > "Background activity"
   - Enable "Allow background activity"

3. **Check Notification Settings**:
   - Go to Settings > Apps > E-Responde > Notifications
   - Ensure "Allow notifications" is ON
   - Check that notification channels are enabled

### For Developers

1. **Test Background Notifications**:
   ```javascript
   // Test FCM when app is killed
   await fcmService.testPushNotification();
   ```

2. **Monitor FCM Status**:
   ```javascript
   // Check FCM setup
   await fcmService.testFCM();
   ```

3. **Verify Background Service**:
   - Check Android logs for FCMBackgroundService
   - Ensure service is running when app is killed

## Technical Details

### Background Service Features
- **Persistent**: Runs as foreground service
- **Auto-restart**: Uses START_STICKY to restart if killed
- **Wake Lock**: Prevents CPU sleep during critical operations
- **Low Priority**: Minimal battery impact

### FCM Enhancements
- **High Priority**: All notifications use high priority
- **Enhanced Channels**: Proper channel configuration
- **Background Delivery**: Optimized for background delivery
- **Battery Exemption**: Requests battery optimization exemption

### Notification Channels
- **e-responde-notifications**: General notifications
- **e-responde-sos**: Emergency SOS alerts
- **fcm_background_service**: Background service channel

## Testing

### Test Steps
1. Send test notification while app is open
2. Send test notification while app is in background
3. Send test notification while app is completely killed
4. Verify notifications appear in all scenarios

### Expected Results
- ✅ Notifications work when app is open
- ✅ Notifications work when app is in background
- ✅ Notifications work when app is completely killed
- ✅ Background service keeps running
- ✅ Battery optimization is disabled

## Troubleshooting

### If Notifications Still Don't Work

1. **Check Battery Optimization**:
   - Ensure E-Responde is not optimized
   - Check device-specific battery settings

2. **Check Background Service**:
   - Verify FCMBackgroundService is running
   - Check Android logs for errors

3. **Check FCM Token**:
   - Ensure FCM token is valid
   - Check token is saved in Firestore

4. **Check Notification Channels**:
   - Verify channels are created
   - Check channel importance settings

### Common Issues

1. **Service Not Starting**:
   - Check Android manifest permissions
   - Verify service declaration

2. **Battery Optimization**:
   - Some devices have additional battery settings
   - Check manufacturer-specific settings

3. **FCM Token Issues**:
   - Token might be invalid or expired
   - Check Firebase configuration

## Monitoring

### Logs to Check
- FCM service logs
- Background service logs
- Battery optimization status
- Notification delivery status

### Metrics to Monitor
- Notification delivery rate
- Background service uptime
- FCM token validity
- Battery optimization status

## Conclusion

This fix addresses the core issue of FCM notifications not working when the app is killed by:

1. **Adding a persistent background service**
2. **Requesting battery optimization exemption**
3. **Enhancing FCM configuration**
4. **Providing user guidance**

The solution ensures emergency notifications work reliably even when the app is completely closed, which is critical for the E-Responde emergency response system.
