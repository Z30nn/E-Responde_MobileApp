import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { FirebaseService, CrimeReport } from './services/firebaseService';
import { auth, database } from './firebaseConfig';
import { ref as firebaseRef, onValue, off } from 'firebase/database';
import { useTheme, colors } from './services/themeContext';
import { useLanguage } from './services/languageContext';

interface CrimeListFromOthersProps {
  onViewReport?: (reportId: string) => void;
}

export interface CrimeListFromOthersRef {
  openFilterModal: () => void;
}

const CrimeListFromOthers = forwardRef<CrimeListFromOthersRef, CrimeListFromOthersProps>(({ onViewReport }, ref) => {
  const { isDarkMode } = useTheme();
  const { t } = useLanguage();
  const theme = isDarkMode ? colors.dark : colors.light;
  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<CrimeReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votingReports, setVotingReports] = useState<Set<string>>(new Set());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Filter reports based on selected status
  const filterReports = (reportsList: CrimeReport[], status: string) => {
    if (status === 'all') {
      return reportsList;
    }
    
    // Status-based filters
    if (['pending', 'received', 'in progress', 'resolved'].includes(status)) {
      return reportsList.filter(report => 
        report.status && report.status.toLowerCase() === status.toLowerCase()
      );
    }
    
    // Time-based filters
    if (status === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return reportsList.filter(report => {
        const reportDate = new Date(report.createdAt);
        return reportDate >= sevenDaysAgo;
      });
    }
    
    if (status === 'this_month') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return reportsList.filter(report => {
        const reportDate = new Date(report.createdAt);
        return reportDate >= startOfMonth;
      });
    }
    
    // Severity-based filters
    if (['immediate', 'high', 'moderate', 'low'].includes(status)) {
      const severityMap: { [key: string]: string } = {
        'immediate': 'Immediate',
        'high': 'High',
        'moderate': 'Moderate',
        'low': 'Low'
      };
      return reportsList.filter(report => 
        report.severity === severityMap[status]
      );
    }
    
    return reportsList;
  };

  // Apply filter when reports or selectedStatus changes
  useEffect(() => {
    const filtered = filterReports(reports, selectedStatus);
    setFilteredReports(filtered);
  }, [reports, selectedStatus]);

  // Expose filter modal control to parent
  useImperativeHandle(ref, () => ({
    openFilterModal: () => setShowFilterModal(true)
  }));

  useEffect(() => {
    loadOtherUsersReports();
    
    // Set up real-time listener for status updates from all users
    const allReportsRef = firebaseRef(database, 'civilian/civilian crime reports');
    
    const handleStatusChange = (snapshot: any) => {
      if (snapshot.exists()) {
        const allReportsData = snapshot.val();
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          // Filter out current user's reports and get all other users' reports
          // Only show reports that are "received" or higher (verified by authorities)
          const otherUsersReports: CrimeReport[] = [];
          
          Object.keys(allReportsData).forEach(reportId => {
            const report = allReportsData[reportId];
            console.log('Real-time: Checking report:', reportId, 'Status:', report.status, 'Reporter UID:', report.reporterUid);
            // Only include reports from other users that are "received" or higher (verified by authorities)
            if (report.reporterUid !== currentUser.uid && report.status && (
              report.status.toLowerCase() === 'received' ||
              report.status.toLowerCase() === 'in progress' ||
              report.status.toLowerCase() === 'resolved' ||
              report.status.toLowerCase() === 'pending' // Include pending for now
            )) {
              console.log('Real-time: Adding verified report:', reportId, 'Status:', report.status);
              otherUsersReports.push({
                ...report,
                reportId: reportId,
                dateTime: new Date(report.dateTime)
              });
            } else {
              console.log('Real-time: Skipping report:', reportId, 'Status:', report.status, 'Reason:', report.reporterUid === currentUser.uid ? 'Own report' : 'Not verified');
            }
          });
          
          // Sort by upvotes (highest first), then by date (newest first) as tiebreaker
          otherUsersReports.sort((a, b) => {
            const upvotesA = a.upvotes || 0;
            const upvotesB = b.upvotes || 0;
            
            // First sort by upvotes (descending)
            if (upvotesA !== upvotesB) {
              return upvotesB - upvotesA;
            }
            
            // If upvotes are equal, sort by date (newest first)
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          
          setReports(otherUsersReports);
        }
      }
    };
    
    onValue(allReportsRef, handleStatusChange);
    
    // Cleanup listener on unmount
    return () => {
      off(allReportsRef, 'value', handleStatusChange);
    };
  }, []);

  const loadOtherUsersReports = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentUser = auth.currentUser;
      console.log('Current user for crime list:', currentUser);
      if (!currentUser) {
        setError(t('crimeList.userNotAuthenticated'));
        return;
      }

      // Get all crime reports excluding current user's reports
      const otherUsersReports = await FirebaseService.getAllCrimeReportsExcludingUser(currentUser.uid);
      console.log('Other users crime reports loaded:', otherUsersReports.length);
      
      // Filter to only show verified reports (received or higher)
      const verifiedReports = otherUsersReports.filter(report => 
        report.status && (
          report.status.toLowerCase() === 'received' ||
          report.status.toLowerCase() === 'in progress' ||
          report.status.toLowerCase() === 'resolved' ||
          report.status.toLowerCase() === 'pending' // Include pending for now
        )
      );
      console.log('Verified other users reports:', verifiedReports.length);
      
      setReports(verifiedReports);
    } catch (error) {
      console.error('Error loading other users crime reports:', error);
      setError(t('crimeList.failedToLoad'));
    } finally {
      setIsLoading(false);
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
    votingSection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    voteButtons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    voteButton: {
      flex: 0.4,
      padding: 8,
      marginHorizontal: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      alignItems: 'center',
      maxWidth: 80,
    },
    voteButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    voteButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    voteButtonTextActive: {
      color: 'white',
    },
    voteButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    voteIcon: {
      width: 16,
      height: 16,
      marginRight: 4,
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
    },
    filterIcon: {
      width: 20,
      height: 20,
      marginRight: 6,
    },
    filterButtonText: {
      color: '#374151',
      fontSize: 14,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: '80%',
      maxWidth: 300,
      borderRadius: 12,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    closeButton: {
      padding: 4,
    },
    closeButtonText: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    filterOptions: {
      paddingVertical: 8,
    },
    filterOption: {
      padding: 16,
      borderBottomWidth: 1,
    },
    filterOptionText: {
      fontSize: 16,
      fontWeight: '500',
    },
  });

  const handleVote = async (reportId: string, voteType: 'upvote' | 'downvote') => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to vote');
      return;
    }

    try {
      setVotingReports(prev => new Set(prev).add(reportId));
      
      // Find the current report to check existing vote
      const currentReport = reports.find(report => report.reportId === reportId);
      const currentUserVote = currentReport?.userVotes?.[currentUser.uid];
      
      // If user is voting the same way again, remove the vote
      if (currentUserVote === voteType) {
        await FirebaseService.removeVoteFromCrimeReport(reportId, currentUser.uid);
      } else {
        // Otherwise, vote normally (this handles switching votes too)
        await FirebaseService.voteOnCrimeReport(reportId, currentUser.uid, voteType);
      }
      
      // Refresh the reports to show updated vote counts
      await loadOtherUsersReports();
    } catch (error) {
      console.error('Error voting:', error);
      Alert.alert('Error', 'Failed to vote. Please try again.');
    } finally {
      setVotingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  };

  const getUserVote = (report: CrimeReport): 'upvote' | 'downvote' | null => {
    const currentUser = auth.currentUser;
    if (!currentUser || !report.userVotes) return null;
    return report.userVotes[currentUser.uid] || null;
  };

  const renderReportCard = ({ item }: { item: CrimeReport }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => onViewReport?.(item.reportId || '')}
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
          📍 {item.barangay && `${item.barangay} • `}{item.location.address}
        </Text>
        <Text style={styles.reporter}>
          {item.anonymous ? 'Anonymous Report' : `By: ${item.reporterName}`}
        </Text>
      </View>

      {/* Voting Section */}
      <View style={styles.votingSection}>
        <View style={styles.voteButtons}>
          <TouchableOpacity
            style={[
              styles.voteButton,
              getUserVote(item) === 'upvote' && styles.voteButtonActive
            ]}
            onPress={() => handleVote(item.reportId || '', 'upvote')}
            disabled={votingReports.has(item.reportId || '')}
          >
            <View style={styles.voteButtonContent}>
              <Image 
                source={require('./assets/upvote.png')} 
                style={styles.voteIcon}
                resizeMode="contain"
              />
              <Text style={[
                styles.voteButtonText,
                getUserVote(item) === 'upvote' && styles.voteButtonTextActive
              ]}>
                {item.upvotes || 0}
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.voteButton,
              getUserVote(item) === 'downvote' && styles.voteButtonActive
            ]}
            onPress={() => handleVote(item.reportId || '', 'downvote')}
            disabled={votingReports.has(item.reportId || '')}
          >
            <View style={styles.voteButtonContent}>
              <Image 
                source={require('./assets/downvote.png')} 
                style={styles.voteIcon}
                resizeMode="contain"
              />
              <Text style={[
                styles.voteButtonText,
                getUserVote(item) === 'downvote' && styles.voteButtonTextActive
              ]}>
                {item.downvotes || 0}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>{t('crimeList.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadOtherUsersReports}>
          <Text style={styles.retryButtonText}>{t('crimeList.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (filteredReports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('crimeList.noReports')}</Text>
        <Text style={styles.emptySubtext}>
          {t('crimeList.beFirstToReport')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      <FlatList
        data={filteredReports}
        renderItem={renderReportCard}
        keyExtractor={(item) => item.reportId || item.createdAt}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={loadOtherUsersReports}
        refreshing={isLoading}
        nestedScrollEnabled={true}
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filter Reports</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: theme.secondaryText }]}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterOptions}>
              {[
                { key: 'all', label: 'All Reports' },
                { key: 'pending', label: 'Pending' },
                { key: 'received', label: 'Received' },
                { key: 'in progress', label: 'In Progress' },
                { key: 'resolved', label: 'Resolved' },
                { key: 'recent', label: 'Recent (7 days)' },
                { key: 'this_month', label: 'This Month' },
                { key: 'immediate', label: 'Immediate' },
                { key: 'high', label: 'High Priority' },
                { key: 'moderate', label: 'Moderate' },
                { key: 'low', label: 'Low Priority' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterOption,
                    { borderBottomColor: theme.border },
                    selectedStatus === option.key && { backgroundColor: theme.primary }
                  ]}
                  onPress={() => {
                    setSelectedStatus(option.key);
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: theme.text },
                    selectedStatus === option.key && { color: 'white' }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

CrimeListFromOthers.displayName = 'CrimeListFromOthers';

export default CrimeListFromOthers;