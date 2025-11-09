import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices, MediaStream } from 'react-native-webrtc';
import { ref, set, onValue, off, push, get, update } from 'firebase/database';
import { database, auth } from '../firebaseConfig';
import { Platform, PermissionsAndroid } from 'react-native';
import InCallManager from 'react-native-incall-manager';

export interface CallData {
  callId: string;
  caller: {
    userId: string;
    userType: 'civilian' | 'police' | 'admin';
    name: string;
  };
  callee: {
    userId: string;
    userType: 'civilian' | 'police' | 'admin';
    name: string;
  };
  status: 'ringing' | 'answered' | 'ended' | 'missed' | 'rejected';
  createdAt: string;
  answeredAt?: string;
  endedAt?: string;
  reportId?: string;
}

export class VoIPService {
  private static instance: VoIPService;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCallId: string | null = null;
  private signalingListeners: (() => void)[] = [];

  // ICE servers for WebRTC (using public STUN servers)
  private iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  private constructor() {}

  static getInstance(): VoIPService {
    if (!VoIPService.instance) {
      VoIPService.instance = new VoIPService();
    }
    return VoIPService.instance;
  }

  // Request audio and video permissions
  async requestPermissions(videoEnabled: boolean = false): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const ensurePermission = async (permission: string, rationale: { title: string; message: string }) => {
          const alreadyGranted = await PermissionsAndroid.check(permission);
          if (alreadyGranted) {
            return PermissionsAndroid.RESULTS.GRANTED;
          }

          return PermissionsAndroid.request(permission, {
            ...rationale,
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          });
        };

