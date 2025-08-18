# Firebase Setup Guide

This guide will help you set up Firebase for your React Native mobile app to enable user authentication and database functionality.

## Prerequisites

- A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))
- React Native project with Firebase dependencies already installed

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select an existing project
3. Follow the setup wizard to create your project

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Click "Save"

## Step 3: Set up Realtime Database

1. In your Firebase project, go to "Realtime Database" in the left sidebar
2. Click "Create database"
3. Choose a location (select the closest to your users)
4. Start in "test mode" for development (you can secure it later)
5. Click "Done"

## Step 4: Configure Database Rules

1. In the Realtime Database, go to the "Rules" tab
2. Update the rules to allow read/write access for authenticated users:

```json
{
  "rules": {
    "civilian": {
      "civilian account": {
        "$uid": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        }
      }
    }
  }
}
```

## Step 5: Get Firebase Configuration

1. In your Firebase project, click the gear icon next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web app icon (</>) to add a web app
5. Give it a name (e.g., "MobileApp")
6. Copy the configuration object

## Step 6: Update Firebase Config

1. Open `MobileApp/firebaseConfig.ts`
2. Replace the placeholder values with your actual Firebase configuration:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

## Step 7: Test the App

1. Run your React Native app
2. Try to register a new user
3. Check the Firebase Console to see if the user data appears in the Realtime Database under `civilian/civilian account/{uid}`
4. Try logging in with the registered credentials

## Database Structure

The app will create the following structure in your Firebase Realtime Database:

```
civilian/
  civilian account/
    {user_uid}/
      firstName: "John"
      lastName: "Doe"
      email: "john@example.com"
      createdAt: "2024-01-01T00:00:00.000Z"
      uid: "user_uid"
```

## Security Notes

- The current setup uses test mode for development
- For production, implement proper security rules
- Consider adding email verification
- Implement password reset functionality
- Add rate limiting for login attempts

## Troubleshooting

### Common Issues:

1. **"Firebase App named '[DEFAULT]' already exists"**
   - Make sure you're only calling `initializeApp()` once

2. **"Permission denied"**
   - Check your database rules
   - Ensure authentication is working properly

3. **"Network request failed"**
   - Check your internet connection
   - Verify the database URL is correct

4. **"User not found in civilian database"**
   - This means the user exists in Firebase Auth but not in your custom database
   - Check if the registration process completed successfully

### Debug Tips:

- Use `console.log()` to debug Firebase operations
- Check the Firebase Console for authentication logs
- Verify database rules are properly set
- Test with simple database operations first

## Next Steps

After successful setup, consider implementing:

- User profile management
- Password reset functionality
- Email verification
- Social authentication (Google, Facebook)
- Offline data synchronization
- Push notifications
