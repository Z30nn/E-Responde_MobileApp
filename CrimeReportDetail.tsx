import React, { useState, useEffect } from 'react';
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
import { FirebaseService, CrimeReport } from './services/firebaseService';
import { useTheme, colors, fontSizes } from './services/themeContext';
import { useLanguage } from './services/languageContext';
import { useAuth } from './services/authContext';
import CrimeReportMap from './CrimeReportMap';

interface CrimeReportDetailProps {
  reportId: string;
  onClose: () => void;
}

const CrimeReportDetail = ({ reportId, onClose }: CrimeReportDetailProps) => {
  const { isDarkMode, fontSize } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const [report, setReport] = useState<CrimeReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadReportDetails();
  }, [reportId]);

  const loadReportDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const reportDetails = await FirebaseService.getCrimeReport(reportId);
      if (reportDetails) {
        setReport(reportDetails);
      } else {
        setError('Report not found');
      }
    } catch (error) {
      console.error('Error loading report details:', error);
      setError('Failed to load report details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePress = (imageUri: string) => {
    setSelectedImage(imageUri);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  const openMap = () => {
    if (report && report.location) {
      setShowMap(true);
    }
  };

  const closeMap = () => {
    setShowMap(false);
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      backgroundColor: theme.menuBackground,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 8,
    },
    backButtonText: {
      fontSize: fonts.body,
      color: theme.primary,
      fontWeight: '600',
    },
    headerTitle: {
      fontSize: fonts.subtitle,
      fontWeight: 'bold',
      color: isDarkMode ? '#f8f9ed' : theme.primary,
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
      backgroundColor: theme.menuBackground,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sectionTitle: {
      fontSize: fonts.caption,
      fontWeight: 'bold',
      color: theme.primary,
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
      color: theme.text,
      width: 100,
      flexShrink: 0,
    },
    infoValue: {
      fontSize: fonts.body,
      color: theme.secondaryText,
      flex: 1,
      lineHeight: 22,
    },
    multimediaItem: {
      backgroundColor: isDarkMode ? theme.settingsBackground : '#F3F4F6',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    multimediaText: {
      fontSize: fonts.caption,
      color: theme.text,
    },
    noteText: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      lineHeight: 18,
      fontStyle: 'italic',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: fonts.body,
      color: theme.secondaryText,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
      padding: 20,
    },
    errorText: {
      fontSize: fonts.body,
      color: '#EF4444',
      textAlign: 'center',
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      marginBottom: 12,
    },
    retryButtonText: {
      color: theme.background,
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
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
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
      backgroundColor: theme.background,
    },
    videoIcon: {
      fontSize: 24,
      marginBottom: 4,
    },
    videoText: {
      fontSize: 10,
      color: theme.secondaryText,
      textAlign: 'center',
    },
    filePlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },
    fileIcon: {
      fontSize: 24,
      marginBottom: 4,
    },
    fileText: {
      fontSize: 10,
      color: theme.secondaryText,
      textAlign: 'center',
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
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Details</Text>
        <View style={styles.headerSpacer} />
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
        {report.multimedia && report.multimedia.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidence Attached</Text>
            <View style={styles.mediaGrid}>
              {report.multimedia.map((item, index) => {
                const isImage = item.match(/\.(jpg|jpeg|png|gif)$/i);
                const isVideo = item.match(/\.(mp4|mov)$/i);
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.mediaItem}
                    onPress={() => isImage ? handleImagePress(item) : null}
                  >
                    {isImage ? (
                      <Image source={{ uri: item }} style={styles.mediaImage} />
                    ) : isVideo ? (
                      <View style={styles.videoPlaceholder}>
                        <Text style={styles.videoIcon}>🎥</Text>
                        <Text style={styles.videoText}>Video File</Text>
                      </View>
                    ) : (
                      <View style={styles.filePlaceholder}>
                        <Text style={styles.fileIcon}>📎</Text>
                        <Text style={styles.fileText}>File</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
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

        {/* Map Button - Only show for current user's reports */}
        {user && report && report.reporterUid === user.uid && (
          <TouchableOpacity style={styles.mapButton} onPress={openMap}>
            <Text style={styles.mapButtonText}>🗺️ View Location on Map</Text>
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
          <CrimeReportMap
            reportId={reportId}
            crimeLocation={report.location}
            onClose={closeMap}
          />
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
    </View>
  );
};

export default CrimeReportDetail;