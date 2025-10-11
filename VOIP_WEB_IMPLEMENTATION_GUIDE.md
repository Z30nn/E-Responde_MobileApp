

# VoIP Web Implementation Guide (Admin Dashboard)

## Overview

This guide explains how to implement VoIP functionality in your web-based admin dashboard to connect with the React Native mobile app.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Firebase Realtime Database                   │
│                        (Signaling Server)                        │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  voip_calls  │  │voip_signaling│  │ crime_reports      │   │
│  │              │  │              │  │ (dispatch info)    │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└──────────────┬───────────────────────────────────┬──────────────┘
               │                                   │
               │ WebRTC Signaling                  │
               │ (Offer/Answer/ICE)                │
               │                                   │
    ┌──────────▼──────────┐           ┌───────────▼──────────────┐
    │   Mobile App        │◄─────────►│   Web Admin Dashboard    │
    │ (React Native)      │   P2P     │   (React/Vue/Next.js)    │
    │                     │  Audio    │                          │
    │  - Civilians        │  Stream   │  - Admins                │
    │  - Police Officers  │           │  - Can call anyone       │
    └─────────────────────┘           └──────────────────────────┘
```

---

## Prerequisites

### 1. Install Dependencies (NPM/Yarn)

```bash
# For React/Next.js project
npm install firebase simple-peer

# OR with yarn
yarn add firebase simple-peer
```

### 2. Firebase Configuration

Create `firebase.js` in your web project:

```javascript
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBZzn8kYUjqTo1-Wpu9vT4jZ9-UB2BDL4Y",
  authDomain: "e-responde.firebaseapp.com",
  databaseURL: "https://e-responde-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "e-responde",
  storageBucket: "e-responde.firebasestorage.app",
  messagingSenderId: "343953743058",
  appId: "1:343953743058:web:YOUR_WEB_APP_ID" // Get from Firebase Console
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);
```

---

## Implementation

### Step 1: VoIP Service for Web

Create `services/voipService.js`:

```javascript
import { ref, set, onValue, off, push, get, update } from 'firebase/database';
import { database, auth } from '../firebase';
import Peer from 'simple-peer';

class VoIPService {
  constructor() {
    this.peer = null;
    this.localStream = null;
    this.remoteStream = null;
    this.currentCallId = null;
    this.signalingListeners = [];
  }

