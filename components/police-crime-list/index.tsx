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
import { FirebaseService, CrimeReport } from '../../services/firebaseService';
import { database } from '../../firebaseConfig';
import { ref, onValue, off } from 'firebase/database';
import { useAuth } from '../../services/authContext';

interface PoliceCrimeListProps {
  onViewReport: (reportId: string) => void;
}

const PoliceCrimeList = ({ onViewReport }: PoliceCrimeListProps) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioningReportId, setActioningReportId] = useState<string | null>(null);

  useEffect(() => {
    loadAllReports();
    
    // Set up real-time listener for all crime reports
    const reportsRef = ref(database, 'civilian/civilian crime reports');
    
    const handleReportsUpdate = (snapshot: any) => {
      if (snapshot.exists()) {
        const reportsData = snapshot.val();
        const reportsArray = Object.keys(reportsData).map(key => ({
          ...reportsData[key],
          reportId: key,
          dateTime: new Date(reportsData[key].dateTime),
        }));
        
        // Sort by creation date (newest first)
        const sortedReports = reportsArray.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setReports(sortedReports);
      } else {
        setReports([]);
      }
    };
    
    onValue(reportsRef, handleReportsUpdate);
    
    // Cleanup listener on unmount
    return () => {
      off(reportsRef, 'value', handleReportsUpdate);
    };
  }, []);

  const loadAllReports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Get all crime reports from Firebase
      const allReports = await FirebaseService.getAllCrimeReports();
      console.log('Loaded all crime reports for police:', allReports.length);
      setReports(allReports);
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
    loadAllReports(true);
  };

  const handleRespondToReport = async (reportId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to respond to reports');
      return;
    }

    try {
      setActioningReportId(reportId);
      
      Alert.alert(
        'Respond to Report',
        'Do you want to become the responding officer for this crime report?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setActioningReportId(null),
          },
          {
            text: 'Respond',
            onPress: async () => {
              try {
                const success = await FirebaseService.assignRespondingOfficer(reportId, user.uid);
                if (success) {
                  Alert.alert('Success', 'You are now the responding officer for this report');
                  loadAllReports(true);
                }
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to assign officer');
              } finally {
                setActioningReportId(null);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to respond to report');
      setActioningReportId(null);
    }
  };

  const handleCancelResponse = async (reportId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to cancel response');
      return;
    }

    try {
      setActioningReportId(reportId);
      
      Alert.alert(
        'Cancel Response',
        'Are you sure you want to cancel your response to this report?',
        [
          {
            text: 'No',
            style: 'cancel',
            onPress: () => setActioningReportId(null),
          },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              try {
                const success = await FirebaseService.removeRespondingOfficer(reportId, user.uid);
                if (success) {
                  Alert.alert('Success', 'You are no longer the responding officer for this report');
                  loadAllReports(true);
                }
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to remove officer');
              } finally {
                setActioningReportId(null);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to cancel response');
      setActioningReportId(null);
    }
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
        return '#3B82F6'; // Blue
      case 'received':
        return '#F59E0B'; // Yellow
      case 'in progress':
        return '#F97316'; // Orange
      case 'resolved':
        return '#10B981'; // Green
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

  const isCurrentOfficerResponding = (report: CrimeReport) => {
    return user && report.respondingOfficerId === user.uid;
  };

  const renderReportCard = ({ item }: { item: CrimeReport }) => {
    const isResponding = isCurrentOfficerResponding(item);
    const hasRespondingOfficer = !!item.respondingOfficerId;
    const isActioning = actioningReportId === item.reportId;

    return (
      <TouchableOpacity
        style={[
          styles.reportCard,
          isResponding && styles.respondingReportCard
        ]}
        onPress={() => onViewReport(item.reportId || '')}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerRow}>
            <Text style={styles.crimeType}>{item.crimeType}</Text>
            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
              <Text style={styles.severityText}>{item.severity}</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
            <Text style={styles.dateTime}>
              {formatDate(item.dateTime.toString())} at {formatTime(item.dateTime.toString())}
            </Text>
          </View>
        </View>
        
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.locationRow}>
            <Text style={styles.location}>📍 {item.location.address}</Text>
          </View>
          
          {/* Vote Counts (Display Only - No Interaction) */}
          <View style={styles.votesContainer}>
            <View style={styles.voteItem}>
              <Text style={styles.voteCount}>👍 {item.upvotes || 0}</Text>
            </View>
            <View style={styles.voteItem}>
              <Text style={styles.voteCount}>👎 {item.downvotes || 0}</Text>
            </View>
          </View>
        </View>

        {/* Responding Officer Info */}
        {hasRespondingOfficer && (
          <View style={styles.respondingOfficerInfo}>
            <Text style={styles.respondingOfficerLabel}>
              {isResponding ? '✅ You are responding' : `🚔 ${item.respondingOfficerName}`}
            </Text>
            {item.respondingOfficerBadgeNumber && !isResponding && (
              <Text style={styles.respondingOfficerBadge}>
                Badge: {item.respondingOfficerBadgeNumber}
              </Text>
            )}
          </View>
        )}

        {!item.anonymous && item.reporterName && (
          <Text style={styles.reporter}>Reported by: {item.reporterName}</Text>
        )}
        {item.anonymous && (
          <Text style={styles.reporter}>Anonymous Report</Text>
        )}

        {/* Respond/Cancel Button */}
        <View style={styles.actionButtonContainer}>
          {isResponding ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelResponse(item.reportId || '')}
              disabled={isActioning}
            >
              {isActioning ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.actionButtonText}>❌ Cancel Response</Text>
                </>
              )}
            </TouchableOpacity>
          ) : !hasRespondingOfficer ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.respondButton]}
              onPress={() => handleRespondToReport(item.reportId || '')}
              disabled={isActioning}
            >
              {isActioning ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.actionButtonText}>🚔 Respond to Report</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={[styles.actionButton, styles.assignedButton]}>
              <Text style={styles.actionButtonText}>📍 Already Assigned</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2d3480" />
        <Text style={styles.loadingText}>Loading crime reports...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadAllReports()}>
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
          Crime reports from civilians will appear here
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
      />
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  respondingReportCard: {
    borderColor: '#3B82F6',
    borderWidth: 2,
    backgroundColor: '#EFF6FF',
  },
  cardHeader: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  crimeType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateTime: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  locationRow: {
    marginBottom: 8,
  },
  location: {
    fontSize: 13,
    color: '#6B7280',
  },
  votesContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  voteItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteCount: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  respondingOfficerInfo: {
    backgroundColor: '#DBEAFE',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  respondingOfficerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
  },
  respondingOfficerBadge: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  reporter: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'right',
  },
  actionButtonContainer: {
    marginTop: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  respondButton: {
    backgroundColor: '#2d3480',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  assignedButton: {
    backgroundColor: '#9CA3AF',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2d3480',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PoliceCrimeList;
