import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FirebaseService, CrimeReport } from './services/firebaseService';
import { auth, database } from './firebaseConfig';
import { ref, onValue, off } from 'firebase/database';
import { useTheme, colors } from './services/themeContext';

interface CrimeReportsListProps {
  onViewReport: (reportId: string) => void;
}

const CrimeReportsList = ({ onViewReport }: CrimeReportsListProps) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserReports();
    
    // Set up real-time listener for status updates
    const currentUser = auth.currentUser;
    if (currentUser) {
      const reportsRef = ref(database, `civilian/civilian account/${currentUser.uid}/crime reports`);
      
      const handleStatusChange = (snapshot: any) => {
        console.log('CrimeReportsList: Real-time update detected');
        if (snapshot.exists()) {
          const reportsData = snapshot.val();
          console.log('CrimeReportsList: Reports data updated:', reportsData);
          const reportsArray = Object.keys(reportsData).map(key => {
            const report = {
              ...reportsData[key],
              reportId: key
            };
            console.log('CrimeReportsList: Report status:', key, report.status);
            return report;
          });
          
          // Sort by creation date (newest first)
          const sortedReports = reportsArray.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setReports(sortedReports);
        } else {
          console.log('CrimeReportsList: No reports found');
          setReports([]);
        }
      };
      
      onValue(reportsRef, handleStatusChange);
      
      // Also listen to the main civilian crime reports path to catch admin updates
      const allReportsRef = ref(database, 'civilian/civilian crime reports');
      const handleAllReportsChange = (snapshot: any) => {
        console.log('CrimeReportsList: All reports update detected');
        if (snapshot.exists()) {
          const allReportsData = snapshot.val();
          console.log('CrimeReportsList: All reports data:', allReportsData);
          // Filter reports for current user
          const userReports: CrimeReport[] = [];
          Object.keys(allReportsData).forEach(reportId => {
            const report = allReportsData[reportId];
            if (report.reporterUid === currentUser.uid) {
              userReports.push({
                ...report,
                reportId: reportId
              });
            }
          });
          console.log('CrimeReportsList: User reports from all reports:', userReports);
          
          // Sort by creation date (newest first)
          const sortedReports = userReports.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setReports(sortedReports);
        }
      };
      
      onValue(allReportsRef, handleAllReportsChange);
      
      // Cleanup listeners on unmount
      return () => {
        off(reportsRef, 'value', handleStatusChange);
        off(allReportsRef, 'value', handleAllReportsChange);
      };
    }
  }, []);

  const loadUserReports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      const currentUser = auth.currentUser;
      console.log('Current user:', currentUser);
      if (!currentUser) {
        setError('User not authenticated');
        return;
      }

      // Get user's crime reports from Firebase
      const userReports = await FirebaseService.getUserCrimeReports(currentUser.uid);
      console.log('Loaded crime reports:', userReports.length, userReports);
      setReports(userReports);
    } catch (error) {
      console.error('Error loading crime reports:', error);
      setError('Failed to load crime reports');
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  const handleRefresh = () => {
    loadUserReports(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
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

  const styles = StyleSheet.create({
    listContainer: {
      flex: 1,
      minHeight: 300,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 20,
    },
    reportCard: {
      backgroundColor: theme.menuBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    cardHeader: {
      marginBottom: 12,
    },
    crimeTypeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    crimeType: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDarkMode ? '#f8f9ed' : theme.primary,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      minWidth: 80,
      // Remove any default backgroundColor to ensure our dynamic color shows
    },
    statusText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      textTransform: 'capitalize',
    },
    dateTime: {
      fontSize: 14,
      color: theme.secondaryText,
      fontStyle: 'italic',
    },
    description: {
      fontSize: 16,
      color: theme.text,
      lineHeight: 22,
      marginBottom: 16,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    location: {
      fontSize: 14,
      color: theme.secondaryText,
      flex: 1,
    },
    reporter: {
      fontSize: 14,
      color: theme.secondaryText,
      fontStyle: 'italic',
      textAlign: 'right',
    },
    loadingContainer: {
      alignItems: 'center',
      padding: 40,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.secondaryText,
    },
    errorContainer: {
      alignItems: 'center',
      padding: 40,
    },
    errorText: {
      fontSize: 16,
      color: '#EF4444',
      textAlign: 'center',
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryButtonText: {
      color: theme.background,
      fontSize: 14,
      fontWeight: '600',
    },
    emptyContainer: {
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 18,
      color: theme.secondaryText,
      fontWeight: '600',
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.secondaryText,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

  const renderReportCard = ({ item }: { item: CrimeReport }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => onViewReport(item.reportId || '')}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.crimeTypeContainer}>
          <Text style={styles.crimeType}>{item.crimeType}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.dateTime}>
          {formatDate(item.dateTime.toString())} at {formatTime(item.dateTime.toString())}
        </Text>
      </View>
      
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.cardFooter}>
        <Text style={styles.location}>
          📍 {item.location.address}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading your crime reports...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadUserReports}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (reports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No crime reports yet</Text>
        <Text style={styles.emptySubtext}>
          Submit your first crime report using the button below
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      <FlatList
        data={reports}
        renderItem={renderReportCard}
        keyExtractor={(item) => item.reportId || item.createdAt}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
        nestedScrollEnabled={true}
      />
    </View>
  );
};

export default CrimeReportsList;