  // Initialize local media stream
  async initializeLocalStream(videoEnabled = false) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: videoEnabled
      });
      
      console.log('Local stream initialized');
      return this.localStream;
    } catch (error) {
      console.error('Error initializing local stream:', error);
      throw error;
    }
  }

  // Initiate a call (Admin to Mobile)
  async initiateCall(calleeUserId, calleeUserType, calleeName, reportId = null) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get admin info
      const adminName = await this.getAdminName(currentUser.uid);

      // Create call record
      const callsRef = ref(database, 'voip_calls');
      const newCallRef = push(callsRef);
      const callId = newCallRef.key;

      const callData = {
        callId,
        caller: {
          userId: currentUser.uid,
          userType: 'admin',
          name: adminName
        },
        callee: {
          userId: calleeUserId,
          userType: calleeUserType,
          name: calleeName
        },
        status: 'ringing',
        createdAt: new Date().toISOString(),
        reportId
      };

      await set(newCallRef, callData);
      this.currentCallId = callId;

      // Initialize local stream
      await this.initializeLocalStream(false);

      // Create peer connection with initiator=true
      this.peer = new Peer({
        initiator: true,
        stream: this.localStream,
        trickle: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      // Handle signaling
      this.peer.on('signal', async (signal) => {
        console.log('Sending signal:', signal.type);
        
        if (signal.type === 'offer') {
          // Send offer
          await set(ref(database, `voip_signaling/${callId}/offer`), signal);
        } else if (signal.candidate) {
          // Send ICE candidate
          const candidateRef = push(ref(database, `voip_signaling/${callId}/iceCandidates/caller`));
          await set(candidateRef, signal);
        }
      });

      // Handle remote stream
      this.peer.on('stream', (stream) => {
        console.log('Received remote stream');
        this.remoteStream = stream;
        
        // Trigger custom event to update UI
        window.dispatchEvent(new CustomEvent('remoteStreamReceived', { detail: stream }));
      });

      // Handle connection events
      this.peer.on('connect', () => {
        console.log('Peer connected');
      });

      this.peer.on('error', (error) => {
        console.error('Peer error:', error);
      });

      // Listen for answer
      this.listenForAnswer(callId);

      // Listen for ICE candidates from callee
      this.listenForIceCandidates(callId, 'callee');

      console.log('Call initiated:', callId);
      return callId;
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  // Answer an incoming call (if needed for admin receiving calls)
  async answerCall(callId) {
    try {
      this.currentCallId = callId;

      // Initialize local stream
      await this.initializeLocalStream(false);

      // Get the offer
      const offerRef = ref(database, `voip_signaling/${callId}/offer`);
      const offerSnapshot = await get(offerRef);
      const offer = offerSnapshot.val();

      if (!offer) {
        throw new Error('No offer found for this call');
      }

      // Create peer connection with initiator=false
      this.peer = new Peer({
        initiator: false,
        stream: this.localStream,
        trickle: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      // Handle signaling
      this.peer.on('signal', async (signal) => {
        console.log('Sending signal:', signal.type);
        
        if (signal.type === 'answer') {
          // Send answer
          await set(ref(database, `voip_signaling/${callId}/answer`), signal);
        } else if (signal.candidate) {
          // Send ICE candidate
          const candidateRef = push(ref(database, `voip_signaling/${callId}/iceCandidates/callee`));
          await set(candidateRef, signal);
        }
      });

      // Handle remote stream
      this.peer.on('stream', (stream) => {
        console.log('Received remote stream');
        this.remoteStream = stream;
        window.dispatchEvent(new CustomEvent('remoteStreamReceived', { detail: stream }));
      });

      // Signal the offer to establish connection
      this.peer.signal(offer);

      // Listen for ICE candidates from caller
      this.listenForIceCandidates(callId, 'caller');

      // Update call status
      await this.updateCallStatus(callId, 'answered');

      console.log('Call answered:', callId);
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }

  // End the call
  async endCall(callId) {
    try {
      // Update call status
      await this.updateCallStatus(callId, 'ended');

      // Close peer connection
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Clear remote stream
      this.remoteStream = null;

      // Remove listeners
      this.signalingListeners.forEach(unsubscribe => unsubscribe());
      this.signalingListeners = [];

      this.currentCallId = null;

      console.log('Call ended:', callId);
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    }
  }

  // Listen for answer
  listenForAnswer(callId) {
    const answerRef = ref(database, `voip_signaling/${callId}/answer`);

    const unsubscribe = onValue(answerRef, (snapshot) => {
      const answer = snapshot.val();
      if (answer && this.peer) {
        console.log('Received answer');
        this.peer.signal(answer);
      }
    });

    this.signalingListeners.push(() => off(answerRef, 'value', unsubscribe));
  }

  // Listen for ICE candidates
  listenForIceCandidates(callId, source) {
    const candidatesRef = ref(database, `voip_signaling/${callId}/iceCandidates/${source}`);

    const unsubscribe = onValue(candidatesRef, (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        const candidate = childSnapshot.val();
        if (candidate && this.peer && candidate.candidate) {
          this.peer.signal(candidate);
        }
      });
    });

    this.signalingListeners.push(() => off(candidatesRef, 'value', unsubscribe));
  }

  // Update call status
  async updateCallStatus(callId, status) {
    const callRef = ref(database, `voip_calls/${callId}`);
    const updates = { status };

    if (status === 'answered') {
      updates.answeredAt = new Date().toISOString();
    } else if (status === 'ended') {
      updates.endedAt = new Date().toISOString();
    }

    await update(callRef, updates);
  }

  // Get admin name
  async getAdminName(userId) {
    try {
      const adminRef = ref(database, `admin_dashboard_account/${userId}`);
      const snapshot = await get(adminRef);

      if (snapshot.exists()) {
        const adminData = snapshot.val();
        return `${adminData.firstName || ''} ${adminData.lastName || ''}`.trim() || 'Admin';
      }
      return 'Admin';
    } catch (error) {
      console.error('Error getting admin name:', error);
      return 'Admin';
    }
  }

  // Get streams
  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }
}

export default new VoIPService();
```

---

### Step 2: Call UI Component (React Example)

Create `components/CallModal.jsx`:

```javascript
import React, { useState, useEffect, useRef } from 'react';
import voipService from '../services/voipService';
import './CallModal.css';

const CallModal = ({ isOpen, callData, onClose }) => {
  const [callStatus, setCallStatus] = useState('Calling...');
  const [callDuration, setCallDuration] = useState(0);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    let interval;

    // Monitor call status
    if (callData?.status === 'answered') {
      setCallStatus('Connected');
      
      // Start duration timer
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else if (callData?.status === 'ringing') {
      setCallStatus('Ringing...');
    }

    // Listen for remote stream
    const handleRemoteStream = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.detail;
      }
    };

    window.addEventListener('remoteStreamReceived', handleRemoteStream);

    // Set local stream
    const localStream = voipService.getLocalStream();
    if (localStream && localAudioRef.current) {
      localAudioRef.current.srcObject = localStream;
    }

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('remoteStreamReceived', handleRemoteStream);
    };
  }, [isOpen, callData]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    if (callData?.callId) {
      await voipService.endCall(callData.callId);
    }
    onClose();
  };

  if (!isOpen || !callData) return null;

  const otherUser = callData.callee;

  return (
    <div className="call-modal-overlay">
      <div className="call-modal">
        <div className="call-status">{callStatus}</div>
        {callData.status === 'answered' && (
          <div className="call-duration">{formatDuration(callDuration)}</div>
        )}

        <div className="user-info">
          <div className="avatar">
            {otherUser.name.charAt(0).toUpperCase()}
          </div>
          <h2>{otherUser.name}</h2>
          <p>{otherUser.userType === 'police' ? '👮 Police Officer' : '👤 Civilian'}</p>
        </div>

        {callData.reportId && (
          <div className="report-info">
            📋 Report #{callData.reportId.substring(0, 8)}
          </div>
        )}

        <button className="end-call-btn" onClick={handleEndCall}>
          📞 End Call
        </button>

        {/* Audio elements (hidden) */}
        <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />
        <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default CallModal;
```

---

### Step 3: Call Modal CSS

Create `components/CallModal.css`:

```css
.call-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.call-modal {
  background: #1F2937;
  border-radius: 20px;
  padding: 40px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  color: white;
}

.call-status {
  font-size: 18px;
  font-weight: 600;
  color: #10B981;
  margin-bottom: 8px;
}

.call-duration {
  font-size: 16px;
  color: #9CA3AF;
  margin-bottom: 30px;
}

.user-info {
  margin-bottom: 30px;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #3B82F6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: bold;
  margin: 0 auto 20px;
}

.user-info h2 {
  font-size: 24px;
  margin-bottom: 8px;
}

.user-info p {
  font-size: 16px;
  color: #9CA3AF;
}

.report-info {
  background: #374151;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 30px;
  font-size: 14px;
  color: #9CA3AF;
}

.end-call-btn {
  background: #EF4444;
  color: white;
  border: none;
  border-radius: 50px;
  padding: 15px 40px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
}

.end-call-btn:hover {
  background: #DC2626;
}
```

---

### Step 4: Integration Example

In your admin dashboard component:

```javascript
import React, { useState } from 'react';
import voipService from './services/voipService';
import CallModal from './components/CallModal';

function AdminDashboard() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);

  const handleCallUser = async (userId, userType, userName, reportId) => {
    try {
      const callId = await voipService.initiateCall(userId, userType, userName, reportId);
      
      // Get call data
      const callData = {
        callId,
        callee: { userId, userType, name: userName },
        status: 'ringing',
        reportId
      };

      setCurrentCall(callData);
      setIsCallActive(true);
    } catch (error) {
      console.error('Error initiating call:', error);
      alert('Failed to initiate call');
    }
  };

  const handleCloseCall = () => {
    setIsCallActive(false);
    setCurrentCall(null);
  };

  return (
    <div>
      <h1>Admin Dashboard</h1>
      
      {/* Example: Call buttons in user list */}
      <div className="user-list">
        <div className="user-card">
          <span>John Doe (Civilian)</span>
          <button onClick={() => handleCallUser('user123', 'civilian', 'John Doe', null)}>
            📞 Call
          </button>
        </div>
      </div>

      {/* Call Modal */}
      <CallModal 
        isOpen={isCallActive} 
        callData={currentCall} 
        onClose={handleCloseCall} 
      />
    </div>
  );
}

