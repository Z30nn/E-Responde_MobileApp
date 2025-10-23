import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import Video from 'react-native-video';
import { FirebaseService, CrimeReport } from './services/firebaseService';
import { useTheme, colors, fontSizes } from './services/themeContext';
import { useAuth } from './services/authContext';
import { useVoIP } from './services/voipContext';
import CrimeReportMap from './CrimeReportMap';
import PoliceCrimeReportMap from './components/police-crime-map';
import VoIPService, { CallData } from './services/voipService';

interface CrimeReportDetailProps {
  reportId: string;
  onClose: () => void;
  isPoliceView?: boolean;
}

const CrimeReportDetail = ({ reportId, onClose, isPoliceView = false }: CrimeReportDetailProps) => {
  const handleBackPress = () => {
    console.log('CrimeReportDetail: X button pressed - handleBackPress called');
    console.log('CrimeReportDetail: onClose available:', !!onClose);
    
    if (onClose) {
      console.log('CrimeReportDetail: Calling onClose to close modal');
      try {
        onClose();
        console.log('CrimeReportDetail: onClose called successfully - modal should close');
      } catch (closeError) {
        console.error('CrimeReportDetail: Error calling onClose:', closeError);
      }
    } else {
      console.log('CrimeReportDetail: No onClose handler - this is the problem!');
      console.log('CrimeReportDetail: Props received:', { onClose, reportId });
    }
  };
  const { isDarkMode, fontSize } = useTheme();
  const { user } = useAuth();
  const { setActiveCall } = useVoIP();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const [report, setReport] = useState<CrimeReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const loadReportDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('CrimeReportDetail: Loading report with ID:', reportId);
      const reportDetails = await FirebaseService.getCrimeReport(reportId);
      console.log('CrimeReportDetail: Report details result:', reportDetails);
      
      if (reportDetails) {
        setReport(reportDetails);
      } else {
        console.log('CrimeReportDetail: Report not found for ID:', reportId);
        setError('Report not found');
      }
    } catch (loadError) {
      console.error('Error loading report details:', loadError);
      setError('Failed to load report details');
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    loadReportDetails();
  }, [loadReportDetails]);

  const handleImagePress = (imageUri: string) => {
    setSelectedImage(imageUri);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  const handleVideoPress = (videoUri: string) => {
    setSelectedVideo(videoUri);
    setShowVideoModal(true);
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
  };

  const openMap = () => {
    if (report && report.location) {
      setShowMap(true);
    }
  };

  const closeMap = () => {
    setShowMap(false);
  };

  const handleCallOfficer = async () => {
    if (!report || !report.respondingOfficerId || !user) {
      Alert.alert('Error', 'No officer assigned to this report');
      return;
    }

    try {
      const officerName = report.respondingOfficerName || 'Officer';
      
      const callId = await VoIPService.initiateCall(
        report.respondingOfficerId,
        'police',
        officerName,
        reportId
      );

      if (callId) {
        // Get the call data and set it globally
        const callData: CallData = {
          callId,
          caller: {
            userId: user.uid,
            userType: 'civilian',
            name: `${user.displayName || 'Civilian'}`,
          },
          callee: {
            userId: report.respondingOfficerId,
            userType: 'police',
            name: officerName,
          },
          status: 'ringing',
          createdAt: new Date().toISOString(),
          reportId,
        };
        
        // Use global context to set active call
        setActiveCall(callData);
      }
    } catch (callError: any) {
      console.error('Error calling officer:', callError);
      const errorMessage = callError?.message || String(callError) || 'Failed to initiate call';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleCallCivilian = async () => {
    if (!report || !report.reporterUid || !user) {
      Alert.alert('Error', 'Cannot call reporter');
      return;
    }

    try {
      const civilianName = report.anonymous ? 'Anonymous Reporter' : (report.reporterName || 'Civilian');
      
      if (report.anonymous) {
        Alert.alert('Error', 'Cannot call anonymous reporters');
        return;
      }
      
      const callId = await VoIPService.initiateCall(
        report.reporterUid,
        'civilian',
        civilianName,
        reportId
      );

      if (callId) {
        // Get police user data
        const policeUser = await FirebaseService.getPoliceUser(user.uid);
        const policeName = policeUser && policeUser.firstName && policeUser.lastName
          ? `${policeUser.firstName} ${policeUser.lastName}`
          : policeUser?.badgeNumber
            ? `Officer ${policeUser.badgeNumber}`
            : 'Police Officer';

        const callData: CallData = {
          callId,
          caller: {
            userId: user.uid,
            userType: 'police',
            name: policeName,
          },
          callee: {
            userId: report.reporterUid,
            userType: 'civilian',
            name: civilianName,
          },
          status: 'ringing',
          createdAt: new Date().toISOString(),
          reportId,
        };
        
        // Use global context to set active call
        setActiveCall(callData);
      }
    } catch (callError: any) {
      console.error('Error calling civilian:', callError);
      const errorMessage = callError?.message || String(callError) || 'Failed to initiate call';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleResolveCase = async () => {
    if (!report || !user) {
      Alert.alert('Error', 'Cannot resolve case');
      return;
    }

    Alert.alert(
      'Resolve Case',
      'Are you sure you want to mark this case as resolved? This will clear your current assignment and set your status to Available.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Resolve',
          style: 'destructive',
          onPress: async () => {
            try {
              await FirebaseService.resolveCase(reportId, user.uid);
              Alert.alert(
                'Case Resolved',
                'The case has been marked as resolved. Your assignment has been cleared and you are now available for new assignments.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Close the detail view and return to dashboard
                      onClose();
                    },
                  },
                ]
              );
            } catch (resolveError: any) {
              console.error('Error resolving case:', resolveError);
              const errorMessage = resolveError?.message || String(resolveError) || 'Failed to resolve case';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'reported':
        return '#3B82F6'; // Blue (neutral, just logged)
      case 'received':
        return '#F59E0B'; // Yellow (acknowledged, pending action)
      case 'in progress':
        return '#F97316'; // Orange (active, ongoing, urgent)
      case 'resolved':
        return '#10B981'; // Green (completed, successful outcome)
      // Backward compatibility with old status names
      case 'pending':
        return '#F59E0B'; // Yellow
      case 'investigating':
        return '#F97316'; // Orange
      case 'closed':
        return '#6B7280'; // Gray
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status.toLowerCase()) {
      case 'reported':
        return 'The crime has been filed and logged in the system.';
      case 'received':
        return 'Authorities have acknowledged and confirmed this report.';
      case 'in progress':
        return 'Authorities are actively investigating and responding to this report.';
      case 'resolved':
        return 'This case has been addressed and officially closed.';
      // Backward compatibility with old status names
      case 'pending':
        return 'Your report has been submitted and is awaiting review by authorities.';
      case 'investigating':
        return 'Authorities are currently investigating your report. You may be contacted for additional information.';
      case 'closed':
        return 'This report has been closed. If you have new information, please submit a new report.';
      default:
        return 'Status information is not available.';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'immediate':
        return '#DC2626'; // Red - Critical/Immediate danger
      case 'high':
        return '#EA580C'; // Orange - High priority
      case 'moderate':
        return '#D97706'; // Amber - Medium priority
      case 'low':
        return '#16A34A'; // Green - Low priority
      default:
        return '#6B7280'; // Gray - Unknown
    }
  };


  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isPoliceView ? '#1A1A1A' : theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      paddingTop: 50,
      backgroundColor: isPoliceView ? '#000000' : theme.menuBackground,
      borderBottomWidth: 1,
      borderBottomColor: isPoliceView ? '#333333' : theme.border,
    },
    backButton: {
      padding: 12,
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backButtonText: {
      fontSize: fonts.body,
      color: isPoliceView ? '#FFFFFF' : theme.primary,
      fontWeight: '600',
    },
    closeButton: {
      padding: 15,
      minWidth: 50,
      minHeight: 50,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      borderRadius: 25,
    },
    closeButtonText: {
      fontSize: fonts.title,
      color: isPoliceView ? '#FFFFFF' : theme.text,
      fontWeight: 'bold',
    },
    headerTitle: {
      fontSize: fonts.subtitle,
      fontWeight: 'bold',
      color: isPoliceView ? '#FFFFFF' : (isDarkMode ? '#f8f9ed' : theme.primary),
    },
    headerSpacer: {
      width: 60,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    statusBanner: {
      padding: 10,
      borderRadius: 8,
      marginBottom: 16,
    },
    statusBannerText: {
      color: '#FFFFFF',
      fontSize: fonts.caption,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    statusDescription: {
      color: '#FFFFFF',
      fontSize: fonts.caption - 2,
      lineHeight: 16,
      opacity: 0.9,
    },
    section: {
      backgroundColor: isPoliceView ? '#2A2A2A' : theme.menuBackground,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isPoliceView ? '#404040' : theme.border,
    },
    sectionTitle: {
      fontSize: fonts.caption,
      fontWeight: 'bold',
      color: isPoliceView ? '#FFFFFF' : theme.primary,
      marginBottom: 8,
    },
    infoRow: {
      flexDirection: 'row',
      marginBottom: 8,
      alignItems: 'flex-start',
    },
    infoLabel: {
      fontSize: fonts.body,
      fontWeight: '600',
      color: isPoliceView ? '#D0D0D0' : theme.text,
      width: 100,
      flexShrink: 0,
    },
    infoValue: {
      fontSize: fonts.body,
      color: isPoliceView ? '#B0B0B0' : theme.secondaryText,
      flex: 1,
      lineHeight: 22,
    },
    severityInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    severityIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
    },
    severityText: {
      fontWeight: '600',
      color: isPoliceView ? '#D0D0D0' : theme.text,
    },
    multimediaItem: {
      backgroundColor: isPoliceView ? '#1A1A1A' : (isDarkMode ? theme.settingsBackground : '#F3F4F6'),
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    multimediaText: {
      fontSize: fonts.caption,
      color: isPoliceView ? '#D0D0D0' : theme.text,
    },
    noteText: {
      fontSize: fonts.caption,
      color: isPoliceView ? '#A0A0A0' : theme.secondaryText,
      lineHeight: 18,
      fontStyle: 'italic',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isPoliceView ? '#1A1A1A' : theme.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: fonts.body,
      color: isPoliceView ? '#A0A0A0' : theme.secondaryText,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isPoliceView ? '#1A1A1A' : theme.background,
      padding: 20,
    },
    errorText: {
      fontSize: fonts.body,
      color: '#EF4444',
      textAlign: 'center',
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: isPoliceView ? '#2d3480' : theme.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      marginBottom: 12,
    },
    retryButtonText: {
      color: isPoliceView ? '#FFFFFF' : theme.background,
      fontSize: fonts.caption,
      fontWeight: '600',
    },
    mediaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    mediaItem: {
      width: '30%',
      aspectRatio: 1,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: isPoliceView ? '#2A2A2A' : theme.background,
      borderWidth: 1,
      borderColor: isPoliceView ? '#404040' : theme.border,
    },
    mediaImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    videoPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isPoliceView ? '#2A2A2A' : theme.background,
    },
    videoIcon: {
      fontSize: 24,
      marginBottom: 4,
    },
    videoText: {
      fontSize: 10,
      color: isPoliceView ? '#A0A0A0' : theme.secondaryText,
      textAlign: 'center',
    },
    filePlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isPoliceView ? '#2A2A2A' : theme.background,
    },
    fileIcon: {
      fontSize: 24,
      marginBottom: 4,
    },
    fileText: {
      fontSize: 10,
      color: isPoliceView ? '#A0A0A0' : theme.secondaryText,
      textAlign: 'center',
    },
    callButton: {
      backgroundColor: '#10B981',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
      minHeight: 48,
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    callButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '700',
    },
    resolveButton: {
      backgroundColor: '#10B981',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 8,
      minHeight: 48,
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    resolveButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '700',
    },
    mapButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 0,
      marginBottom: 80,
      minHeight: 48,
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    mapButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '700',
    },
    imageModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageModalClose: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageModalCloseText: {
      color: 'white',
      fontSize: 20,
      fontWeight: 'bold',
    },
    fullScreenImage: {
      width: '90%',
      height: '80%',
      resizeMode: 'contain',
    },
    videoModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    videoModalClose: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    videoModalCloseText: {
      color: 'white',
      fontSize: 20,
      fontWeight: 'bold',
    },
    fullScreenVideo: {
      width: '90%',
      height: '80%',
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading report details...</Text>
      </View>
    );
  }

  if (error || !report) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Report not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadReportDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Report Details</Text>
        <TouchableOpacity 
          onPress={() => {
            console.log('CrimeReportDetail: X button pressed directly');
            console.log('CrimeReportDetail: X button - onClose available:', !!onClose);
            handleBackPress();
          }} 
          style={styles.closeButton}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(report.status) }]}>
          <Text style={styles.statusBannerText}>
            Status: {report.status.toUpperCase()}
          </Text>
          <Text style={styles.statusDescription}>
            {getStatusDescription(report.status)}
          </Text>
        </View>

        {/* Report Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Report ID:</Text>
            <Text style={styles.infoValue}>{report.reportId || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Submitted:</Text>
            <Text style={styles.infoValue}>{formatDateTime(report.createdAt)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reporter:</Text>
            <Text style={styles.infoValue}>
              {report.anonymous ? 'Anonymous' : report.reporterName}
            </Text>
          </View>
        </View>

        {/* Crime Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crime Details</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type of Crime:</Text>
            <Text style={styles.infoValue}>{report.crimeType}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date & Time:</Text>
            <Text style={styles.infoValue}>{formatDateTime(report.dateTime.toString())}</Text>
          </View>

          {report.severity && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Severity:</Text>
              <View style={styles.severityInfoContainer}>
                <View style={[styles.severityIndicator, { backgroundColor: getSeverityColor(report.severity) }]} />
                <Text style={[styles.infoValue, styles.severityText]}>
                  {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Description:</Text>
            <Text style={styles.infoValue}>{report.description}</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>{report.location.address}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Coordinates:</Text>
            <Text style={styles.infoValue}>
              {report.location.latitude.toFixed(6)}, {report.location.longitude.toFixed(6)}
            </Text>
          </View>
        </View>

        {/* Multimedia Evidence */}
        {((report.multimedia && report.multimedia.length > 0) || (report.videos && report.videos.length > 0)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidence Attached</Text>
            <View style={styles.mediaGrid}>
              {/* Display images from multimedia array */}
              {report.multimedia && report.multimedia.map((item, index) => {
                // Check if it's a base64 data URL (for Realtime Database storage)
                const isBase64Image = item.startsWith('data:image/');
                // Check if it's a file path/URL with image extension (for Storage)
                const isImageFile = item.match(/\.(jpg|jpeg|png|gif)$/i);
                
                const isImage = isBase64Image || isImageFile;
                
                return (
                  <TouchableOpacity
                    key={`image-${index}`}
                    style={styles.mediaItem}
                    onPress={() => isImage ? handleImagePress(item) : null}
                  >
                    {isImage ? (
                      <Image source={{ uri: item }} style={styles.mediaImage} />
                    ) : (
                      <View style={styles.filePlaceholder}>
                        <Text style={styles.fileIcon}>📎</Text>
                        <Text style={styles.fileText}>File</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              
              {/* Display videos from videos array */}
              {report.videos && report.videos.map((videoUrl, index) => (
                <TouchableOpacity
                  key={`video-${index}`}
                  style={styles.mediaItem}
                  onPress={() => handleVideoPress(videoUrl)}
                >
                  <View style={styles.videoPlaceholder}>
                    <Text style={styles.videoIcon}>🎥</Text>
                    <Text style={styles.videoText}>Video</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Additional Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          <Text style={styles.noteText}>
            If you have additional information about this incident or need to update your report, 
            please contact local authorities or submit a new report with the updated information.
          </Text>
        </View>

        {/* VoIP Call Buttons */}
        {!isPoliceView && user && report && report.respondingOfficerId && report.reporterUid === user.uid && (
          <TouchableOpacity style={styles.callButton} onPress={handleCallOfficer}>
            <Text style={styles.callButtonText}>Call Assigned Officer</Text>
          </TouchableOpacity>
        )}

        {isPoliceView && user && report && !report.anonymous && (
          <TouchableOpacity style={styles.callButton} onPress={handleCallCivilian}>
            <Text style={styles.callButtonText}>Call Civilian Reporter</Text>
          </TouchableOpacity>
        )}

        {/* Case Resolved Button - Only for police users */}
        {isPoliceView && user && report && (
          <TouchableOpacity style={styles.resolveButton} onPress={handleResolveCase}>
            <Text style={styles.resolveButtonText}>Mark Case as Resolved</Text>
          </TouchableOpacity>
        )}

        {/* Map Button - Show for police users or for current user's reports */}
        {user && report && (isPoliceView || report.reporterUid === user.uid) && (
          <TouchableOpacity style={styles.mapButton} onPress={openMap}>
            <Text style={styles.mapButtonText}>View Location on Map</Text>
          </TouchableOpacity>
        )}
        
      </ScrollView>

      {/* Map Modal */}
      {showMap && report && (
        <Modal
          visible={showMap}
          animationType="slide"
          onRequestClose={closeMap}
        >
          {isPoliceView ? (
            <PoliceCrimeReportMap
              reportId={reportId}
              crimeLocation={report.location}
              crimeType={report.crimeType}
              reporterUid={report.reporterUid}
              onClose={closeMap}
            />
          ) : (
            <CrimeReportMap
              reportId={reportId}
              crimeLocation={report.location}
              onClose={closeMap}
            />
          )}
        </Modal>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <Modal
          visible={showImageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={closeImageModal}
        >
          <View style={styles.imageModalOverlay}>
            <TouchableOpacity style={styles.imageModalClose} onPress={closeImageModal}>
              <Text style={styles.imageModalCloseText}>✕</Text>
            </TouchableOpacity>
            <Image source={{ uri: selectedImage }} style={styles.fullScreenImage} />
          </View>
        </Modal>
      )}

      {/* Video Modal */}
      {showVideoModal && selectedVideo && (
        <Modal
          visible={showVideoModal}
          transparent={true}
          animationType="fade"
          onRequestClose={closeVideoModal}
        >
          <View style={styles.videoModalOverlay}>
            <TouchableOpacity style={styles.videoModalClose} onPress={closeVideoModal}>
              <Text style={styles.videoModalCloseText}>✕</Text>
            </TouchableOpacity>
            <Video
              source={{ uri: selectedVideo }}
              style={styles.fullScreenVideo}
              controls={true}
              resizeMode="contain"
              onError={(error) => {
                console.error('Video playback error:', error);
                Alert.alert('Video Error', 'Failed to play video. Please try again.');
              }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
};

export default CrimeReportDetail;