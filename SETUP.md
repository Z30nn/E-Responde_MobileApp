# 🚀 E-Responde Setup Guide

Complete installation and setup instructions for the E-Responde mobile application.

---

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Firebase Setup](#firebase-setup)
- [Running the App](#running-the-app)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- **Node.js** >= 18
- **React Native development environment** set up
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Firebase project** with Realtime Database and Storage
- **Google Maps API key** (for maps functionality)

### Environment Setup

Follow the official React Native environment setup guide:
- [React Native - Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment)

---

## Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd E-Responde_MobileApp
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- **Firebase** (v12.3.0) - Backend services
- **React Native WebRTC** - VoIP calling
- **Formik & Yup** - Form management and validation
- **React Native Maps** - Location services
- **Expo Sensors** - Gyroscope for shake detection

### 3. iOS-Specific Setup (macOS only)

Install Ruby bundler for CocoaPods:

```bash
bundle install
```

Install CocoaPods dependencies:

```bash
cd ios
bundle exec pod install
cd ..
```

### 4. Clear Cache (Recommended)

Clear Metro bundler cache for a fresh start:

```bash
npm start -- --reset-cache
```

Or manually clear all caches:

```bash
# Clear watchman
watchman watch-del-all

# Delete node_modules and reinstall
rm -rf node_modules
npm install

# Clear Metro cache
npm start -- --reset-cache
```

---

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Add Android app (and iOS if needed)

### 2. Download Configuration Files

#### For Android:
1. Download `google-services.json`
2. Place it in `android/app/google-services.json`

#### For iOS:
1. Download `GoogleService-Info.plist`
2. Place it in `ios/MobileApp/GoogleService-Info.plist`

### 3. Update Firebase Configuration

Create or update `firebaseConfig.ts` in the root directory:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
```

### 4. Firebase Database Rules

Set up the following Realtime Database rules:

```json
{
  "rules": {
    "civilian": {
      "civilian account": {
        "$userId": {
          ".read": "$userId === auth.uid || root.child('police/police account/' + auth.uid).exists()",
          ".write": "$userId === auth.uid"
        }
      },
      "civilian crime reports": {
        ".read": "auth != null",
        "$reportId": {
          ".write": "auth != null"
        }
      },
      "emergency_contacts": {
        "$userId": {
          ".read": "$userId === auth.uid",
          ".write": "$userId === auth.uid"
        }
      }
    },
    "police": {
      "police account": {
        "$userId": {
          ".read": "$userId === auth.uid || root.child('police/police account/' + auth.uid).exists()",
          ".write": "$userId === auth.uid || root.child('police/police account/' + auth.uid).exists()"
        }
      }
    },
    "voip_calls": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "voip_signaling": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### 5. Firebase Storage Rules

Set up the following Storage rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /crime-reports/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.resource.size < 10 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*|video/.*|audio/.*');
    }
  }
}
```

### 6. Enable Authentication Methods

In Firebase Console:
1. Go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** authentication
3. (Optional) Enable **Google Sign-In** if needed

---

## Running the App

### Start Metro Bundler

First, start the Metro development server:

```bash
npm start
```

### Run on Android

In a new terminal:

```bash
npm run android
```

Or build directly from Android Studio:
1. Open `android/` folder in Android Studio
2. Click **Run** button

### Run on iOS (macOS only)

In a new terminal:

```bash
npm run ios
```

Or build directly from Xcode:
1. Open `ios/MobileApp.xcworkspace` in Xcode
2. Select target device/simulator
3. Click **Run** button

---

## Verify Installation

### Check TypeScript

```bash
npx tsc --noEmit
```

Should complete with no errors.

### Run Linter

```bash
npm run lint
```

Fix any linting issues.

### Test Basic Functionality

1. ✅ **App Launch** - App should start without crashes
2. ✅ **Welcome Screen** - Should display properly
3. ✅ **Login Screen** - Should accept email/password
4. ✅ **Registration** - Should create new civilian account
5. ✅ **Dashboard** - Should load with all tabs
6. ✅ **SOS Button** - Should be accessible
7. ✅ **Crime Reports** - Should load and display

---

## Troubleshooting

### Cannot Find Module 'formik'

```bash
rm -rf node_modules package-lock.json
npm install
```

### Metro Bundler Cache Issues

```bash
# Clear all caches
rm -rf node_modules
rm -rf ios/build
rm -rf android/build
rm -rf android/app/build
npm install
npm start -- --reset-cache
```

### Android Build Fails

```bash
cd android
./gradlew clean
cd ..
npm run android
```

### iOS Build Fails

```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### Firebase Connection Issues

1. Verify `google-services.json` is in correct location
2. Check `firebaseConfig.ts` has correct credentials
3. Ensure Firebase project has the correct package name
4. Check internet connection

### VoIP Calls Not Working

1. Ensure both users are authenticated
2. Check Firebase Realtime Database rules
3. Verify `voip_calls` and `voip_signaling` paths exist
4. Check microphone and camera permissions
5. Test on real devices (VoIP doesn't work well in emulators)

### Maps Not Displaying

1. Ensure Google Maps API key is configured
2. Check `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <meta-data
     android:name="com.google.android.geo.API_KEY"
     android:value="YOUR_GOOGLE_MAPS_API_KEY"/>
   ```
3. Enable **Maps SDK for Android** in Google Cloud Console

### TypeScript Strict Mode Errors

Temporarily disable strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": false
  }
}
```

### React Native Version Mismatch

```bash
npm install react-native@0.80.2
npm install react@19.1.0
```

---

## Environment Variables

Create a `.env` file (if using environment variables):

```env
GOOGLE_MAPS_API_KEY=your_api_key_here
FIREBASE_API_KEY=your_firebase_api_key
```

**Note:** Never commit `.env` to version control. Add it to `.gitignore`.

---

## Additional Configuration

### Android Permissions

Ensure these permissions are in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

### iOS Permissions

Ensure these keys are in `ios/MobileApp/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>E-Responde needs camera access for crime report photos</string>
<key>NSMicrophoneUsageDescription</key>
<string>E-Responde needs microphone access for voice calls</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>E-Responde needs your location for crime reports and SOS</string>
```

---

## Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Firebase configured (config files in place)
- [ ] Cache cleared
- [ ] App runs on Android
- [ ] App runs on iOS (if applicable)
- [ ] Login works
- [ ] Dashboard loads
- [ ] All tabs functional
- [ ] SOS button works
- [ ] Crime reports load
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No linter errors (`npm run lint`)

---

## Next Steps

After successful installation:

1. Review [FEATURES.md](./FEATURES.md) for detailed feature documentation
2. Check [TESTING.md](./TESTING.md) for testing procedures
3. Read [CHANGELOG.md](./CHANGELOG.md) for recent changes

---

## Need Help?

If you encounter issues not covered here:

1. Check the console/logs for error messages
2. Verify all configuration files are correct
3. Ensure Firebase rules are properly set
4. Review the [FEATURES.md](./FEATURES.md) documentation
5. Check the [Troubleshooting](#troubleshooting) section above

---

**Happy Coding! 🎉**

