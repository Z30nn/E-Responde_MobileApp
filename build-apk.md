# Building Production APK

## Steps to build a stable production APK:

### 1. Clean the project
```bash
cd android
./gradlew clean
cd ..
npx react-native clean
```

### 2. Build the APK
```bash
cd android
./gradlew assembleRelease
```

### 3. Find your APK
The APK will be located at:
`android/app/build/outputs/apk/release/app-release.apk`

## Common Issues Fixed:

1. **Console.log crashes**: All console.log statements are now wrapped with `__DEV__` checks
2. **Error boundaries**: Added ErrorBoundary component to catch crashes
3. **Null reference errors**: Fixed gyroscope service callback issues
4. **Authentication errors**: Added proper error handling and timeouts

## Testing:
1. Install the APK on your device
2. Test login functionality
3. Test gyroscope/SOS features
4. Test VoIP calling
5. Check that the app doesn't crash on startup

## If you still have issues:
1. Check the device logs: `adb logcat | grep -i "react"`
2. Enable USB debugging and check for specific error messages
3. Try building with different build variants (debug vs release)