        const audioGranted = await ensurePermission(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
          title: 'Microphone Permission',
          message: 'E-Responde needs microphone access for voice calls',
        });

        let cameraGranted = PermissionsAndroid.RESULTS.GRANTED;
        if (videoEnabled) {
          cameraGranted = await ensurePermission(PermissionsAndroid.PERMISSIONS.CAMERA, {
            title: 'Camera Permission',
            message: 'E-Responde needs camera access for video calls',
          });
        }

        return (
          audioGranted === PermissionsAndroid.RESULTS.GRANTED &&
          cameraGranted === PermissionsAndroid.RESULTS.GRANTED
        );
      }
      return true; // iOS permissions handled through Info.plist
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  // Initialize local media stream (audio only for voice calls)
  async initializeLocalStream(videoEnabled: boolean = false): Promise<MediaStream | null> {
    try {
      if (this.localStream) {
        const hasVideoTrack = this.localStream.getVideoTracks().length > 0;
        if (!videoEnabled || hasVideoTrack) {
          return this.localStream;
        }

        // If we need video but current stream is audio-only, stop and recreate
        this.localStream.getTracks().forEach((track) => track.stop());
        this.localStream = null;
      }

      const hasPermissions = await this.requestPermissions(videoEnabled);
      if (!hasPermissions) {
        throw new Error('Microphone and camera permissions are required');
      }

      const constraints = {
        audio: true,
        video: videoEnabled
          ? {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 15 },
              facingMode: 'user',
            }
          : false,
      };

      this.localStream = await mediaDevices.getUserMedia(constraints);
      console.log('Local stream initialized:', this.localStream.toURL());
      return this.localStream;
    } catch (error) {
      console.error('Error initializing local stream:', error);
      throw error;
    }
  }

  // Create peer connection
  createPeerConnection(): RTCPeerConnection {
    this.peerConnection = new RTCPeerConnection(this.iceServers);

    // Add local stream tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection) {
          try {
            this.peerConnection.addTrack(track, this.localStream as MediaStream);
          } catch (error) {
            console.error('Error adding track to peer connection:', error);
          }
        }
      });

      try {
        (this.peerConnection as any).addStream?.(this.localStream);
      } catch (error) {
        console.warn('addStream not available on peer connection:', error);
      }
    }

    const handleRemoteStream = (stream: MediaStream | null) => {
      if (!stream) {
        return;
      }
      this.remoteStream = stream;
      console.log('Remote stream received:', this.remoteStream?.toURL?.() ?? 'n/a');
      this.setSpeakerMode(true);
    };

    // Handle remote stream
    (this.peerConnection as any).ontrack = (event: any) => {
      console.log('Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        handleRemoteStream(event.streams[0]);
      }
    };

    (this.peerConnection as any).onaddstream = (event: any) => {
      console.log('Received remote stream via onaddstream');
      handleRemoteStream(event.stream);
    };

    // Handle ICE candidates
    (this.peerConnection as any).onicecandidate = async (event: any) => {
      if (event.candidate && this.currentCallId) {
        console.log('New ICE candidate:', event.candidate);
        await this.sendIceCandidate(this.currentCallId, event.candidate);
      }
    };

    // Handle connection state changes
    (this.peerConnection as any).onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
    };

    (this.peerConnection as any).oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection?.iceConnectionState);
    };

    return this.peerConnection;
  }

  // Initiate a call
  async initiateCall(
    calleeUserId: string,
    calleeUserType: 'civilian' | 'police' | 'admin',
    calleeName: string,
    reportId?: string
  ): Promise<string> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get caller info
      const userType = await this.getUserType(currentUser.uid);
      const userName = await this.getUserName(currentUser.uid, userType);

      // Create call record
      const callsRef = ref(database, 'voip_calls');
      const newCallRef = push(callsRef);
      const callId = newCallRef.key!;

      const callData: CallData = {
        callId,
        caller: {
          userId: currentUser.uid,
          userType,
          name: userName,
        },
        callee: {
          userId: calleeUserId,
          userType: calleeUserType,
          name: calleeName,
        },
        status: 'ringing',
        createdAt: new Date().toISOString(),
        reportId,
      };

      await set(newCallRef, callData);
      this.currentCallId = callId;

      // Initialize local stream
      await this.initializeLocalStream(false); // Audio only

      // Create peer connection and generate offer
      this.createPeerConnection();
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      await this.peerConnection!.setLocalDescription(offer);

      // Send offer through signaling
      await this.sendOffer(callId, offer);

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

  // Answer an incoming call
  async answerCall(callId: string): Promise<void> {
    try {
      this.currentCallId = callId;

      // Get the offer from signaling
      const offerRef = ref(database, `voip_signaling/${callId}/offer`);

      const [offerSnapshot] = await Promise.all([
        get(offerRef),
        this.initializeLocalStream(false),
      ]);

      // Create peer connection
      this.createPeerConnection();

      const offer = offerSnapshot.val();

      if (!offer) {
        throw new Error('No offer found for this call');
      }

      // Set remote description
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and set answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      // Send answer through signaling
      await this.sendAnswer(callId, answer);

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
  async endCall(callId: string): Promise<void> {
    try {
      // Update call status
      await this.updateCallStatus(callId, 'ended');

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
        this.localStream = null;
      }

      // Clear remote stream
      this.remoteStream = null;

      // Remove signaling listeners
      this.signalingListeners.forEach((unsubscribe) => unsubscribe());
      this.signalingListeners = [];

      this.currentCallId = null;

      console.log('Call ended:', callId);
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    }
  }

  // Reject an incoming call
  async rejectCall(callId: string): Promise<void> {
    try {
      await this.updateCallStatus(callId, 'rejected');
      console.log('Call rejected:', callId);
    } catch (error) {
      console.error('Error rejecting call:', error);
      throw error;
    }
  }

  // Signaling functions
  private async sendOffer(callId: string, offer: RTCSessionDescription): Promise<void> {
    const offerRef = ref(database, `voip_signaling/${callId}/offer`);
    await set(offerRef, {
      sdp: offer.sdp,
      type: offer.type,
    });
  }

  private async sendAnswer(callId: string, answer: RTCSessionDescription): Promise<void> {
    const answerRef = ref(database, `voip_signaling/${callId}/answer`);
    await set(answerRef, {
      sdp: answer.sdp,
      type: answer.type,
    });
  }

  private async sendIceCandidate(callId: string, candidate: RTCIceCandidate): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const isCaller = await this.isUserCaller(callId, currentUser.uid);

    const candidateRef = push(
      ref(database, `voip_signaling/${callId}/iceCandidates/${isCaller ? 'caller' : 'callee'}`)
    );

    await set(candidateRef, {
      candidate: candidate.candidate,
      sdpMLineIndex: candidate.sdpMLineIndex,
      sdpMid: candidate.sdpMid,
    });
  }

  private listenForAnswer(callId: string): void {
    const answerRef = ref(database, `voip_signaling/${callId}/answer`);

    const unsubscribe = onValue(answerRef, async (snapshot) => {
      const answer = snapshot.val();
      if (answer && this.peerConnection) {
        console.log('Received answer');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    this.signalingListeners.push(() => off(answerRef, 'value', unsubscribe));
  }

  private listenForIceCandidates(callId: string, source: 'caller' | 'callee'): void {
    const candidatesRef = ref(database, `voip_signaling/${callId}/iceCandidates/${source}`);

    const unsubscribe = onValue(candidatesRef, (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        const candidateData = childSnapshot.val();
        if (candidateData && this.peerConnection) {
          const candidate = new RTCIceCandidate({
            candidate: candidateData.candidate,
            sdpMLineIndex: candidateData.sdpMLineIndex,
            sdpMid: candidateData.sdpMid,
          });
          this.peerConnection.addIceCandidate(candidate).catch((error) => {
            console.error('Error adding ICE candidate:', error);
          });
        }
      });
    });

    this.signalingListeners.push(() => off(candidatesRef, 'value', unsubscribe));
  }

  // Helper functions
  private async getUserType(userId: string): Promise<'civilian' | 'police' | 'admin'> {
    // Check police account
    const policeRef = ref(database, `police/police account/${userId}`);
    const policeSnapshot = await get(policeRef);
    if (policeSnapshot.exists()) {
      return 'police';
    }

    // Check civilian account
    const civilianRef = ref(database, `civilian/civilian account/${userId}`);
    const civilianSnapshot = await get(civilianRef);
    if (civilianSnapshot.exists()) {
      return 'civilian';
    }

    return 'civilian'; // Default
  }

  private async getUserName(userId: string, userType: 'civilian' | 'police' | 'admin'): Promise<string> {
    try {
      if (userType === 'admin') {
        // Admin data is stored in admin_dashboard_account
        const adminRef = ref(database, 'admin_dashboard_account');
        const adminSnapshot = await get(adminRef);
        
        if (adminSnapshot.exists()) {
          const adminData = adminSnapshot.val();
          console.log('Admin data retrieved:', adminData);
          console.log('Checking userId match:', { callerUserId: userId, adminAuthUid: adminData.authUid, adminUserId: adminData.userId });
          
          // Check if userId matches either authUid or userId field
          if (adminData.authUid === userId || adminData.userId === userId) {
            return adminData.displayName || adminData.email || 'Admin Dashboard';
          }
        }
        
        // Fallback for admin
        return 'Admin Dashboard';
      }
      
      // For police and civilian users
      const path = userType === 'police' 
        ? `police/police account/${userId}` 
        : `civilian/civilian account/${userId}`;
      
      const userRef = ref(database, path);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        return `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown User';
      }
      
      return 'Unknown User';
    } catch (error) {
      console.error('Error getting user name:', error);
      return userType === 'admin' ? 'Admin Dashboard' : 'Unknown User';
    }
  }

  private async isUserCaller(callId: string, userId: string): Promise<boolean> {
    const callRef = ref(database, `voip_calls/${callId}`);
    const snapshot = await get(callRef);
    if (snapshot.exists()) {
      const callData = snapshot.val();
      return callData.caller.userId === userId;
    }
    return false;
  }

  private async updateCallStatus(
    callId: string,
    status: 'ringing' | 'answered' | 'ended' | 'missed' | 'rejected'
  ): Promise<void> {
    const callRef = ref(database, `voip_calls/${callId}`);
    const updates: any = { status };

    if (status === 'answered') {
      updates.answeredAt = new Date().toISOString();
    } else if (status === 'ended') {
      updates.endedAt = new Date().toISOString();
    }

    await update(callRef, updates);
  }

  // Listen for incoming calls
  listenForIncomingCalls(userId: string, onIncomingCall: (callData: CallData) => void): () => void {
    console.log('📞 VoIPService: Setting up incoming call listener for user:', userId);
    const callsRef = ref(database, 'voip_calls');
    const processedCalls = new Set<string>();

    const unsubscribe = onValue(callsRef, (snapshot) => {
      console.log('📞 VoIPService: voip_calls updated, checking for incoming calls...');
      let totalCalls = 0;
      let matchingCalls = 0;
      let skippedCalls = 0;
      
      snapshot.forEach((childSnapshot) => {
        const callData = childSnapshot.val() as CallData;
        totalCalls++;
        
        // Skip invalid/corrupt call records
        if (!callData || !callData.callId || !callData.callee || !callData.caller) {
          console.log('⚠️ VoIPService: Skipping invalid call record:', {
            key: childSnapshot.key,
            hasCallId: !!callData?.callId,
            hasCallee: !!callData?.callee,
            hasCaller: !!callData?.caller,
            status: callData?.status
          });
          skippedCalls++;
          return; // Skip this record
        }
        
        console.log(`📞 VoIPService: Checking call ${callData.callId}:`, {
          calleeUserId: callData.callee?.userId,
          myUserId: userId,
          isMatch: callData.callee?.userId === userId,
          status: callData.status,
          isRinging: callData.status === 'ringing',
          shouldTrigger: callData.callee?.userId === userId && callData.status === 'ringing'
        });

        // Check if this is an incoming call for this user
        if (callData.callee.userId === userId && callData.status === 'ringing') {
          matchingCalls++;
          // Only trigger callback once per call ID
          if (!processedCalls.has(callData.callId)) {
            console.log('📞 VoIPService: ✅ INCOMING CALL DETECTED!', callData);
            processedCalls.add(callData.callId);
            onIncomingCall(callData);
          } else {
            console.log('📞 VoIPService: ⏭️ Call already processed:', callData.callId);
          }
        }
      });
      
      console.log(`📞 VoIPService: Summary - Total: ${totalCalls}, Valid: ${totalCalls - skippedCalls}, Matching: ${matchingCalls}, Skipped: ${skippedCalls}`);
    });

    return () => {
      console.log('📞 VoIPService: Removing incoming call listener');
      off(callsRef, 'value', unsubscribe);
    };
  }

  // Listen to a specific call's status changes in real-time
  listenToCallStatus(callId: string, onStatusChange: (callData: CallData) => void): () => void {
    const callRef = ref(database, `voip_calls/${callId}`);

    const unsubscribe = onValue(callRef, (snapshot) => {
      if (snapshot.exists()) {
        const callData = snapshot.val() as CallData;
        console.log('Call status update:', callData);
        onStatusChange(callData);
      }
    });

    return () => off(callRef, 'value', unsubscribe);
  }

  // Check if user can call another user
  async canCall(callerId: string, calleeId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const callerType = await this.getUserType(callerId);
      const calleeType = await this.getUserType(calleeId);

      // Police and civilians can only call each other if they have a dispatched relationship
      if ((callerType === 'police' && calleeType === 'civilian') || (callerType === 'civilian' && calleeType === 'police')) {
        const hasRelationship = await this.hasDispatchRelationship(callerId, calleeId);
        if (!hasRelationship) {
          return {
            allowed: false,
            reason: 'You can only call officers dispatched to your reports, or civilians you are assigned to.',
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking call permissions:', error);
      return { allowed: false, reason: 'Error checking permissions' };
    }
  }

  private async hasDispatchRelationship(userId1: string, userId2: string): Promise<boolean> {
    try {
      // Check all crime reports for dispatch relationships
      const reportsRef = ref(database, 'civilian/civilian crime reports');
      const snapshot = await get(reportsRef);

      if (snapshot.exists()) {
        const reports = snapshot.val();
        for (const reportId in reports) {
          const report = reports[reportId];
          
          // Check if one user is the reporter and the other is the assigned officer
          if (
            (report.reporterUid === userId1 && report.assignedOfficerId === userId2) ||
            (report.reporterUid === userId2 && report.assignedOfficerId === userId1)
          ) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking dispatch relationship:', error);
      return false;
    }
  }

  // Get streams
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getCurrentCallId(): string | null {
    return this.currentCallId;
  }

  // Mute control methods
  muteMicrophone(): boolean {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = false;
      });
      console.log('Microphone muted');
      return true;
    }
    return false;
  }

  unmuteMicrophone(): boolean {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = true;
      });
      console.log('Microphone unmuted');
      return true;
    }
    return false;
  }

  toggleMute(): boolean {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      const isCurrentlyMuted = !audioTracks[0]?.enabled;
      
      audioTracks.forEach((track) => {
        track.enabled = isCurrentlyMuted;
      });
      
      console.log(`Microphone ${isCurrentlyMuted ? 'unmuted' : 'muted'}`);
      return isCurrentlyMuted; // Returns true if now unmuted, false if now muted
    }
    return false;
  }

  // Speaker control methods
  setSpeakerMode(enabled: boolean): void {
    try {
      if (enabled) {
        InCallManager.setForceSpeakerphoneOn(true);
        InCallManager.setSpeakerphoneOn(true);
        console.log('Speaker mode enabled');
      } else {
        InCallManager.setForceSpeakerphoneOn(false);
        InCallManager.setSpeakerphoneOn(false);
        console.log('Speaker mode disabled');
      }
    } catch (error) {
      console.error('Error setting speaker mode:', error);
    }
  }

  toggleSpeaker(): boolean {
    try {
      // Get current speaker state and toggle it
      InCallManager.getIsSpeakerphoneOn((isSpeakerOn: boolean) => {
        this.setSpeakerMode(!isSpeakerOn);
      });
      return true;
    } catch (error) {
      console.error('Error toggling speaker:', error);
      return false;
    }
  }

  // Get current mute status
  isMicrophoneMuted(): boolean {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      return audioTracks.length > 0 && !audioTracks[0].enabled;
    }
    return false;
  }
}

export default VoIPService.getInstance();