export default AdminDashboard;
```

---

## Key Differences: Web vs Mobile

| Aspect | Mobile (React Native) | Web (Browser) |
|--------|-----------------------|---------------|
| WebRTC Library | `react-native-webrtc` | Native `navigator.mediaDevices` |
| Peer Connection | Manual `RTCPeerConnection` | `simple-peer` library |
| Media Display | `<RTCView>` component | `<audio>` or `<video>` elements |
| Permissions | `PermissionsAndroid` | Browser prompts automatically |
| Background | Requires special handling | Works in background tabs |

---

## Testing

### Test Connection Between Web and Mobile

1. **Start Mobile App** (on physical device)
   - Login as police or civilian
   - Wait for incoming call

2. **Start Web Dashboard**
   - Login as admin
   - Navigate to user you want to call
   - Click "Call" button

3. **Verify Connection**
   - Mobile should show incoming call
   - Accept call on mobile
   - Both should be able to hear each other

---

## Troubleshooting

### Common Issues

#### 1. No Audio on Web

**Problem**: Can't hear remote audio  
**Solution**: Ensure `<audio>` element has `autoPlay` attribute

#### 2. Connection Fails

**Problem**: Peer connection doesn't establish  
**Solution**: Check Firebase signaling data is being written/read correctly

#### 3. ICE Candidates Not Working

**Problem**: Connection hangs at "Connecting..."  
**Solution**: Verify STUN servers are accessible, check firewall

---

## Production Considerations

1. **TURN Servers**: Add TURN servers for NAT traversal in restrictive networks
   ```javascript
   iceServers: [
     { urls: 'stun:stun.l.google.com:19302' },
     {
       urls: 'turn:your-turn-server.com',
       username: 'user',
       credential: 'pass'
     }
   ]
   ```

2. **Security**: Implement proper authentication and authorization

3. **Scalability**: Consider using a dedicated signaling server for high traffic

4. **Error Handling**: Add comprehensive error handling and retry logic

---

## Next Steps

1. Implement call history logging
2. Add video call support
3. Implement call recording (with consent)
4. Add call transfer functionality
5. Implement group calls

---

**Documentation Complete!**  
Your admin dashboard can now make VoIP calls to mobile app users.

