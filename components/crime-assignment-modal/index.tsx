import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { useTheme, colors } from '../../services/themeContext';
import { useLanguage } from '../../services/languageContext';
import { CrimeReport } from '../../services/firebaseService';
import { FirebaseService } from '../../services/firebaseService';
import { useAuth } from '../../services/authContext';

interface CrimeAssignmentModalProps {
  visible: boolean;
  crimeReport: CrimeReport | null;
  onAccept: (reportId: string) => void;
  onDecline: (reportId: string) => void;
  onTimeout: (reportId: string) => void;
}

const CrimeAssignmentModal: React.FC<CrimeAssignmentModalProps> = ({
  visible,
  crimeReport,
  onAccept,
  onDecline,
  onTimeout,
}) => {
  const { isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const [timeLeft, setTimeLeft] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer countdown effect
  useEffect(() => {
    if (visible && crimeReport) {
      setTimeLeft(30);
      setIsProcessing(false);
      
      // Start progress bar animation
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 30000, // 30 seconds
        useNativeDriver: false,
      }).start();

      // Start countdown timer
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timeout reached
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [visible, crimeReport]);

  const handleTimeout = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onTimeout(crimeReport?.reportId || '');
  };

  const handleAccept = async () => {
    if (isProcessing || !crimeReport || !user) return;
    
    setIsProcessing(true);
    try {
      // Update police status to Dispatched
      await FirebaseService.updatePoliceStatus(user.uid, 'Dispatched');
      
      // Call the accept callback
      onAccept(crimeReport.reportId || '');
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } catch (error) {
      console.error('Error accepting assignment:', error);
      Alert.alert('Error', 'Failed to accept assignment. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (isProcessing || !crimeReport || !user) return;
    
    setIsProcessing(true);
    try {
      // Remove currentAssignment from police account
      await FirebaseService.removeCurrentAssignment(user.uid);
      
      // Call the decline callback
      onDecline(crimeReport.reportId || '');
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } catch (error) {
      console.error('Error declining assignment:', error);
      Alert.alert('Error', 'Failed to decline assignment. Please try again.');
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Immediate':
        return '#EF4444'; // Red
      case 'High':
        return '#F97316'; // Orange
      case 'Moderate':
        return '#F59E0B'; // Yellow
      case 'Low':
        return '#10B981'; // Green
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#F59E0B'; // Yellow
      case 'received':
        return '#F59E0B'; // Yellow
      case 'in progress':
        return '#F97316'; // Orange
      case 'resolved':
        return '#10B981'; // Green
      default:
        return '#6B7280'; // Gray
    }
  };

  if (!visible || !crimeReport) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}} // Prevent closing by back button
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: theme.primary,
                  transform: [
                    {
                      scaleX: progressAnim,
                    },
                  ],
                },
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              New Crime Report Assignment
            </Text>
            <Text style={[styles.timer, { color: theme.primary }]}>
              {formatTime(timeLeft)}
            </Text>
          </View>

          {/* Crime Report Details */}
          <View style={styles.content}>
            <View style={styles.crimeInfo}>
              <View style={styles.crimeTypeRow}>
                <Text style={[styles.crimeType, { color: theme.text }]}>
                  {crimeReport.crimeType}
                </Text>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(crimeReport.severity) }]}>
                  <Text style={styles.severityText}>{crimeReport.severity}</Text>
                </View>
              </View>
              
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(crimeReport.status) }]}>
                  <Text style={styles.statusText}>{crimeReport.status}</Text>
                </View>
                <Text style={[styles.timeAgo, { color: theme.secondaryText }]}>
                  {new Date(crimeReport.createdAt).toLocaleDateString()} at{' '}
                  {new Date(crimeReport.createdAt).toLocaleTimeString()}
                </Text>
              </View>
            </View>

            <Text style={[styles.description, { color: theme.text }]} numberOfLines={3}>
              {crimeReport.description}
            </Text>

            <View style={styles.locationInfo}>
              <Text style={[styles.locationLabel, { color: theme.secondaryText }]}>
                📍 Location:
              </Text>
              <Text style={[styles.location, { color: theme.text }]}>
                {crimeReport.location.address}
              </Text>
            </View>

            {/* Attachment Indicators */}
            {((crimeReport.multimedia && crimeReport.multimedia.length > 0) || 
              (crimeReport.videos && crimeReport.videos.length > 0)) && (
              <View style={styles.attachmentInfo}>
                <Text style={[styles.attachmentLabel, { color: theme.secondaryText }]}>
                  📎 Evidence:
                </Text>
                <View style={styles.attachmentRow}>
                  {crimeReport.multimedia && crimeReport.multimedia.length > 0 && (
                    <Text style={[styles.attachmentText, { color: theme.text }]}>
                      📷 {crimeReport.multimedia.length} {crimeReport.multimedia.length === 1 ? 'Photo' : 'Photos'}
                    </Text>
                  )}
                  {crimeReport.videos && crimeReport.videos.length > 0 && (
                    <Text style={[styles.attachmentText, { color: theme.text }]}>
                      🎥 {crimeReport.videos.length} {crimeReport.videos.length === 1 ? 'Video' : 'Videos'}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.declineButton, { borderColor: theme.border }]}
              onPress={handleDecline}
              disabled={isProcessing}
            >
              <Text style={[styles.declineButtonText, { color: theme.text }]}>
                Decline
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: theme.primary }]}
              onPress={handleAccept}
              disabled={isProcessing}
            >
              <Text style={styles.acceptButtonText}>
                {isProcessing ? 'Processing...' : 'Accept'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    width: '100%',
    transformOrigin: 'right',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  timer: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  content: {
    padding: 20,
  },
  crimeInfo: {
    marginBottom: 16,
  },
  crimeTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  crimeType: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timeAgo: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  locationInfo: {
    marginBottom: 12,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
  },
  attachmentInfo: {
    marginBottom: 8,
  },
  attachmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  attachmentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  attachmentText: {
    fontSize: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CrimeAssignmentModal;
