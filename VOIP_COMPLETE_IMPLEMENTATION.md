# Complete VoIP Implementation Guide

## 🎯 Overview

This document provides a complete guide for implementing Voice over IP (VoIP) functionality in the E-Responde mobile app and web admin dashboard.

---

## 📋 System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    Firebase Realtime Database                       │
│                      (Signaling Server)                             │
│                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│   │  voip_calls  │  │voip_signaling│  │ crime_reports      │     │
│   │              │  │   - offer    │  │ - assignedOfficerId│     │
│   │  - status    │  │   - answer   │  │                    │     │
│   │  - caller    │  │   - ICE      │  │                    │     │
│   │  - callee    │  │              │  │                    │     │
│   └──────────────┘  └──────────────┘  └────────────────────┘     │
│                                                                     │
└─────────────┬──────────────────────────────────┬────────────────────┘
              │                                  │
              │  WebRTC Signaling                │
              │  (Offer/Answer/ICE)              │
              │                                  │
   ┌──────────▼──────────┐          ┌───────────▼──────────────┐
   │   Mobile App        │          │  Web Admin Dashboard     │
   │  (React Native)     │◄────────►│  (React/Vue/Next.js)     │
   │                     │  P2P     │                          │
   │  - Civilians        │  Audio   │  - Can call anyone       │
   │  - Police Officers  │  Stream  │                          │
   │                     │          │                          │
   │  Can only call      │          │                          │
   │  dispatched users   │          │                          │
   └─────────────────────┘          └──────────────────────────┘
```

---

## 🏗️ Implementation Steps

### Phase 1: Mobile App Setup ✅

#### 1.1 Install Dependencies

```bash
npm install react-native-webrtc --save
npm install @react-native-community/netinfo --save
npm install react-native-incall-manager --save

# Platform-specific setup
cd android && ./gradlew clean && cd ..
cd ios && pod install && cd ..
```

**Documentation**: See `VOIP_DEPENDENCIES.md`

#### 1.2 VoIP Service (Already Created)

- **File**: `services/voipService.ts`
- **Features**:
  - WebRTC peer connection management
  - Firebase signaling (offer/answer/ICE)
  - Permission handling
  - Call initiation and answering
  - Dispatch relationship checking

#### 1.3 Call Screen Components (Already Created)

1. **Voice Call Screen** - `components/voice-call-screen/index.tsx`
   - Active call UI
   - Mute/Speaker controls
   - Call duration timer
   - End call button

2. **Incoming Call Modal** - `components/incoming-call-modal/index.tsx`
   - Incoming call notification
   - Accept/Reject buttons
   - Caller information
   - Vibration and animation

---

### Phase 2: Integrate into App Flow

#### 2.1 Add VoIP to Crime Report Detail (Civilians)

Update `CrimeReportDetail.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import VoIPService, { CallData } from './services/voipService';
import VoiceCallScreen from './components/voice-call-screen';
import IncomingCallModal from './components/incoming-call-modal';

