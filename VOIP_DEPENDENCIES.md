# VoIP Dependencies Installation Guide

## Required Packages

Run these commands to install the necessary packages:

```bash
# Install React Native WebRTC
npm install react-native-webrtc --save

# Install additional dependencies
npm install @react-native-community/netinfo --save
npm install react-native-incall-manager --save
npm install react-native-callkeep --save

# For Android, link native modules (if not auto-linked)
cd android && ./gradlew clean
cd ..

# For iOS, install pods
cd ios && pod install
cd ..
```

## Android Configuration

### 1. Update `android/app/build.gradle`

Add these permissions and configurations:

```gradle
android {
    // ... existing config
    
    defaultConfig {
        // ... existing config
        minSdkVersion 24  // WebRTC requires minimum SDK 24
    }
    
    packagingOptions {
        pickFirst '**/libc++_shared.so'
        pickFirst '**/libfbjni.so'
    }
}

dependencies {
    // ... existing dependencies
    implementation "androidx.swiperefreshlayout:swiperefreshlayout:1.0.0"
}
```

### 2. Update `android/app/src/main/AndroidManifest.xml`

Add these permissions:

```xml
<manifest>
    <!-- Existing permissions -->
    
    <!-- WebRTC Permissions -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    
    <!-- CallKeep Permissions (for call notifications) -->
    <uses-permission android:name="android.permission.BIND_TELECOM_SERVICE"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.CALL_PHONE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    
    <application>
        <!-- Existing config -->
    </application>
</manifest>
```

### 3. Update `android/build.gradle`

Ensure you have:

```gradle
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 24
        compileSdkVersion = 34
        targetSdkVersion = 34
    }
}
```

## iOS Configuration

### 1. Update `ios/Podfile`

```ruby
platform :ios, '12.4'

target 'MobileApp' do
  # ... existing config
  
  # Permissions
  permissions_path = '../node_modules/react-native-permissions/ios'
  pod 'Permission-Camera', :path => "#{permissions_path}/Camera"
  pod 'Permission-Microphone', :path => "#{permissions_path}/Microphone"
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['ENABLE_BITCODE'] = 'NO'
    end
  end
end
```

### 2. Update `ios/MobileApp/Info.plist`

Add these permissions:

```xml
<dict>
    <!-- Existing keys -->
    
    <!-- WebRTC Permissions -->
    <key>NSCameraUsageDescription</key>
    <string>E-Responde needs camera access for video calls with emergency responders</string>
    
    <key>NSMicrophoneUsageDescription</key>
    <string>E-Responde needs microphone access for voice calls with emergency responders</string>
    
    <!-- Background modes for calls -->
    <key>UIBackgroundModes</key>
    <array>
        <string>audio</string>
        <string>voip</string>
    </array>
</dict>
```

## Verify Installation

After installation, verify by checking:

```bash
# Check if packages are installed
npm list react-native-webrtc
npm list react-native-incall-manager
npm list react-native-callkeep

# Rebuild the app
# Android
cd android && ./gradlew clean && cd ..
npx react-native run-android

# iOS
cd ios && pod install && cd ..
npx react-native run-ios
```

## Common Issues

### Issue: Build fails on Android with "Duplicate class" error

**Solution**: Clean and rebuild
```bash
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace
cd ..
```

### Issue: iOS build fails with pod errors

**Solution**: Update and reinstall pods
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Issue: WebRTC doesn't work on Android emulator

**Solution**: WebRTC requires real devices for audio/video. Test on physical devices.

### Issue: Camera/Microphone permissions not working

**Solution**: 
- Android: Check runtime permissions in code
- iOS: Verify Info.plist has usage descriptions
- Test on physical device, not emulator

## Next Steps

After successful installation:
1. Test that the app builds successfully
2. Verify permissions are requested on app launch
3. Proceed with VoIP service implementation

## Testing Checklist

- [ ] App builds successfully on Android
- [ ] App builds successfully on iOS
- [ ] Camera permission requested correctly
- [ ] Microphone permission requested correctly
- [ ] No build errors related to WebRTC
- [ ] App runs on physical device (required for WebRTC testing)

---

**Note**: WebRTC requires **physical devices** for testing. Emulators don't support camera/microphone properly.

