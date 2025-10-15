# 📱 E-Responde Features Documentation

Complete guide to all features in the E-Responde emergency response mobile application.

---

## Table of Contents
- [VoIP Calling System](#voip-calling-system)
- [Police System](#police-system)
- [Email Verification](#email-verification)
- [User Suspension System](#user-suspension-system)
- [SOS Emergency Alert](#sos-emergency-alert)
- [Crime Reporting](#crime-reporting)
- [Emergency Contacts](#emergency-contacts)
- [Location Services](#location-services)
- [Notifications](#notifications)

---

## VoIP Calling System

### Overview
Real-time voice calling between civilians and police officers assigned to their reports using WebRTC technology.

### Key Features
- ✅ **App-Wide Call Reception** - Receive calls from anywhere in the app
- ✅ **Real-Time UI Sync** - Both parties see accurate call status
- ✅ **Duplicate Prevention** - No repeated call notifications
- ✅ **Call Controls** - Mute, speaker, end call
- ✅ **Call History** - Track all calls in Firebase

### How It Works

#### For Civilians
1. Open your crime report with an assigned officer
2. Tap "Call Officer" button
3. Wait for officer to answer
4. Conduct voice call
5. End call when finished

#### For Police
1. View crime report details
2. Tap "Call Reporter" button
3. Wait for civilian to answer
4. Conduct voice call
5. End call when finished

### Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                            │
│  ┌───────────────────────────────────────────────────┐ │
│  │              VoIPProvider                         │ │
│  │  - Global incoming call listener                 │ │
│  │  - Duplicate call prevention                     │ │
│  │  - Active call state management                  │ │
│  │  - Real-time status monitoring                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  Global UI Components:                                  │
│  ├─ IncomingCallModal (shows anywhere)                 │
│  └─ VoiceCallScreen (shows anywhere)                   │
└─────────────────────────────────────────────────────────┘
                          │
                          │ uses
                          ▼
        ┌────────────────────────────────┐
        │      VoIPService.ts            │
        │  - listenForIncomingCalls()    │
        │  - listenToCallStatus()        │
        │  - initiateCall()              │
        │  - answerCall()                │
        │  - rejectCall()                │
        │  - endCall()                   │
        └────────────────────────────────┘
```

### Call Flow
1. Caller initiates call → Creates record in Firebase with status "ringing"
2. Receiver gets notification globally → Incoming call modal appears
3. Receiver accepts → Status updates to "answered"
4. WebRTC connection established → Voice data transmitted
5. Either party ends call → Status updates to "ended"

### Permissions Required
- **Android**: RECORD_AUDIO, CAMERA
- **iOS**: NSMicrophoneUsageDescription

### Limitations
- Both users must be authenticated
- Only works between civilians and their assigned officers
- Requires internet connection
- Works best on real devices (not emulators)

For detailed implementation, see [VOIP_IMPROVEMENTS_SUMMARY.md](./VOIP_IMPROVEMENTS_SUMMARY.md)

---

## Police System

### Overview
Separate dashboard and authentication system for law enforcement officers to monitor and respond to crime reports.

### User Types
1. **Civilian** - Regular users who submit crime reports
2. **Police** - Law enforcement officers who monitor reports

### Police Dashboard Features
- 📊 View all crime reports (list and map view)
- 🗺️ Real-time location tracking on map
- 📞 Call reporters directly
- 📍 See crime hotspots
- 🔄 Update report status
- 📋 Assign officers to reports

### Database Structure

```
firebase
├── civilian/
│   ├── civilian account/
│   └── civilian crime reports/
└── police/
    └── police account/
        └── {userId}/
            ├── email: string
            ├── badgeNumber: string
            ├── firstName: string
            ├── lastName: string
            ├── station: string
            └── currentLocation: {
                latitude: number,
                longitude: number,
                lastUpdated: string
            }
```

### Authentication Flow
```
User Login
    ↓
Check if email in police database
    ↓
┌─────────┴─────────┐
Police Email       Civilian Email
    ↓                  ↓
Police Dashboard   Civilian Dashboard
```

### Police Features

#### 1. Crime Report Monitoring
- View all civilian-submitted reports
- Filter by status, severity, location
- See report details, photos, videos
- Cannot vote on reports (view-only)

#### 2. Location Tracking
- Police location auto-updates every 30 seconds
- Displayed on map for civilians to see nearby officers
- Location stored in Firebase Realtime Database

#### 3. Report Assignment
- Dispatchers can assign reports to specific officers
- Assigned officers can call reporters directly
- VoIP calling integrated for communication

#### 4. Status Updates
- Update report status: Reported → Received → In Progress → Resolved
- Status changes trigger notifications to reporters

### Creating Police Accounts

Police accounts must be created directly in Firebase:

```javascript
// In Firebase Console > Realtime Database
{
  "police": {
    "police account": {
      "[userId from Auth]": {
        "email": "officer@police.gov",
        "badgeNumber": "12345",
        "firstName": "John",
        "lastName": "Smith",
        "station": "Central Police Station"
      }
    }
  }
}
```

Then create the Firebase Auth account with the same email.

### Police-Specific Services

**Location Tracking**: `services/firebaseService.ts`
- `updatePoliceLocation()` - Update officer's current location
- `getAllPoliceLocations()` - Get all police locations for map

**Authentication**: `services/authContext.tsx`
- Auto-detects user type on login
- Routes to appropriate dashboard

---

## Email Verification

### Overview
Email verification system to ensure user authenticity before accessing the app.

### Features
- ✅ Automatic verification email on registration
- ✅ Resend verification email option
- ✅ Blocks unverified users from app access
- ✅ Verification status check on login
- ✅ Manual verification status refresh

### Flow
```
User Registers
    ↓
Firebase Auth Account Created
    ↓
Verification Email Sent
    ↓
User Clicks Link in Email
    ↓
Email Verified in Firebase
    ↓
User Can Access App
```

### Implementation

**Registration**:
```typescript
await FirebaseService.registerCivilian(userData);
// Verification email sent automatically
```

**Login Check**:
```typescript
const user = auth.currentUser;
if (!user.emailVerified) {
  // Show verification screen
  // Block access to app
}
```

**Resend Email**:
```typescript
await FirebaseService.sendEmailVerification(user);
```

### User Experience
1. User registers → Verification email sent
2. User sees email verification screen
3. User clicks "Resend Email" if needed
4. User checks email and clicks verification link
5. User returns to app and clicks "I've verified my email"
6. App checks verification status
7. If verified → Access granted

### Exceptions
- **Police users**: No email verification required
- **Admin users**: No email verification required

---

## User Suspension System

### Overview
Administrative system to suspend misbehaving users and force logout.

### Features
- 🔒 Suspend user accounts
- 🚪 Force logout suspended users
- 📧 Suspension email notifications
- ⏰ Temporary or permanent suspension
- 🔄 Reactivation capability

### Database Structure
```javascript
{
  "civilian": {
    "civilian account": {
      "[userId]": {
        "suspended": true,
        "suspensionReason": "Violation of terms",
        "suspendedAt": "2024-10-15T10:30:00Z",
        "suspendedBy": "adminUserId",
        "suspensionExpiry": "2024-11-15T10:30:00Z" // null for permanent
      }
    }
  }
}
```

### How It Works

**Suspend User**:
```typescript
await FirebaseService.suspendUser(userId, reason, expiryDate);
```

**Check Suspension**:
```typescript
const isSuspended = await FirebaseService.isUserSuspended(userId);
if (isSuspended) {
  // Force logout
  await auth.signOut();
}
```

**Automatic Logout**:
- App checks suspension status every 30 seconds
- If suspended, user is immediately logged out
- Suspension message displayed

### Admin Features
- View list of suspended users
- Suspend/unsuspend users
- Set suspension expiry dates
- Add suspension reasons
- Send suspension notifications

---

## SOS Emergency Alert

### Overview
One-tap emergency alert system that notifies emergency contacts with user's location.

### Activation Methods
1. **Button Press** - Tap SOS button on SOS tab
2. **Shake Detection** - Shake device vigorously (if enabled)

### Features
- 📍 Automatic location detection
- 📞 Sends to all emergency contacts
- 🔊 Plays alarm sound
- ⏱️ 10-second countdown (cancellable)
- 📊 SOS history tracking
- 🔄 Real-time status updates

### Shake Detection (Gyroscope)
- Uses device gyroscope sensor
- Detects vigorous shaking motion
- Can be enabled/disabled in settings
- Requires physical device (not emulator)

### Emergency Contacts
Users must add at least one emergency contact:
- Name, phone number, relationship
- Primary vs secondary contacts
- Maximum 3 primary contacts
- Unlimited secondary contacts

### SOS Flow
```
User Triggers SOS
    ↓
10-Second Countdown Starts
    ↓
Alarm Sound Plays
    ↓
[User Can Cancel]
    ↓
Get Current Location
    ↓
Send Notifications to All Emergency Contacts
    ↓
Show Success Message
    ↓
Save to SOS History
```

### Notification Content
```
🚨 EMERGENCY ALERT 🚨

[User Name] has triggered an emergency SOS alert!

Location: [Address]
Time: [Timestamp]
Map: [Google Maps Link]

Please check on them immediately!
```

### SOS History
- View all sent SOS alerts
- See recipients and delivery status
- Map view of SOS location
- Timestamp and details

---

## Crime Reporting

### Overview
Citizens can report crimes with photos, videos, location, and detailed descriptions.

### Report Types
- Theft
- Assault
- Vandalism
- Drug Activity
- Suspicious Activity
- Traffic Accident
- Other

### Report Severity Levels
1. **Immediate** - Requires urgent police response
2. **High** - Serious crime, needs quick attention
3. **Moderate** - Should be investigated soon
4. **Low** - Non-urgent, for record keeping

### Report Status Flow
```
Reported (Citizen submits)
    ↓
Received (Police acknowledge)
    ↓
In Progress (Under investigation)
    ↓
Resolved (Case closed)
```

### Multimedia Support
- 📷 Photos (up to 5)
- 🎥 Videos (up to 100MB each)
- 🎤 Audio recordings
- Stored in Firebase Storage

### Features

#### For Civilians
- Submit crime reports
- Track report status
- View report history
- Upvote/downvote other reports
- Filter by status
- Anonymous reporting option
- Call assigned officer

#### For Police
- View all reports (list and map)
- Filter by severity, status, location
- Update report status
- Assign officers to reports
- Call reporter (if not anonymous)
- View report voting

### Voting System
- Users can upvote or downvote reports
- Helps identify serious/credible reports
- One vote per user per report
- Police cannot vote (view-only)

### Location Services
- Automatic location detection
- Manual location selection via map
- Address reverse geocoding
- Distance calculation

---

## Emergency Contacts

### Overview
Manage list of contacts who receive SOS alerts.

### Contact Types
- **Primary** - Receive all SOS alerts (max 3)
- **Secondary** - Backup contacts (unlimited)

### Features
- ➕ Add new contacts
- ✏️ Edit existing contacts
- 🗑️ Delete contacts
- 📞 Direct call from app
- 📱 SMS integration
- 🔄 Import from phone contacts

### Contact Information
- Full name
- Phone number (with validation)
- Relationship
- Contact type (primary/secondary)
- Optional: Email, address

### Validation
- Phone numbers must be valid format
- At least one contact required for SOS
- Primary contacts limited to 3
- Duplicate phone numbers not allowed

---

## Location Services

### Overview
GPS and map integration for crime reports and SOS alerts.

### Features
- 🗺️ Interactive maps (Google Maps / React Native Maps)
- 📍 Current location detection
- 📌 Manual location selection
- 🏠 Address reverse geocoding
- 📏 Distance calculations
- 🗺️ Multiple map markers

### Use Cases

#### Crime Report Map
- Shows all crime reports as markers
- Color-coded by severity
- Clustered markers for dense areas
- Tap marker to view report details

#### Police Location Map
- Shows all online police officers
- Real-time location updates
- Distance from user
- Officer information on tap

#### SOS Location
- Captures exact location on SOS trigger
- Sends location to emergency contacts
- Map link in notification

### Permissions
- **Android**: ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION
- **iOS**: NSLocationWhenInUseUsageDescription

### Location Accuracy
- GPS: ±5-10 meters
- Network: ±50-100 meters
- Fallback to last known location

---

## Notifications

### Overview
In-app and push notification system for important events.

### Notification Types
1. **Crime Reports**
   - Report submitted confirmation
   - New reports in your area
   - Report status updates
   - Report resolved

2. **Emergency**
   - SOS alerts received
   - Emergency updates

3. **General**
   - App updates
   - Security alerts
   - Community updates

### Notification Settings
Users can customize:
- ✅ Enable/disable push notifications
- 📱 Enable/disable in-app notifications
- 🔕 Quiet hours (e.g., 10 PM - 8 AM)
- 📋 Which types of notifications to receive

### Features
- Real-time notifications
- Notification history
- Mark as read/unread
- Delete notifications
- Clear all notifications
- Notification badge count

### Implementation

**Send Notification**:
```typescript
await NotificationService.sendNotification(
  userId,
  'crime_report_solved',
  'Report Resolved',
  'Your report has been resolved!',
  { reportId: '12345' }
);
```

**Listen to Notifications**:
```typescript
const unsubscribe = NotificationService.listenToNotifications(
  userId,
  (notifications) => {
    // Update UI with new notifications
  }
);
```

### Database Structure
```javascript
{
  "civilian": {
    "civilian account": {
      "[userId]": {
        "notifications": {
          "[notificationId]": {
            "type": "crime_report_solved",
            "title": "Report Resolved",
            "body": "Your report has been resolved!",
            "data": { "reportId": "12345" },
            "timestamp": "2024-10-15T10:30:00Z",
            "read": false
          }
        },
        "notificationSettings": {
          "preferences": {
            "delivery": {
              "pushNotifications": true,
              "inAppNotifications": true,
              "quietHours": {
                "enabled": true,
                "startTime": "22:00",
                "endTime": "08:00"
              }
            },
            "crimeReports": {
              "enabled": true,
              "reportSubmitted": true,
              "reportSolved": true,
              "reportUpdated": true
            }
          }
        }
      }
    }
  }
}
```

---

## Additional Features

### Theme Support
- Light mode
- Dark mode
- Auto (follows system)
- Persistent user preference

### Multi-Language Support
- English
- Filipino (Tagalog)
- Easy to add more languages
- Persistent language preference

### Accessibility
- Font size adjustment (Small, Medium, Large)
- High contrast mode
- Screen reader support
- Keyboard navigation

### Security
- Email/password authentication
- Email verification
- Secure password requirements
- Session management
- Automatic logout on suspension
- Firebase security rules

---

## Future Enhancements

### Planned Features
- 🔔 Push notifications when app is closed
- 📹 Live video streaming
- 💬 In-app chat between civilian and police
- 📊 Crime statistics and analytics
- 🤖 AI-powered report categorization
- 🌐 Web dashboard for admins
- 📱 SMS alerts for SOS
- 🎙️ Voice-to-text for reports
- 📍 Geofencing alerts
- 🚔 Police patrol routing

---

## Feature Matrix

| Feature | Civilian | Police | Admin |
|---------|----------|--------|-------|
| Submit Crime Reports | ✅ | ❌ | ❌ |
| View All Reports | ✅ (Own) | ✅ (All) | ✅ (All) |
| Upvote/Downvote | ✅ | ❌ | ✅ |
| Update Report Status | ❌ | ✅ | ✅ |
| SOS Alerts | ✅ | ❌ | ❌ |
| VoIP Calling | ✅ | ✅ | ✅ |
| Emergency Contacts | ✅ | ❌ | ❌ |
| Location Tracking | ✅ | ✅ | ❌ |
| Suspend Users | ❌ | ❌ | ✅ |
| Email Verification | ✅ | ❌ | ❌ |

---

For testing procedures, see [TESTING.md](./TESTING.md).
For recent changes, see [CHANGELOG.md](./CHANGELOG.md).

