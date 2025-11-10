import React, { FC, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Alert,
  Vibration,
} from 'react-native';
import { CallData } from '../../services/voipService';
import VoIPService from '../../services/voipService';
import { soundService } from '../../services/soundService';

interface IncomingCallModalProps {
  visible: boolean;
  callData: CallData;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallModal: FC<IncomingCallModalProps> = ({ visible, callData, onAccept, onReject }) => {
  const [isAnswering, setIsAnswering] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  React.useEffect(() => {
    if (visible) {
      soundService.startIncomingCallRingtone();
      Vibration.vibrate([0, 400, 200, 400], true);

      VoIPService.requestPermissions(false).catch((error) => {
        console.error('IncomingCallModal: Failed to pre-warm permissions', error);
      });

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        pulse.stop();
        soundService.stopIncomingCallRingtone();
        Vibration.cancel();
      };
    } else {
      soundService.stopIncomingCallRingtone();
      Vibration.cancel();
    }
  }, [visible, pulseAnim]);

  const handleAccept = async () => {
    if (isAnswering) {
      return;
    }

    setIsAnswering(true);
    soundService.stopIncomingCallRingtone();
    Vibration.cancel();
    onAccept();

    try {
      await VoIPService.answerCall(callData.callId);
    } catch (error) {
      console.error('Error accepting call:', error);
      Alert.alert('Error', 'Failed to connect the call. Please try again.');
      try {
        await VoIPService.rejectCall(callData.callId);
      } catch (rejectError) {
        console.error('Error reverting call after failed accept:', rejectError);
      }
      onReject();
    } finally {
      setIsAnswering(false);
    }
  };

  const handleReject = async () => {
    try {
      soundService.stopIncomingCallRingtone();
      Vibration.cancel();
      await VoIPService.rejectCall(callData.callId);
      onReject();
    } catch (error) {
      console.error('Error rejecting call:', error);
      onReject(); // Close modal anyway
    }
  };

  if (!visible || !callData || !callData.caller || !callData.caller.name) {
    console.warn('IncomingCallModal: Invalid call data:', { visible, callData });
    return null;
  }

  console.log('IncomingCallModal: Rendering modal with visible:', visible, 'callData:', callData);

  return (
    <Modal 
      visible={visible} 
      animationType="none" 
      transparent={false}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Caller Info */}
          <View style={styles.callerInfo}>
            <Animated.View
              style={[
                styles.avatarContainer,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Text style={styles.avatarText}>{callData.caller.name.charAt(0).toUpperCase()}</Text>
            </Animated.View>

            <Text style={styles.callerName}>{callData.caller.name}</Text>
            <Text style={styles.callerType}>
              {callData.caller.userType === 'police'
                ? 'Police Officer'
                : callData.caller.userType === 'admin'
                ? 'Administrator'
                : 'Civilian'}
            </Text>

            {callData.reportId && (
              <View style={styles.reportBadge}>
                <Text style={styles.reportBadgeText}>
                  Report #{callData.reportId.substring(0, 8)}
                </Text>
              </View>
            )}

            <Text style={styles.incomingText}>Incoming Voice Call</Text>
          </View>

          {/* Call Actions */}
          <View style={styles.actionsContainer}>
            {/* Reject Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              disabled={isAnswering}
            >
              <Text style={styles.actionText}>Decline</Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              disabled={isAnswering}
            >
              <Text style={styles.actionText}>{isAnswering ? 'Connecting...' : 'Accept'}</Text>
            </TouchableOpacity>
          </View>

          {/* Call Context Info */}
          {callData.caller.userType === 'police' && (
            <View style={styles.contextInfo}>
              <Text style={styles.contextText}>
                This call is from the officer assigned to your report.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
    width: '100%',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 60,
  },
  avatarContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 6,
    borderColor: '#10B981',
  },
  avatarText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  callerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  callerType: {
    fontSize: 20,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  reportBadge: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 16,
  },
  reportBadgeText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
  incomingText: {
    fontSize: 22,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 40,
  },
  actionButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 12,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  actionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contextInfo: {
    backgroundColor: '#374151',
    padding: 20,
    borderRadius: 16,
    width: '100%',
  },
  contextText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default IncomingCallModal;

