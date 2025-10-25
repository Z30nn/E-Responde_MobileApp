import React, { FC, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import VoIPService, { CallData } from '../../services/voipService';
import InCallManager from 'react-native-incall-manager';

interface VoiceCallScreenProps {
  callData: CallData;
  isOutgoing: boolean;
  onEndCall: () => void;
}

const VoiceCallScreen: FC<VoiceCallScreenProps> = ({ callData, isOutgoing, onEndCall }) => {
  const [currentCallData, setCurrentCallData] = useState<CallData>(callData);
  const [callStatus, setCallStatus] = useState<string>(isOutgoing ? 'Calling...' : 'Connecting...');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(false);
  const [remoteStream, setRemoteStream] = useState<any>(null);

  // Listen for real-time call status updates
  useEffect(() => {
    console.log('VoiceCallScreen: Setting up call status listener for:', callData.callId);
    
    const unsubscribe = VoIPService.listenToCallStatus(callData.callId, (updatedCallData) => {
      console.log('VoiceCallScreen: Call status updated:', updatedCallData.status);
      setCurrentCallData(updatedCallData);

      // Auto-end call if it was ended/rejected remotely
      if (updatedCallData.status === 'ended' || 
          updatedCallData.status === 'rejected' || 
          updatedCallData.status === 'missed') {
        setTimeout(() => {
          try {
            onEndCall();
          } catch (err) {
            console.error('Error in onEndCall callback:', String(err));
          }
        }, 1500); // Give user time to see the status
      }
    });

    return () => {
      console.log('VoiceCallScreen: Cleaning up call status listener');
      try {
        unsubscribe();
      } catch (err) {
        console.error('Error cleaning up call status listener:', String(err));
      }
    };
  }, [callData.callId, onEndCall]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    // Monitor call status and update UI accordingly
    if (currentCallData.status === 'answered') {
      setCallStatus('Connected');
      
      // Start call duration timer
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Get remote stream
      const stream = VoIPService.getRemoteStream();
      setRemoteStream(stream);

      // Initialize mute state based on actual stream state
      const muteState = VoIPService.isMicrophoneMuted();
      setIsMuted(muteState);

      // Initialize speaker state
      const initializeSpeakerState = async () => {
        try {
          const speakerState = await VoIPService.getSpeakerState();
          setIsSpeakerOn(speakerState);
          console.log('Initialized speaker state:', speakerState);
        } catch (error) {
          console.error('Error initializing speaker state:', error);
        }
      };
      initializeSpeakerState();

      // Initialize InCallManager for speaker control
      try {
        InCallManager.start({ media: 'audio' });
        console.log('InCallManager started for audio call');
      } catch (error) {
        console.error('Error starting InCallManager:', error);
      }
    } else if (currentCallData.status === 'ringing') {
      setCallStatus(isOutgoing ? 'Calling...' : 'Incoming Call');
    } else if (currentCallData.status === 'ended') {
      setCallStatus('Call Ended');
    } else if (currentCallData.status === 'rejected') {
      setCallStatus(isOutgoing ? 'Call Declined' : 'Call Rejected');
    } else if (currentCallData.status === 'missed') {
      setCallStatus('Call Missed');
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentCallData.status, isOutgoing]);

  // Cleanup InCallManager when component unmounts
  useEffect(() => {
    return () => {
      try {
        InCallManager.stop();
        console.log('InCallManager stopped');
      } catch (error) {
        console.error('Error stopping InCallManager:', error);
      }
    };
  }, []);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    try {
      await VoIPService.endCall(callData.callId);
      onEndCall();
    } catch (error) {
      console.error('Error ending call:', error);
      Alert.alert('Error', 'Failed to end call: ' + String(error));
    }
  };

  const handleMuteToggle = () => {
    const newMuteState = VoIPService.toggleMute();
    setIsMuted(!newMuteState); // newMuteState is true if unmuted, so we want the opposite for isMuted state
  };

  const handleSpeakerToggle = async () => {
    try {
      console.log('🎤 Speaker button pressed! Current state:', isSpeakerOn);
      console.log('🎤 Attempting to toggle speaker...');
      
      const success = await VoIPService.toggleSpeaker();
      console.log('🎤 Speaker toggle result:', success);
      
      if (success) {
        // Update UI state to reflect the actual speaker state
        const actualSpeakerState = await VoIPService.getSpeakerState();
        setIsSpeakerOn(actualSpeakerState);
        console.log('🎤 Speaker toggled successfully, new state:', actualSpeakerState);
      } else {
        console.warn('🎤 Speaker toggle failed, keeping current state');
      }
    } catch (error) {
      console.error('🎤 Error toggling speaker:', error);
    }
  };

  // Safety check - if otherUser data is not available, don't render
  const otherUser = isOutgoing ? currentCallData?.callee : currentCallData?.caller;
  if (!otherUser || !otherUser.name) {
    console.warn('VoiceCallScreen: Invalid call data, missing user information');
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Call Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{callStatus}</Text>
          {callData.status === 'answered' && (
            <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfoContainer}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{otherUser.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={otherUser.userType === 'civilian' ? styles.civilianUserName : styles.userName}>
            {otherUser.userType === 'civilian' ? otherUser.name.toUpperCase() : otherUser.name}
          </Text>
          <Text style={styles.userType}>
            {otherUser.userType === 'police' ? '👮 Police Officer' : 'CIVILIAN'}
          </Text>
        </View>

        {/* Remote Stream (hidden for voice-only calls but available for debugging) */}
        {remoteStream && (
          <View style={styles.hiddenStream}>
            <RTCView streamURL={remoteStream.toURL()} style={styles.hiddenStreamView} />
          </View>
        )}

        {/* Call Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.controlsRow}>
            {/* Mute Button */}
            <View style={styles.muteButtonContainer}>
              <TouchableOpacity
                style={[styles.muteButton, isMuted && styles.muteButtonActive]}
                onPress={handleMuteToggle}
              >
                <Image
                  source={isMuted ? require('../../assets/micon.png') : require('../../assets/micoff.png')}
                  style={[styles.muteIcon, { tintColor: isMuted ? '#374151' : '#FFFFFF' }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <Text style={styles.muteButtonLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </View>

            {/* Speaker Button */}
            <View style={styles.speakerButtonContainer}>
              <TouchableOpacity
                style={[styles.speakerButton, isSpeakerOn && styles.speakerButtonActive]}
                onPress={() => {
                  console.log('🎤 TouchableOpacity onPress triggered!');
                  handleSpeakerToggle();
                }}
                activeOpacity={0.7}
                disabled={false}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Image
                  source={require('../../assets/mic.png')}
                  style={[styles.speakerIcon, { tintColor: isSpeakerOn ? '#374151' : '#FFFFFF' }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <Text style={styles.speakerButtonLabel}>
                {isSpeakerOn ? 'Loudspeaker' : 'Earpiece'}
              </Text>
            </View>
          </View>

          {/* End Call Button */}
          <View style={styles.endCallButtonContainer}>
            <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
              <Image
                source={require('../../assets/end.png')}
                style={styles.endCallIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.endCallButtonLabel}>End Call</Text>
          </View>
        </View>

        {/* Report Info */}
        {callData.reportId && (
          <View style={styles.reportInfoContainer}>
            <Text style={styles.reportInfoText}>
              📋 Related to Report #{callData.reportId.substring(0, 8)}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  durationText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  userInfoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  civilianUserName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  userType: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  hiddenStream: {
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  hiddenStreamView: {
    width: 1,
    height: 1,
  },
  controlsContainer: {
    marginTop: 'auto',
    marginBottom: 40,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 50,
    minWidth: 100,
  },
  controlButtonActive: {
    backgroundColor: '#3B82F6',
  },
  muteButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  muteButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  muteIcon: {
    width: 32,
    height: 32,
    tintColor: '#FFFFFF',
  },
  speakerButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  speakerButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  speakerIcon: {
    width: 32,
    height: 32,
  },
  muteButtonContainer: {
    alignItems: 'center',
  },
  muteButtonLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 8,
  },
  speakerButtonContainer: {
    alignItems: 'center',
  },
  speakerButtonLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 8,
  },
  controlIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  controlLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  endCallButtonContainer: {
    alignItems: 'center',
  },
  endCallButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  endCallIcon: {
    width: 32,
    height: 32,
    tintColor: '#FFFFFF',
  },
  endCallButtonLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 8,
  },
  reportInfoContainer: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reportInfoText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default VoiceCallScreen;

