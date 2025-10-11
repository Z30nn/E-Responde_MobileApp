# VoIP Quick Start Guide

## 🚀 Get Started in 15 Minutes

### Step 1: Install Dependencies (5 min)

```bash
# Install VoIP packages
npm install react-native-webrtc --save
npm install react-native-incall-manager --save

# Rebuild
cd android && ./gradlew clean && cd ..
cd ios && pod install && cd ..
```

### Step 2: Run the App

```bash
npx react-native run-android
# OR
npx react-native run-ios
```

### Step 3: Test VoIP (5 min)

#### On Mobile App:

1. **Login as Civilian**
2. **Create Crime Report**
3. **Wait for Officer Assignment** (done via admin dashboard)

#### On Admin Dashboard:

1. **Open Firebase Console**
2. **Navigate to**: `civilian/civilian crime reports/{reportId}`
3. **Add Field**: `assignedOfficerId: "police_user_id"`
4. **Save**

#### Back on Mobile:

1. **Open Crime Report** detail
2. **Click** "📞 Call Assigned Officer" button
3. **Officer receives call** (on their device)
4. **Accept and talk!** 🎉

---

## 📱 File Structure

```
E-Responde_MobileApp/
├── services/
│   └── voipService.ts              ← WebRTC service
├── components/
│   ├── voice-call-screen/
│   │   ├── index.tsx               ← Active call UI
│   │   └── styles.ts
│   └── incoming-call-modal/
│       ├── index.tsx               ← Incoming call UI
│       └── styles.ts
└── docs/
    ├── VOIP_DEPENDENCIES.md        ← Installation guide
    ├── VOIP_WEB_IMPLEMENTATION_GUIDE.md  ← Web dashboard guide
    ├── VOIP_COMPLETE_IMPLEMENTATION.md   ← Complete guide
    └── VOIP_QUICK_START.md         ← This file
```

---

## 🔧 Integration Points

### For Civilians (Crime Report Detail)

```typescript
import VoIPService from '../../services/voipService';
import VoiceCallScreen from '../../components/voice-call-screen';
import IncomingCallModal from '../../components/incoming-call-modal';

// In your component:
const handleCallOfficer = async () => {
  const callId = await VoIPService.initiateCall(
    report.assignedOfficerId,
    'police',
    officerName,
    report.reportId
  );
  // Show call screen
};
```

### For Police (Dashboard)

```typescript
import VoIPService from '../../services/voipService';
import VoiceCallScreen from '../../components/voice-call-screen';
import IncomingCallModal from '../../components/incoming-call-modal';

// In your component:
const handleCallCivilian = async () => {
  const callId = await VoIPService.initiateCall(
    report.reporterUid,
    'civilian',
    civilianName,
    report.reportId
  );
  // Show call screen
};
```

---

## 🌐 Web Dashboard Setup

### Install Dependencies

```bash
npm install firebase simple-peer
```

### Use VoIP Service

```javascript
import voipService from './services/voipService';

// Call a user
voipService.initiateCall(userId, userType, userName, reportId);
```

**Full Guide**: See `VOIP_WEB_IMPLEMENTATION_GUIDE.md`

---

## ⚙️ Firebase Rules

Add to your Firebase Realtime Database rules:

```json
{
  "rules": {
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

---

## ✅ Testing Checklist

- [ ] Dependencies installed
- [ ] App builds successfully
- [ ] Microphone permission works
- [ ] Camera permission works
- [ ] Can initiate call from crime report
- [ ] Incoming call shows modal
- [ ] Can accept call
- [ ] Can hear each other
- [ ] Can end call
- [ ] Permission checks work (can only call dispatched users)

---

## 🆘 Troubleshooting

### Build Fails

```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace
cd ..
```

### No Audio

- Test on **physical devices** (not emulators)
- Check microphone permissions
- Verify STUN servers are accessible

### Connection Hangs

- Check Firebase database rules
- Verify signaling data is being written
- Check internet connection

---

## 📚 Additional Resources

1. **Complete Implementation**: `VOIP_COMPLETE_IMPLEMENTATION.md`
2. **Web Guide**: `VOIP_WEB_IMPLEMENTATION_GUIDE.md`
3. **Dependencies**: `VOIP_DEPENDENCIES.md`

---

## 🎯 What You Get

✅ **Voice Calling** between civilians and police  
✅ **Incoming Call Modal** with accept/reject  
✅ **Active Call Screen** with controls  
✅ **Permission System** (dispatch-based)  
✅ **Web Dashboard Integration** ready  
✅ **Firebase Signaling** for P2P connection  

---

**Ready to Call!** 📞 

Test it now and reach out if you need help!

