# Smartwatch Theft Detection

## Overview
This feature automatically detects when your smartphone is taken away from your paired smartwatch. When the devices are more than 5 meters apart, the smartwatch triggers an automatic theft report via SOS.

## Architecture

### Components
1. **Smartphone App** (React Native)
   - Monitors distance from smartwatch every 10 seconds
   - Calculates distance using Haversine formula
   - Triggers theft SOS when distance > 5 meters

2. **Smartwatch App** (Wear OS / Your existing app)
   - Updates location to Firebase every 10-30 seconds
   - Requires GPS permission and network access

## Firebase Database Structure

### Device Locations Path
```
device_locations/
├── phone/                          # Smartphone location
│   ├── latitude: number
│   ├── longitude: number
│   └── timestamp: number
└── {deviceId}/                     # Smartwatch location (deviceId = your watch ID)
    ├── latitude: number
    ├── longitude: number
    └── timestamp: number
```

### Example Data
```json
{
  "device_locations": {
    "phone": {
      "latitude": 14.5995,
      "longitude": 120.9842,
      "timestamp": 1704067200000
    },
    "watch_abc123": {
      "latitude": 14.5994,
      "longitude": 120.9843,
      "timestamp": 1704067200000
    }
  }
}
```

### Crime Reports Path (Auto-created on theft)
```
civilian/
├── civilian crime reports/
│   └── {timestamp}/                # Report ID = timestamp
│       ├── crimeType: "Theft"
│       ├── description: "Smartphone taken away..."
│       ├── location: { latitude, longitude, address }
│       ├── severity: "Immediate"
│       ├── createdAt: ISO string
│       └── ... (other report fields)
└── civilian account/
    └── {userId}/
        └── crime reports/
            └── {timestamp}/
                └── ... (same as above)
```

## Implementation Guide

### 1. Smartphone App (Already Implemented)

#### Starting Monitoring
```typescript
import { deviceDiscoveryService } from './services/deviceDiscoveryService';
import { auth } from './firebaseConfig';

const userId = auth.currentUser!.uid;
const deviceId = 'your_smartwatch_device_id'; // e.g., 'watch_abc123'

deviceDiscoveryService.startDistanceMonitoring(userId, deviceId);
```

#### Stopping Monitoring
```typescript
deviceDiscoveryService.stopDistanceMonitoring();
```

### 2. Smartwatch App Requirements

#### Firebase Setup
1. **Initialize Firebase** (use same config as phone app)
2. **Structure your device ID consistently** (recommended: `watch_{MAC_ADDRESS}` or `watch_{UUID}`)

#### Location Update Implementation

```typescript
// Your watch app needs to:

import { getDatabase, ref, set } from 'firebase/database';
import { getCurrentPosition } from 'your-location-library'; // e.g., expo-location

const deviceId = 'watch_abc123'; // Your unique watch ID
const database = getDatabase();

async function updateWatchLocation() {
  try {
    // Get current GPS location
    const position = await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 10000
    });
    
    const locationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: Date.now()
    };
    
    // Update to Firebase
    const locationRef = ref(database, `device_locations/${deviceId}`);
    await set(locationRef, locationData);
    
    console.log('Location updated:', locationData);
  } catch (error) {
    console.error('Failed to update location:', error);
  }
}

// Update location every 20 seconds
setInterval(updateWatchLocation, 20000);
```

#### Required Permissions (Wear OS)
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### 3. Database Paths Reference

#### Reading Smartwatch Location (Phone App)
```typescript
// Already implemented in deviceDiscoveryService
const watchLocation = await deviceDiscoveryService.getDeviceLocation(deviceId);
// Returns: { latitude, longitude, timestamp } | null
```

#### Writing Location Updates (Watch App)
```
Path: device_locations/{deviceId}
Method: set() or update()
```

#### Reading Theft Reports (Both Apps)
```
Path: civilian/civilian crime reports/{reportId}
Path: civilian/civilian account/{userId}/crime reports/{reportId}
```

### 4. Integration Checklist

#### Smartwatch App Must:
- [ ] Initialize Firebase with correct config
- [ ] Have unique device ID registered in `user_pairings/{userId}/paired_devices/{deviceId}`
- [ ] Update location every 10-30 seconds to `device_locations/{deviceId}`
- [ ] Handle GPS permissions
- [ ] Handle network connectivity issues

#### Smartphone App Must:
- [ ] Call `startDistanceMonitoring(userId, deviceId)` when app loads
- [ ] Use same `deviceId` that watch app is writing to
- [ ] Have background location permissions for continuous monitoring

### 5. Workflow Diagram

```
┌─────────────────┐
│  Smartwatch App │
│   (Location)    │
└────────┬────────┘
         │ Every 10-30s
         │ Write location
         ↓
┌─────────────────────────────────┐
│    Firebase Realtime Database   │
│  device_locations/{deviceId}    │
└────────┬────────────────────────┘
         │ Every 10s
         │ Read location
         ↓
┌─────────────────┐      ┌─────────────────┐
│  Smartphone App │─────→│ Distance Calc   │
│  (Monitoring)   │      │ (Haversine)     │
└─────────────────┘      └────────┬────────┘
                                  │ If > 5m
                                  ↓
                         ┌─────────────────┐
                         │ Trigger Theft   │
                         │ SOS Report      │
                         └─────────────────┘
```

## Testing

### 1. Verify Watch Location Updates
```typescript
// In your Firebase console or watch app logs, verify:
device_locations/watch_abc123/
  latitude: 14.5995
  longitude: 120.9842
  timestamp: 1704067200000
```

### 2. Test Distance Calculation
- Place devices at known distances (e.g., 3m, 10m, 20m)
- Verify console logs show correct distances
- Verify theft SOS triggers only when > 5m

### 3. Test Edge Cases
- Watch offline → should log "Watch location not found"
- GPS unavailable → should handle gracefully
- Rapid distance changes → spam prevention (1 minute cooldown)

## Troubleshooting

### Issue: SOS Not Triggering
**Check:**
1. Watch location being written to Firebase?
2. Phone reading correct `deviceId`?
3. GPS permissions granted on both devices?
4. Distance actually > 5 meters?
5. Console logs show distance calculations?

### Issue: Watch Location Not Updating
**Check:**
1. Firebase config correct on watch?
2. Network connectivity on watch?
3. GPS enabled on watch?
4. Permissions granted on watch?

### Issue: High Battery Drain
**Solutions:**
- Increase update interval (20s → 30s)
- Reduce GPS accuracy requirement
- Implement geofencing to reduce updates when stationary

## Configuration

### Adjustable Parameters
```typescript
// In deviceDiscoveryService.ts

// Line ~405: Monitoring frequency
setInterval(..., 10000); // Change 10000ms (10s) to desired interval

// Line ~413: Distance threshold
if (distance > 5) { // Change 5 to desired meters

// Line ~305: Spam prevention cooldown
if (now - this.lastSOSTrigger < 60000) { // Change 60000ms (1 min)
```

## Security Notes

1. **Device ID**: Use consistent, unique ID (not user-controlled)
2. **Authentication**: Watch app should authenticate with Firebase
3. **Permissions**: Enforce location permissions on both devices
4. **Rate Limiting**: Spam prevention already implemented (1 minute cooldown)

## Next Steps

1. Implement location updates in your smartwatch app
2. Test with both devices in same location (should not trigger)
3. Test with devices 10m apart (should trigger theft SOS)
4. Monitor Firebase console for location updates and SOS reports
5. Verify reports appear in app's crime report list
