import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FirebaseService, CrimeReport } from './services/firebaseService';
import { useTheme, colors, fontSizes } from './services/themeContext';
import { useLanguage } from './services/languageContext';

interface CrimeReportDetailProps {
  reportId: string;
  onClose: () => void;
}

const CrimeReportDetail = ({ reportId, onClose }: CrimeReportDetailProps) => {
  const { isDarkMode, fontSize } = useTheme();
  const { t } = useLanguage();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const [report, setReport] = useState<CrimeReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      case 'pending':
        return '#F59E0B';
      case 'investigating':
        return '#3B82F6';
      case 'resolved':
        return '#10B981';
      case 'closed':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Your report has been submitted and is awaiting review by authorities.';
      case 'investigating':
        return 'Authorities are currently investigating your report. You may be contacted for additional information.';
      case 'resolved':
        return 'Your report has been resolved. Thank you for helping keep the community safe.';
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
      color: theme.primary,
    },
    headerSpacer: {
      width: 60,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    statusBanner: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
    },
    statusBannerText: {
      color: '#FFFFFF',
      fontSize: fonts.subtitle,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    statusDescription: {
      color: '#FFFFFF',
      fontSize: fonts.caption,
      lineHeight: 20,
      opacity: 0.9,
    },
    section: {
      backgroundColor: theme.menuBackground,
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sectionTitle: {
      fontSize: fonts.subtitle,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: 'row',
      marginBottom: 12,
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
      lineHeight: 20,
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
            {report.multimedia.map((item, index) => (
              <View key={index} style={styles.multimediaItem}>
                <Text style={styles.multimediaText}>📎 {item}</Text>
              </View>
            ))}
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
      </ScrollView>
    </View>
  );
};

export default CrimeReportDetail;