const CrimeReportDetail = ({ report, user }) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<CallData | null>(null);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const unsubscribe = VoIPService.listenForIncomingCalls(
      user.uid,
      (callData) => {
        setIncomingCallData(callData);
        setShowIncomingCall(true);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleCallOfficer = async () => {
    if (!report.assignedOfficerId) {
      Alert.alert('No Officer Assigned', 'No officer has been assigned to this report yet.');
      return;
    }

    try {
      // Check if user can call this officer
      const permission = await VoIPService.canCall(user.uid, report.assignedOfficerId);
      
      if (!permission.allowed) {
        Alert.alert('Cannot Call', permission.reason || 'You cannot call this officer');
        return;
      }

      // Get officer info
      const officerData = await FirebaseService.getPoliceUser(report.assignedOfficerId);
      const officerName = `${officerData?.firstName || ''} ${officerData?.lastName || ''}`.trim();

      // Initiate call
      const callId = await VoIPService.initiateCall(
        report.assignedOfficerId,
        'police',
        officerName,
        report.reportId
      );

      // Show call screen
      setCurrentCall({
        callId,
        caller: { userId: user.uid, userType: 'civilian', name: user.displayName || 'User' },
        callee: { userId: report.assignedOfficerId, userType: 'police', name: officerName },
        status: 'ringing',
        createdAt: new Date().toISOString(),
        reportId: report.reportId
      });
      setIsCallActive(true);
    } catch (error) {
      console.error('Error initiating call:', error);
      Alert.alert('Call Failed', 'Failed to initiate call. Please try again.');
    }
  };

  const handleAcceptIncomingCall = () => {
    setCurrentCall(incomingCallData);
    setShowIncomingCall(false);
    setIsCallActive(true);
  };

  const handleRejectIncomingCall = () => {
    setShowIncomingCall(false);
    setIncomingCallData(null);
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    setCurrentCall(null);
  };

  if (isCallActive && currentCall) {
    return (
      <VoiceCallScreen
        callData={currentCall}
        isOutgoing={currentCall.caller.userId === user.uid}
        onEndCall={handleEndCall}
      />
    );
  }

  return (
    <View>
      {/* Existing crime report detail UI */}
      
      {/* Call Officer Button (only if officer is assigned) */}
      {report.assignedOfficerId && (
        <TouchableOpacity style={styles.callButton} onPress={handleCallOfficer}>
          <Text style={styles.callButtonText}>📞 Call Assigned Officer</Text>
        </TouchableOpacity>
      )}

      {/* Incoming Call Modal */}
      <IncomingCallModal
        visible={showIncomingCall}
        callData={incomingCallData}
        onAccept={handleAcceptIncomingCall}
        onReject={handleRejectIncomingCall}
      />
    </View>
  );
};
```

#### 2.2 Add VoIP to Police Dashboard

Update `app/police-dashboard/index.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import VoIPService, { CallData } from '../../services/voipService';
import VoiceCallScreen from '../../components/voice-call-screen';
import IncomingCallModal from '../../components/incoming-call-modal';

const PoliceDashboard = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<CallData | null>(null);
  const { user } = useAuth();

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const unsubscribe = VoIPService.listenForIncomingCalls(
      user.uid,
      (callData) => {
        setIncomingCallData(callData);
        setShowIncomingCall(true);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleCallCivilian = async (reportData: CrimeReport) => {
    try {
      // Check if officer is assigned to this report
      if (reportData.assignedOfficerId !== user.uid) {
        Alert.alert('Not Assigned', 'You are not assigned to this report.');
        return;
      }

      // Get civilian info
      const civilianData = await FirebaseService.getCivilianUser(reportData.reporterUid);
      const civilianName = `${civilianData?.firstName || ''} ${civilianData?.lastName || ''}`.trim();

      // Initiate call
      const callId = await VoIPService.initiateCall(
        reportData.reporterUid,
        'civilian',
        civilianName,
        reportData.reportId
      );

      // Show call screen
      setCurrentCall({
        callId,
        caller: { userId: user.uid, userType: 'police', name: 'Officer' },
        callee: { userId: reportData.reporterUid, userType: 'civilian', name: civilianName },
        status: 'ringing',
        createdAt: new Date().toISOString(),
        reportId: reportData.reportId
      });
      setIsCallActive(true);
    } catch (error) {
      console.error('Error initiating call:', error);
      Alert.alert('Call Failed', 'Failed to initiate call. Please try again.');
    }
  };

  // ... rest of component with incoming call handling
};
```

---

### Phase 3: Officer Assignment System

#### 3.1 Add `assignedOfficerId` to Crime Reports

Update `services/firebaseService.ts`:

```typescript
// Add function to assign officer to report
static async assignOfficerToReport(reportId: string, officerId: string): Promise<void> {
  try {
    const reportRef = ref(database, `civilian/civilian crime reports/${reportId}`);
    await update(reportRef, {
      assignedOfficerId: officerId,
      assignedAt: new Date().toISOString()
    });

    // Also update in user's personal reports
    const reportSnapshot = await get(reportRef);
    if (reportSnapshot.exists()) {
      const reportData = reportSnapshot.val();
      const userReportRef = ref(
        database,
        `civilian/civilian account/${reportData.reporterUid}/crime reports/${reportId}`
      );
      await update(userReportRef, {
        assignedOfficerId: officerId,
        assignedAt: new Date().toISOString()
      });
    }

    console.log('Officer assigned to report:', reportId, officerId);
  } catch (error) {
    console.error('Error assigning officer:', error);
    throw error;
  }
}
```

#### 3.2 Admin Dashboard Officer Assignment

In your web admin dashboard:

```javascript
// Assign officer to report
async function assignOfficer(reportId, officerId) {
  const reportRef = ref(database, `civilian/civilian crime reports/${reportId}`);
  await update(reportRef, {
    assignedOfficerId: officerId,
    assignedAt: new Date().toISOString()
  });
  
  alert('Officer assigned successfully');
}
```

---

### Phase 4: Web Dashboard Implementation

**Complete Guide**: See `VOIP_WEB_IMPLEMENTATION_GUIDE.md`

#### Key Components:

1. **Install Dependencies**:
   ```bash
   npm install firebase simple-peer
   ```

2. **VoIP Service** (`services/voipService.js`)
   - Uses `simple-peer` for WebRTC
   - Firebase signaling
   - Compatible with mobile app

3. **Call Modal** (`components/CallModal.jsx`)
   - Web-based call UI
   - Audio elements for streams
   - Call controls

4. **Integration**:
   ```javascript
   // In admin dashboard
   <button onClick={() => voipService.initiateCall(userId, userType, userName, reportId)}>
     📞 Call User
   </button>
   ```

---

## 📊 Firebase Database Structure

### VoIP Calls Collection

```json
{
  "voip_calls": {
    "call_id_123": {
      "callId": "call_id_123",
      "caller": {
        "userId": "admin_123",
        "userType": "admin",
        "name": "Admin User"
      },
      "callee": {
        "userId": "civilian_456",
        "userType": "civilian",
        "name": "John Doe"
      },
      "status": "answered",
      "createdAt": "2025-10-10T10:00:00.000Z",
      "answeredAt": "2025-10-10T10:00:05.000Z",
      "endedAt": null,
      "reportId": "report_789"
    }
  }
}
```

### VoIP Signaling Collection

```json
{
  "voip_signaling": {
    "call_id_123": {
      "offer": {
        "type": "offer",
        "sdp": "v=0\r\no=- ... (SDP data)"
      },
      "answer": {
        "type": "answer",
        "sdp": "v=0\r\no=- ... (SDP data)"
      },
      "iceCandidates": {
        "caller": {
          "candidate_1": {
            "candidate": "candidate:...",
            "sdpMLineIndex": 0,
            "sdpMid": "0"
          }
        },
        "callee": {
          "candidate_1": {
            "candidate": "candidate:...",
            "sdpMLineIndex": 0,
            "sdpMid": "0"
          }
        }
      }
    }
  }
}
```

### Crime Reports with Officer Assignment

```json
{
  "civilian": {
    "civilian crime reports": {
      "report_789": {
        "crimeType": "Theft",
        "reporterUid": "civilian_456",
        "assignedOfficerId": "police_123",
        "assignedAt": "2025-10-10T09:30:00.000Z",
        "status": "in progress"
      }
    }
  }
}
```

---

## 🔒 Permission Rules

### Who Can Call Whom?

1. **Civilians** → Can only call **police officers assigned** to their reports
2. **Police Officers** → Can only call **civilians** whose reports they're assigned to
3. **Admins** → Can call **anyone** (civilians or police)

### Implementation

The permission check is in `voipService.ts`:

```typescript
async canCall(callerId: string, calleeId: string): Promise<{ allowed: boolean; reason?: string }> {
  // Check dispatch relationship
  const hasRelationship = await this.hasDispatchRelationship(callerId, calleeId);
  
  if (!hasRelationship) {
    return {
      allowed: false,
      reason: 'You can only call officers dispatched to your reports.'
    };
  }

  return { allowed: true };
}
```

---

## 🧪 Testing Guide

### Test 1: Mobile to Mobile Call

1. **Device A** (Civilian):
   - Login and create crime report
   - Wait for officer assignment

2. **Device B** (Police):
   - Login and view assigned report
   - Click "Call Civilian" button

3. **Verify**:
   - Device A shows incoming call
   - Accept call
   - Both hear each other

### Test 2: Web to Mobile Call

1. **Mobile Device** (Civilian/Police):
   - Login and wait

2. **Web Dashboard** (Admin):
   - Navigate to user list
   - Click "Call" button

3. **Verify**:
   - Mobile shows incoming call
   - Accept call
   - Both hear each other

### Test 3: Permission Check

1. **Try calling unassigned user**:
   - Should show error message
   - Call should not initiate

2. **Admin bypass**:
   - Admin should be able to call anyone

---

## 🐛 Troubleshooting

### Issue: No Audio

**Symptoms**: Call connects but no audio

**Solutions**:
- Check microphone permissions
- Verify streams are attached to peer connection
- Check audio elements have `autoPlay` attribute (web)
- Test on physical devices (not emulators)

### Issue: Connection Fails

**Symptoms**: Call stays in "Connecting..." state

**Solutions**:
- Verify Firebase signaling data is written
- Check ICE candidates are being exchanged
- Test STUN servers are accessible
- Check firewall/NAT settings

### Issue: Call Doesn't Ring

**Symptoms**: No incoming call notification

**Solutions**:
- Verify `listenForIncomingCalls` is active
- Check Firebase listeners are attached
- Verify call data is written to correct path
- Check user IDs match

---

## 📝 Firebase Database Rules

Add these rules for VoIP:

```json
{
  "rules": {
    "voip_calls": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$callId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "voip_signaling": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$callId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## 🚀 Deployment Checklist

### Mobile App

- [ ] Install react-native-webrtc
- [ ] Configure Android/iOS permissions
- [ ] Test on physical devices
- [ ] Integrate VoIP service
- [ ] Add call UI components
- [ ] Test incoming/outgoing calls
- [ ] Verify permission checks

### Web Dashboard

- [ ] Install simple-peer and firebase
- [ ] Create VoIP service
- [ ] Add call modal component
- [ ] Integrate into dashboard
- [ ] Test web-to-mobile calls
- [ ] Verify admin can call anyone

### Firebase

- [ ] Update database rules for voip_calls
- [ ] Update database rules for voip_signaling
- [ ] Add assignedOfficerId to crime reports
- [ ] Test signaling data flow

---

## 📚 Complete File List

### Mobile App Files Created:

1. `services/voipService.ts` - WebRTC service
2. `components/voice-call-screen/index.tsx` - Active call UI
3. `components/voice-call-screen/styles.ts` - Styles
4. `components/incoming-call-modal/index.tsx` - Incoming call UI
5. `components/incoming-call-modal/styles.ts` - Styles

### Documentation Files:

1. `VOIP_DEPENDENCIES.md` - Dependency installation guide
2. `VOIP_WEB_IMPLEMENTATION_GUIDE.md` - Web dashboard guide
3. `VOIP_COMPLETE_IMPLEMENTATION.md` - This complete guide

---

## 🎯 Summary

✅ **Mobile VoIP Implementation** - Complete  
✅ **Web VoIP Implementation** - Guide provided  
✅ **Permission System** - Dispatch-based calling  
✅ **Firebase Signaling** - Real-time communication  
✅ **Call UI Components** - Incoming and active calls  
✅ **Documentation** - Comprehensive guides  

**Ready for Testing!** 🎉

---

**Implementation Date**: October 10, 2025  
**Version**: 1.0  
**Status**: ✅ Complete - Ready for Integration

