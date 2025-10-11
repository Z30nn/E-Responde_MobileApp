import React, { FC, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Alert,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import VoIPService, { CallData } from '../../services/voipService';

interface VoiceCallScreenProps {
  callData: CallData;
  isOutgoing: boolean;
  onEndCall: () => void;
}

const VoiceCallScreen: FC<VoiceCallScreenProps> = ({ callData, isOutgoing, onEndCall }) => {
  const [callStatus, setCallStatus] = useState<string>(isOutgoing ? 'Calling...' : 'Connecting...');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(false);
  const [remoteStream, setRemoteStream] = useState<any>(null);

  const otherUser = isOutgoing ? callData.callee : callData.caller;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    // Monitor call status
    if (callData.status === 'answered') {
      setCallStatus('Connected');
      
      // Start call duration timer
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Get remote stream
      const stream = VoIPService.getRemoteStream();
      setRemoteStream(stream);
    } else if (callData.status === 'ringing') {
      setCallStatus(isOutgoing ? 'Ringing...' : 'Incoming Call');
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [callData.status, isOutgoing]);

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
      Alert.alert('Error', 'Failed to end call');
    }
  };

  const handleMuteToggle = () => {
    const localStream = VoIPService.getLocalStream();
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleSpeakerToggle = () => {
    // Speaker toggle would use react-native-incall-manager
    setIsSpeakerOn(!isSpeakerOn);
    // InCallManager.setForceSpeakerphoneOn(!isSpeakerOn);
  };

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
          <Text style={styles.userName}>{otherUser.name}</Text>
          <Text style={styles.userType}>
            {otherUser.userType === 'police' ? '👮 Police Officer' : '👤 Civilian'}
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
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={handleMuteToggle}
            >
              <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
              <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            {/* Speaker Button */}
            <TouchableOpacity
              style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
              onPress={handleSpeakerToggle}
            >
              <Text style={styles.controlIcon}>{isSpeakerOn ? '🔊' : '🔇'}</Text>
              <Text style={styles.controlLabel}>Speaker</Text>
            </TouchableOpacity>
          </View>

          {/* End Call Button */}
          <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
            <Text style={styles.endCallIcon}>📞</Text>
            <Text style={styles.endCallText}>End Call</Text>
          </TouchableOpacity>
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
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
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
  userType: {
    fontSize: 16,
    color: '#9CA3AF',
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
  controlIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  controlLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  endCallButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 50,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  endCallIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  endCallText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
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

