# 📝 E-Responde Changelog

Record of all major changes, features, and improvements to the E-Responde mobile application.

---

## Table of Contents
- [Latest Updates](#latest-updates)
- [VoIP System](#voip-system)
- [Code Refactoring](#code-refactoring)
- [Police System](#police-system)
- [Email Verification](#email-verification)
- [User Suspension](#user-suspension)
- [Media Upload System](#media-upload-system)
- [Crime Map Improvements](#crime-map-improvements)
- [Other Improvements](#other-improvements)

---

## Latest Updates

### October 2024 - VoIP System Major Improvements

**Issues Fixed:**
1. ✅ **App-Wide Call Reception** - Calls can now be received from anywhere in the app
2. ✅ **Duplicate Call Prevention** - Fixed multiple notifications after declining
3. ✅ **Real-Time UI Sync** - Both caller and receiver screens now properly synchronized

**New Files:**
- `services/voipContext.tsx` - Global VoIP context provider
- `VOIP_IMPROVEMENTS_SUMMARY.md` - Detailed documentation
- `VOIP_TESTING_GUIDE.md` - Comprehensive testing guide

**Modified Files:**
- `App.tsx` - Added VoIPProvider and global call UI
- `services/voipService.ts` - Added listenToCallStatus() method
- `components/voice-call-screen/index.tsx` - Real-time status monitoring
- `CrimeReportDetail.tsx` - Simplified, uses global context

**Key Changes:**
- Global incoming call listener runs app-wide
- Duplicate calls prevented with call tracking Set
- Real-time Firebase listeners for call status
- Automatic call screen management
- Improved error handling

**Benefits:**
- Never miss calls regardless of location in app
- No duplicate notifications
- Better user experience with synchronized UI
- Cleaner architecture with global state management

See [VOIP_IMPROVEMENTS_SUMMARY.md](./VOIP_IMPROVEMENTS_SUMMARY.md) for details.

---

## VoIP System

### Initial Implementation

**Date:** September 2024

**Features Added:**
- Voice calling between civilians and assigned police officers
- WebRTC integration for peer-to-peer calls
- Firebase Realtime Database for signaling
- Call controls (mute, speaker, end call)
- Incoming call modal
- Call screen with duration timer

**Files Created:**
- `services/voipService.ts` - VoIP service class
- `components/incoming-call-modal/` - Incoming call UI
- `components/voice-call-screen/` - Active call UI

**Dependencies Added:**
```json
{
  "react-native-webrtc": "^124.0.7",
  "react-native-incall-manager": "^4.1.0"
}
```

**Firebase Structure:**
```
voip_calls/
  {callId}/
    - caller: {...}
    - callee: {...}
    - status: 'ringing' | 'answered' | 'ended' | 'rejected'
    - createdAt: timestamp

voip_signaling/
  {callId}/
    - offer: {...}
    - answer: {...}
    - iceCandidates/
```

**Limitations:**
- Initially only worked in crime report screen
- Had duplicate notification issues
- UI sync problems between caller and receiver

---

## Code Refactoring

### September 2024 - Major Codebase Restructuring

**Objective:** Improve code organization, maintainability, and scalability.

**Changes Made:**

#### 1. Migrated Screens to `app/` Directory ✅

**Before:**
```
Root directory with inline styles:
├── Login.tsx
├── Register.tsx
├── Dashboard.tsx (2,693 lines!)
├── ChangePassword.tsx
└── CrimeReportForm.tsx
```

**After:**
```
Organized app structure:
app/
├── dashboard/
│   ├── index.tsx (220 lines)
│   ├── styles.ts
│   └── tabs/ (6 modular components)
├── login/
│   ├── index.tsx
│   └── styles.ts
├── register/
│   ├── index.tsx
│   └── styles.ts
├── change-password/
│   ├── index.tsx
│   └── styles.ts
└── crime-report/
    ├── form/
    ├── detail/
    └── list/
```

**Benefits:**
- Dashboard reduced from 2,693 to 220 lines
- Separated concerns (UI, styles, logic)
- Modular tabs for easier maintenance
- Better code navigation

#### 2. Created Service Layer ✅

**New Services:**
- `services/apis/` - Centralized API layer
- `services/constants/` - App-wide constants
- `services/utils/logger.ts` - Logging utility
- `services/utils/validation-schemas.ts` - Form validation

**Benefits:**
- Consistent API calls across app
- Easy to mock for testing
- Single source of truth for constants
- Production-ready logging

#### 3. Implemented Formik + Yup ✅

**Forms Updated:**
- Login form
- Registration form
- Change password form
- Crime report form

**Benefits:**
- Consistent validation
- Better error messages
- Cleaner form code
- Built-in form state management

#### 4. Added TypeScript Strict Mode ✅

**Changes:**
- Enabled strict type checking
- Fixed type errors across codebase
- Added proper interfaces
- Removed `any` types where possible

**Impact:**
- Caught bugs before runtime
- Better IDE autocomplete
- Improved code quality
- Easier refactoring

---

## Police System

### September 2024 - Police Dashboard & Authentication

**Features Added:**
- Separate police authentication system
- Police dashboard with crime report monitoring
- Police location tracking
- Crime report assignment to officers
- Real-time police locations on map

**Database Structure:**
```
police/
  police account/
    {userId}/
      - email
      - badgeNumber
      - firstName
      - lastName
      - station
      - currentLocation/
```

**Files Created:**
- `app/police-dashboard/index.tsx` - Police main dashboard
- `components/police-crime-list/` - Crime reports list for police
- `components/police-crime-map/` - Map view for police

**Authentication Flow:**
```
Login → Check if email in police DB
         ├─ YES → Police Dashboard (no verification)
         └─ NO  → Civilian Dashboard (requires verification)
```

**Police Features:**
- View all crime reports
- Filter by status, severity, location
- View report details
- Update report status
- Call reporter (VoIP)
- View-only voting

**Location Tracking:**
- Auto-updates every 30 seconds
- Stored in Firebase
- Displayed on civilian map
- Shows nearby officers

---

## Email Verification

### August 2024 - Email Verification System

**Problem:** Unverified users could access the app.

**Solution:** Implemented email verification requirement for civilian accounts.

**Features Added:**
- Automatic verification email on registration
- Email verification screen
- Resend verification option
- Verification status check on login
- Force logout if not verified

**Files Created:**
- `components/email-verification/` - Verification UI

**Flow:**
```
Register → Email Sent → User Verifies → Access Granted
         ↓
         Block App Access Until Verified
```

**Exceptions:**
- Police accounts: No verification required
- Admin accounts: No verification required

**Firebase Integration:**
```typescript
// Check verification
if (!user.emailVerified) {
  // Show verification screen
  // Block access
}

// Send verification
await sendEmailVerification(user);
```

---

## User Suspension

### August 2024 - User Suspension & Force Logout

**Problem:** No way to suspend misbehaving users.

**Solution:** Implemented suspension system with force logout.

**Features Added:**
- Suspend user accounts
- Automatic force logout for suspended users
- Suspension reasons
- Temporary or permanent suspension
- Suspension expiry dates

**Database Structure:**
```javascript
{
  "civilian account": {
    "[userId]": {
      "suspended": true,
      "suspensionReason": "Violation of terms",
      "suspendedAt": "2024-08-15T10:30:00Z",
      "suspensionExpiry": "2024-09-15T10:30:00Z" // or null
    }
  }
}
```

**Implementation:**
- Background service checks suspension every 30 seconds
- If suspended, user is immediately logged out
- Cannot login while suspended
- Suspension message displayed

**Admin Features:**
- Suspend/unsuspend users
- Set expiry dates
- Add suspension reasons
- View suspension history

---

## Media Upload System

### July 2024 - Firebase Storage Integration

**Problem:** Media files stored as base64 in database (inefficient).

**Solution:** Migrated to Firebase Storage.

**Features Added:**
- Upload photos to Firebase Storage
- Upload videos to Firebase Storage
- Upload audio files
- Generate download URLs
- Delete media files
- Size limits and validation

**Storage Structure:**
```
crime-reports/
  {timestamp}_{filename}
```

**Storage Rules:**
```javascript
allow read: if request.auth != null;
allow write: if request.auth != null
  && request.resource.size < 10 * 1024 * 1024
  && request.resource.contentType.matches('image/.*|video/.*|audio/.*');
```

**Service Methods:**
```typescript
FirebaseService.uploadFileToStorage(uri, filename, folder);
FirebaseService.deleteFileFromStorage(url);
```

**Benefits:**
- Smaller database size
- Faster queries
- Better performance
- Automatic CDN delivery
- Proper file management

---

## Crime Map Improvements

### June 2024 - Enhanced Crime Report Mapping

**Features Added:**
- Interactive crime report map
- Color-coded markers by severity
- Marker clustering for dense areas
- Filter by crime type
- Filter by date range
- Custom map styles

**Marker Colors:**
- 🔴 **Red** - Immediate severity
- 🟠 **Orange** - High severity
- 🟡 **Yellow** - Moderate severity
- 🟢 **Green** - Low severity

**Features:**
- Tap marker to view report details
- Distance calculation from user
- Search by location
- Heatmap view option
- Police location overlay

**Files Modified:**
- `CrimeReportMap.tsx` - Enhanced mapping features
- `components/police-crime-map/` - Police-specific map view

---

## Other Improvements

### Automatic Location Detection

**Date:** July 2024

**Features:**
- Auto-detect user location on app launch
- Auto-fill location in crime reports
- Auto-fill location in SOS alerts
- Permission handling
- Fallback to manual selection

**Implementation:**
```typescript
// Uses @react-native-community/geolocation
Geolocation.getCurrentPosition(
  (position) => {
    // Set location
  },
  (error) => {
    // Handle error
  },
  { enableHighAccuracy: true }
);
```

---

### Duplicate User Prevention

**Date:** August 2024

**Features:**
- Check email before registration
- Check phone number before registration
- Case-insensitive email comparison
- Proper error messages
- Firebase query optimization

**Implementation:**
```typescript
// Check email
const emailQuery = query(
  ref(database, 'civilian/civilian account'),
  orderByChild('email'),
  equalTo(email.toLowerCase())
);

// Check phone
const phoneQuery = query(
  ref(database, 'civilian/civilian account'),
  orderByChild('contactNumber'),
  equalTo(phone)
);
```

---

### Gyroscope SOS Detection

**Date:** June 2024

**Features:**
- Shake device to trigger SOS
- Gyroscope sensitivity settings
- Enable/disable in settings
- Visual feedback on shake detection
- Cooldown period between triggers

**Implementation:**
```typescript
import { Gyroscope } from 'expo-sensors';

Gyroscope.addListener((data) => {
  const totalAcceleration = Math.sqrt(
    data.x ** 2 + data.y ** 2 + data.z ** 2
  );
  
  if (totalAcceleration > threshold) {
    // Trigger SOS countdown
  }
});
```

---

### Theme & Language Support

**Date:** May 2024

**Features:**
- Light/dark theme toggle
- English/Filipino languages
- Persistent user preferences
- System theme detection
- Easy to add more languages

**Implementation:**
- `services/themeContext.tsx` - Theme management
- `services/languageContext.tsx` - Language management
- AsyncStorage for persistence

---

### Notification System

**Date:** June 2024

**Features:**
- In-app notifications
- Real-time notification listener
- Notification history
- Mark as read/unread
- Delete notifications
- Notification settings
- Quiet hours

**Notification Types:**
- Crime report updates
- SOS alerts
- Emergency updates
- App updates
- Security alerts

---

## Breaking Changes

### v1.0.0 → v1.1.0 (September 2024)

**Breaking Changes:**
- Dashboard component moved to `app/dashboard/`
- Login/Register moved to `app/` directory
- Direct Firebase imports deprecated (use `apis` layer)
- Some prop names changed for consistency

**Migration Guide:**
```typescript
// OLD
import Dashboard from './Dashboard';

// NEW
import Dashboard from './app/dashboard';

// OLD
import { FirebaseService } from './services/firebaseService';
await FirebaseService.loginCivilian(email, password);

// NEW
import { apis } from './services/apis';
await apis.auth.login(email, password);
```

---

## Deprecations

### Deprecated (Will be removed in v2.0.0)

- ❌ Root-level component files (use `app/` structure)
- ❌ Direct `console.log` (use `logger` utility)
- ❌ Hardcoded strings (use `constants`)
- ❌ Direct Firebase calls in components (use `apis`)
- ❌ Inline styles (use separate `styles.ts`)

---

## Known Issues

### Current Limitations

1. **VoIP Calls**
   - Don't work well in emulators (test on real devices)
   - No push notifications when app is closed
   - No call history UI yet

2. **Offline Mode**
   - Limited offline functionality
   - Requires internet for most features
   - No offline queue for reports

3. **Performance**
   - Large media files slow down uploads
   - Many markers on map can lag
   - Need pagination for report lists

4. **Platform Differences**
   - Some features Android-only
   - iOS build requires macOS
   - Different permission flows

---

## Roadmap

### Planned for v2.0.0

- [ ] Push notifications for VoIP calls
- [ ] Call history UI
- [ ] Offline mode improvements
- [ ] Report pagination
- [ ] Image compression before upload
- [ ] Video call support
- [ ] In-app chat
- [ ] Admin web dashboard
- [ ] Analytics and reporting
- [ ] Multi-language support (more languages)

### Under Consideration

- [ ] AI-powered report categorization
- [ ] Voice-to-text for reports
- [ ] SMS alerts for SOS
- [ ] Geofencing alerts
- [ ] Patrol routing for police
- [ ] Crime statistics dashboard
- [ ] Community forums
- [ ] Reward system for active users

---

## Contributors

- Development Team
- QA Team
- UI/UX Designers
- Project Managers

---

## Version History

| Version | Date | Major Changes |
|---------|------|---------------|
| v1.2.0 | Oct 2024 | VoIP improvements, global call handling |
| v1.1.0 | Sep 2024 | Code refactoring, police system |
| v1.0.5 | Aug 2024 | Email verification, user suspension |
| v1.0.0 | Jul 2024 | Initial release |

---

For setup instructions, see [SETUP.md](./SETUP.md).
For feature details, see [FEATURES.md](./FEATURES.md).
For testing, see [TESTING.md](./TESTING.md).

