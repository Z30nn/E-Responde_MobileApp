import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { FirebaseService, CrimeReport, CivilianUser } from '../../services/firebaseService';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, get } from 'firebase/database';
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
  const [userDetails, setUserDetails] = useState<{ [uid: string]: CivilianUser }>({});

  const fetchUserDetails = useCallback(async (reportsData: CrimeReport[]) => {
    const uniqueUids = [...new Set(reportsData.map(report => report.reporterUid))];
    const userDetailsMap: { [uid: string]: CivilianUser } = {};
    
    for (const uid of uniqueUids) {
      try {
        const userDetailsData = await FirebaseService.getCivilianUser(uid);
        if (userDetailsData) {
          userDetailsMap[uid] = userDetailsData;
        }
      } catch (fetchError) {
        console.error(`Error fetching user details for ${uid}:`, fetchError);
      }
    }
    
    setUserDetails(userDetailsMap);
  }, []);

  const loadAssignedReports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get assigned crime reports for the current police officer
      const assignedReports = await FirebaseService.getAssignedCrimeReports(user.uid);
      console.log('Loaded assigned crime reports for police:', assignedReports.length);
      setReports(assignedReports);
      
      // Fetch user details for all reporters
      await fetchUserDetails(assignedReports);
    } catch (loadError) {
      console.error('Error loading assigned crime reports:', loadError);
      setError('Failed to load assigned crime reports');
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [fetchUserDetails, user]);

  useEffect(() => {
    if (!user) return;
    
    loadAssignedReports();
    
    // Set up real-time listener for the police officer's current assignment
    const assignmentRef = ref(database, `police/police account/${user.uid}/currentAssignment`);
    
    const handleAssignmentUpdate = async (snapshot: any) => {
      if (snapshot.exists()) {
        const assignment = snapshot.val();
        if (assignment.reportId) {
          // Get the assigned report
          const reportRef = ref(database, `civilian/civilian crime reports/${assignment.reportId}`);
          const reportSnapshot = await get(reportRef);
          
          if (reportSnapshot.exists()) {
            const report = reportSnapshot.val();
            const crimeReport: CrimeReport = {
              ...report,
              reportId: reportSnapshot.key || undefined,
              dateTime: new Date(report.dateTime),
            };
            setReports([crimeReport]);
            await fetchUserDetails([crimeReport]);
          } else {
            setReports([]);
          }
        } else {
          setReports([]);
        }
      } else {
        setReports([]);
      }
    };
    
    onValue(assignmentRef, handleAssignmentUpdate);
    
    // Cleanup listener on unmount
    return () => {
      off(assignmentRef, 'value', handleAssignmentUpdate);
    };
  }, [loadAssignedReports, fetchUserDetails, user]);

  const handleRefresh = () => {
    loadAssignedReports(true);
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


  const renderReportCard = ({ item }: { item: CrimeReport }) => {

    return (
      <TouchableOpacity
        style={styles.reportCard}
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
            <Text style={styles.location}>
              {typeof item.location === 'object' && item.location !== null 
                ? (item.location.address || 'Location not available')
                : 'Location not available'}
            </Text>
          </View>
          
          {/* Vote Counts (Display Only - No Interaction) */}
          <View style={styles.votesContainer}>
            <View style={styles.voteItem}>
              <Image 
                source={require('../../assets/upvote.png')} 
                style={styles.voteIcon}
              />
              <Text style={styles.voteCount}>{item.upvotes || 0}</Text>
            </View>
            <View style={styles.voteItem}>
              <Image 
                source={require('../../assets/downvote.png')} 
                style={styles.voteIcon}
              />
              <Text style={styles.voteCount}>{item.downvotes || 0}</Text>
            </View>
          </View>
        </View>


        {/* Always show reporter name for police - even if anonymous to civilians */}
        {item.reporterUid && userDetails[item.reporterUid] ? (
          <Text style={styles.reporter}>
            Reported by: {userDetails[item.reporterUid].firstName} {userDetails[item.reporterUid].lastName}
            {item.anonymous && <Text style={styles.anonymousNote}> (Anonymous to public)</Text>}
          </Text>
        ) : (
          <Text style={styles.reporter}>
            {item.anonymous ? 'Anonymous Report' : `Reported by: ${item.reporterName}`}
          </Text>
        )}

        {/* Assigned Report Indicator */}
        <View style={styles.assignedIndicator}>
          <Text style={styles.assignedText}>✓ Assigned to You</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2d3480" />
        <Text style={styles.loadingText}>Loading assigned crime reports...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadAssignedReports()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (reports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No assigned crime reports</Text>
        <Text style={styles.emptySubtext}>
          Crime reports assigned to you will appear here
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
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#404040',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
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
    color: '#FFFFFF',
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
    color: '#A0A0A0',
    fontStyle: 'italic',
  },
  description: {
    fontSize: 14,
    color: '#D0D0D0',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#404040',
    paddingTop: 12,
  },
  locationRow: {
    marginBottom: 8,
  },
  location: {
    fontSize: 13,
    color: '#B0B0B0',
  },
  votesContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  voteItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
    tintColor: '#A0A0A0',
  },
  voteCount: {
    fontSize: 13,
    color: '#A0A0A0',
    fontWeight: '500',
  },
  reporter: {
    fontSize: 12,
    color: '#808080',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'right',
  },
  anonymousNote: {
    fontSize: 10,
    color: '#A0A0A0',
    fontStyle: 'normal',
  },
  assignedIndicator: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 12,
    alignItems: 'center',
  },
  assignedText: {
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
    color: '#A0A0A0',
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
    color: '#A0A0A0',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PoliceCrimeList;
