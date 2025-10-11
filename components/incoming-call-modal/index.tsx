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
      // Vibrate when call comes in
      Vibration.vibrate([0, 400, 200, 400], true);

      // Pulse animation for incoming call
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
        Vibration.cancel();
      };
    }
  }, [visible]);

  const handleAccept = async () => {
    try {
      setIsAnswering(true);
      Vibration.cancel();
      
      await VoIPService.answerCall(callData.callId);
      onAccept();
    } catch (error) {
      console.error('Error accepting call:', error);
      Alert.alert('Error', 'Failed to accept call');
      setIsAnswering(false);
    }
  };

  const handleReject = async () => {
    try {
      Vibration.cancel();
      await VoIPService.rejectCall(callData.callId);
      onReject();
    } catch (error) {
      console.error('Error rejecting call:', error);
      onReject(); // Close modal anyway
    }
  };

  if (!visible || !callData) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent={true} statusBarTranslucent>
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
              {callData.caller.userType === 'police' ? '👮 Police Officer' : 
               callData.caller.userType === 'admin' ? '👨‍💼 Admin' : '👤 Civilian'}
            </Text>

            {callData.reportId && (
              <View style={styles.reportBadge}>
                <Text style={styles.reportBadgeText}>
                  📋 Report #{callData.reportId.substring(0, 8)}
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
              <Text style={styles.actionIcon}>📞</Text>
              <Text style={styles.actionText}>Decline</Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              disabled={isAnswering}
            >
              <Text style={styles.actionIcon}>📞</Text>
              <Text style={styles.actionText}>{isAnswering ? 'Connecting...' : 'Accept'}</Text>
            </TouchableOpacity>
          </View>

          {/* Call Context Info */}
          {callData.caller.userType === 'police' && (
            <View style={styles.contextInfo}>
              <Text style={styles.contextText}>
                🚨 This is a call from an officer assigned to your report
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#10B981',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  callerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  callerType: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  reportBadge: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  reportBadgeText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  incomingText: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  actionButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  actionIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contextInfo: {
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  contextText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default IncomingCallModal;

