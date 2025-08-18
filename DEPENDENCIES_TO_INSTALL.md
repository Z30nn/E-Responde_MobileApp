# Dependencies to Install

To make the crime report form work properly, you need to install the following packages:

## Required Dependencies

```bash
npm install @react-native-picker/picker @react-native-community/datetimepicker
```

## What These Packages Do

1. **@react-native-picker/picker** - Provides the dropdown picker for crime types
2. **@react-native-community/datetimepicker** - Provides date and time picker components

## Installation Steps

1. **Stop your Metro bundler** if it's running
2. **Install the packages:**
   ```bash
   cd MobileApp
   npm install @react-native-picker/picker @react-native-community/datetimepicker
   ```
3. **For Android, you may need to run:**
   ```bash
   npx react-native run-android
   ```
4. **For iOS, you may need to run:**
   ```bash
   cd ios && pod install && cd ..
   npx react-native run-ios
   ```

## Alternative: Using Expo Location

If you want to use real GPS location instead of mock coordinates, you can also install:

```bash
npm install expo-location
```

Then update the `getCurrentLocation` function in `CrimeReportForm.tsx` to use real GPS.

## Current Implementation

The form currently uses mock coordinates (Manila, Philippines) for demonstration purposes. Once you install the dependencies, the form will work with:

- ✅ Crime type dropdown
- ✅ Date and time pickers
- ✅ Description text area
- ✅ Location (currently mock, can be real GPS)
- ✅ Multimedia upload buttons (UI only for now)
- ✅ Anonymous reporting toggle
- ✅ Firebase integration

## Database Structure

The crime reports will be stored in two locations:

1. **`civilian/civilian crime reports/{reportId}`** - All crime reports
2. **`civilian/civilian account/{uid}/crime reports/{reportId}`** - User's personal crime reports

Each report includes:
- Crime type, date/time, description
- Location coordinates and address
- Anonymous flag and reporter information
- Status and creation timestamp
