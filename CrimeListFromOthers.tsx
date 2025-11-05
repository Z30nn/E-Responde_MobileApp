import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback, useMemo, useRef } from 'react';
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
import Pagination from './components/pagination';
import Geolocation from '@react-native-community/geolocation';

interface CrimeListFromOthersProps {
  onViewReport?: (reportId: string) => void;
  isVisible?: boolean; // Track if component is visible/active
}

export interface CrimeListFromOthersRef {
  openFilterModal: () => void;
}

const CrimeListFromOthers = forwardRef<CrimeListFromOthersRef, CrimeListFromOthersProps>(
  ({ onViewReport, isVisible = true }, ref) => {
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
  const [selectedFilterType, setSelectedFilterType] = useState<string>('all');
  const [showFilterSubmenu, setShowFilterSubmenu] = useState<'status' | 'crimeType' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Refs for debouncing and visibility tracking (must be declared before other hooks)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isVisibleRef = useRef(isVisible);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }, []);

  // Get user's current location
  useEffect(() => {
    if (selectedStatus === 'nearest') {
      Geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setUserLocation(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    }
  }, [selectedStatus]);

  // Filter reports based on selected status
  const filterReports = useCallback((reportsList: CrimeReport[], status: string) => {
    let filtered = reportsList;

    if (status === 'all') {
      filtered = reportsList;
    } else if (['pending', 'received', 'in progress', 'resolved', 'dispatched'].includes(status.toLowerCase())) {
      // Status-based filters
      filtered = reportsList.filter(report => {
        if (!report.status) return false;
        const reportStatus = report.status.toLowerCase().trim();
        const filterStatus = status.toLowerCase();
        
        // Handle "Case Resolved" status in database (stored as "Case Resolved")
        if (filterStatus === 'resolved') {
          return reportStatus === 'resolved' || reportStatus === 'case resolved';
        }
        
        // Handle "In Progress" status (may be stored as "In Progress" or "in progress")
        if (filterStatus === 'in progress') {
          return reportStatus === 'in progress';
        }
        
        return reportStatus === filterStatus;
      });
    } else if (status === 'thisWeek') {
      // This Week filter - using createdAt ISO string (e.g., "2025-10-23T04:34:25.736Z")
      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999); // End of today
      
      // Calculate start of week (Sunday at 00:00:00)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      filtered = reportsList.filter(report => {
        // Use createdAt directly (ISO string format: "2025-10-23T04:34:25.736Z")
        if (!report.createdAt) return false;
        
        const reportDate = new Date(report.createdAt);
        
        // Check if date is valid
        if (isNaN(reportDate.getTime())) return false;
        
        // Report must be between start of week and end of today
        return reportDate.getTime() >= startOfWeek.getTime() && 
               reportDate.getTime() <= endOfToday.getTime();
      });
    } else if (status === 'thisMonth') {
      // This Month filter - using createdAt ISO string (e.g., "2025-10-23T04:34:25.736Z")
      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999); // End of today
      
      // Calculate start of current month (1st day at 00:00:00)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      filtered = reportsList.filter(report => {
        // Use createdAt directly (ISO string format: "2025-10-23T04:34:25.736Z")
        if (!report.createdAt) return false;
        
        const reportDate = new Date(report.createdAt);
        
        // Check if date is valid
        if (isNaN(reportDate.getTime())) return false;
        
        // Report must be between start of month and end of today
        return reportDate.getTime() >= startOfMonth.getTime() && 
               reportDate.getTime() <= endOfToday.getTime();
      });
    } else if (status === 'nearest') {
      // Nearest crime reports filter
      if (userLocation) {
        filtered = reportsList.map(report => ({
          ...report,
          distance: report.location ? calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            report.location.latitude,
            report.location.longitude
          ) : Infinity
        }));
        // Filter out reports without location and sort by distance (nearest first)
        filtered = filtered
          .filter(report => report.distance !== undefined && report.distance !== Infinity)
          .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        // Limit to nearest 50 reports, then sort chronologically
        filtered = filtered.slice(0, 50);
      } else {
        // If location not available, return empty array
        filtered = [];
      }
    } else {
      // Crime type filter
      const crimeTypes = ['Assault', 'Breaking and Entering', 'Domestic Violence', 'Drug-related', 'Fraud', 'Harassment', 'Theft', 'Vandalism', 'Vehicle Theft', 'Other'];
      if (crimeTypes.includes(status)) {
        filtered = reportsList.filter(report => report.crimeType === status);
      }
    }

    // Always sort by creation date (most recent first) regardless of filter
    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [calculateDistance, userLocation]);

  // Apply filter when reports, selectedStatus, or userLocation changes
  const filteredReportsMemo = useMemo(() => {
    return filterReports(reports, selectedStatus);
  }, [reports, selectedStatus, filterReports]);

  useEffect(() => {
    setFilteredReports(filteredReportsMemo);
    // Reset to page 1 when filter changes
    setCurrentPage(1);
  }, [filteredReportsMemo]);

  // Keep refs in sync with props
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Expose filter modal control to parent
  useImperativeHandle(ref, () => ({
    openFilterModal: () => setShowFilterModal(true)
  }));

  // Load initial reports function
  const loadOtherUsersReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError(t('crimeList.userNotAuthenticated'));
        return;
      }

      // Get all crime reports excluding current user's reports
      const otherUsersReports = await FirebaseService.getAllCrimeReportsExcludingUser(currentUser.uid);
      
      // Filter to only show verified reports (received or higher)
      const verifiedReports = otherUsersReports.filter(report => {
        if (!report.status) return false;
        const reportStatusLower = report.status.toLowerCase().trim();
        return (
          reportStatusLower === 'received' ||
          reportStatusLower === 'in progress' ||
          reportStatusLower === 'resolved' ||
          reportStatusLower === 'case resolved' ||
          reportStatusLower === 'dispatched' ||
          reportStatusLower === 'pending' // Include pending for now
        );
      });
      
      setReports(verifiedReports);
    } catch (error) {
      console.error('Error loading other users crime reports:', error);
      setError(t('crimeList.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Load initial reports
  useEffect(() => {
    if (isVisible) {
      loadOtherUsersReports();
    }
  }, [isVisible, loadOtherUsersReports]);

  // Set up real-time listener with debouncing and visibility tracking
  useEffect(() => {
    // Don't set up listener if not visible
    if (!isVisible) {
      return;
    }

    // Set up real-time listener for status updates from all users
    const allReportsRef = firebaseRef(database, 'civilian/civilian crime reports');
    
    const handleStatusChange = (snapshot: any) => {
      // Skip processing if component is not visible or not mounted
      if (!isVisibleRef.current || !isMountedRef.current) {
        return;
      }

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the update to prevent excessive processing
      debounceTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current || !isVisibleRef.current) {
          return;
        }

        if (snapshot.exists()) {
          const allReportsData = snapshot.val();
          const currentUser = auth.currentUser;
          
          if (currentUser) {
            // Filter out current user's reports and get all other users' reports
            // Only show reports that are "received" or higher (verified by authorities)
            const otherUsersReports: CrimeReport[] = [];
            
            // Process reports more efficiently
            const reportEntries = Object.entries(allReportsData);
            const currentUserUid = currentUser.uid;
            
            for (const [reportId, report] of reportEntries) {
              const reportData = report as any;
              
              // Skip if no status or is current user's report
              if (!reportData.status || reportData.reporterUid === currentUserUid) {
                continue;
              }

              // Only include reports that are verified (received or higher)
              const reportStatusLower = reportData.status.toLowerCase().trim();
              if (
                reportStatusLower === 'received' ||
                reportStatusLower === 'in progress' ||
                reportStatusLower === 'resolved' ||
                reportStatusLower === 'case resolved' ||
                reportStatusLower === 'dispatched' ||
                reportStatusLower === 'pending'
              ) {
                otherUsersReports.push({
                  ...reportData,
                  reportId: reportId,
                  dateTime: new Date(reportData.dateTime)
                });
              }
            }
            
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
            
            // Only update state if component is still mounted and visible
            if (isMountedRef.current && isVisibleRef.current) {
              setReports(otherUsersReports);
            }
          }
        }
      }, 300); // 300ms debounce delay
    };
    
    const unsubscribe = onValue(allReportsRef, handleStatusChange);
    
    // Cleanup listener on unmount or when visibility changes
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      // Unsubscribe from Firebase listener
      unsubscribe();
    };
  }, [isVisible]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const getStatusColor = useCallback((status: string) => {
    const statusLower = status.toLowerCase().trim();
    switch (statusLower) {
      case 'reported':
        return '#3B82F6'; // Blue (neutral, just logged)
      case 'received':
        return '#F59E0B'; // Yellow (acknowledged, pending action)
      case 'in progress':
        return '#F97316'; // Orange (active, ongoing, urgent)
      case 'resolved':
      case 'case resolved':
        return '#10B981'; // Green (completed, successful outcome)
      case 'dispatched':
        return '#8B5CF6'; // Purple (officer dispatched)
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
  }, []);

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

  const renderReportCard = useCallback(({ item }: { item: CrimeReport }) => (
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
          📍 {item.barangay && `${item.barangay} • `}{item.location?.address || 'Location not available'}
        </Text>
        <Text style={styles.reporter}>
          {item.anonymous ? 'Anonymous Report' : `By: ${item.reporterName || 'Unknown'}`}
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
  ), [formatDate, formatTime, getStatusColor, onViewReport, handleVote, getUserVote, votingReports]);

  // All hooks must be called before any early returns
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const keyExtractor = useCallback((item: CrimeReport) => item.reportId || item.createdAt || '', []);

  const getItemLayout = useCallback((_data: any, index: number) => ({
    length: 220, // Approximate item height
    offset: 220 * index,
    index,
  }), []);

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

  // Calculate pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  return (
    <View style={styles.listContainer}>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
      <FlatList
        data={paginatedReports}
        renderItem={renderReportCard}
        keyExtractor={keyExtractor}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={loadOtherUsersReports}
        refreshing={isLoading}
        nestedScrollEnabled={true}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
        getItemLayout={getItemLayout}
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowFilterSubmenu(null);
          setShowFilterModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {showFilterSubmenu && (
                  <TouchableOpacity
                    onPress={() => setShowFilterSubmenu(null)}
                    style={{ marginRight: 12, padding: 4 }}
                  >
                    <Text style={[styles.closeButtonText, { color: theme.text, fontSize: 20 }]}>←</Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.modalTitle, { color: theme.text, flex: 1 }]}>
                  {showFilterSubmenu === 'status' ? 'Select Status' :
                   showFilterSubmenu === 'crimeType' ? 'Select Crime Type' :
                   'Filter Crime Reports'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setShowFilterSubmenu(null);
                  setShowFilterModal(false);
                }} 
                style={styles.closeButton}
              >
                <Text style={[styles.closeButtonText, { color: theme.secondaryText }]}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterOptions}>
              {!showFilterSubmenu ? (
                // Main filter menu
                <>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      { borderBottomColor: theme.border },
                      selectedFilterType === 'all' && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      setSelectedFilterType('all');
                      setSelectedStatus('all');
                      setShowFilterModal(false);
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      { color: theme.text },
                      selectedFilterType === 'all' && { color: 'white' }
                    ]}>
                      All Crime Reports
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      { borderBottomColor: theme.border },
                      selectedFilterType === 'status' && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setShowFilterSubmenu('status')}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      { color: theme.text },
                      selectedFilterType === 'status' && { color: 'white' }
                    ]}>
                      Status →
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      { borderBottomColor: theme.border },
                      selectedFilterType === 'crimeType' && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setShowFilterSubmenu('crimeType')}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      { color: theme.text },
                      selectedFilterType === 'crimeType' && { color: 'white' }
                    ]}>
                      Crime Type →
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      { borderBottomColor: theme.border },
                      selectedFilterType === 'thisWeek' && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      setSelectedFilterType('thisWeek');
                      setSelectedStatus('thisWeek');
                      setShowFilterModal(false);
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      { color: theme.text },
                      selectedFilterType === 'thisWeek' && { color: 'white' }
                    ]}>
                      This Week
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      { borderBottomColor: theme.border },
                      selectedFilterType === 'thisMonth' && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      setSelectedFilterType('thisMonth');
                      setSelectedStatus('thisMonth');
                      setShowFilterModal(false);
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      { color: theme.text },
                      selectedFilterType === 'thisMonth' && { color: 'white' }
                    ]}>
                      This Month
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      { borderBottomColor: theme.border },
                      selectedFilterType === 'nearest' && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      setSelectedFilterType('nearest');
                      setSelectedStatus('nearest');
                      setShowFilterModal(false);
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      { color: theme.text },
                      selectedFilterType === 'nearest' && { color: 'white' }
                    ]}>
                      Nearest Crime Reports
                    </Text>
                  </TouchableOpacity>
                </>
              ) : showFilterSubmenu === 'status' ? (
                // Status submenu
                <>
                  {['Pending', 'Received', 'In Progress', 'Resolved', 'Dispatched'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        { borderBottomColor: theme.border },
                        selectedStatus.toLowerCase() === status.toLowerCase() && { backgroundColor: theme.primary }
                      ]}
                      onPress={() => {
                        setSelectedFilterType('status');
                        setSelectedStatus(status.toLowerCase());
                        setShowFilterModal(false);
                      }}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        { color: theme.text },
                        selectedStatus.toLowerCase() === status.toLowerCase() && { color: 'white' }
                      ]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                // Crime Type submenu
                <>
                  {['Assault', 'Breaking and Entering', 'Domestic Violence', 'Drug-related', 'Fraud', 'Harassment', 'Theft', 'Vandalism', 'Vehicle Theft', 'Other'].map((crimeType) => (
                    <TouchableOpacity
                      key={crimeType}
                      style={[
                        styles.filterOption,
                        { borderBottomColor: theme.border },
                        selectedStatus === crimeType && { backgroundColor: theme.primary }
                      ]}
                      onPress={() => {
                        setSelectedFilterType('crimeType');
                        setSelectedStatus(crimeType);
                        setShowFilterModal(false);
                      }}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        { color: theme.text },
                        selectedStatus === crimeType && { color: 'white' }
                      ]}>
                        {crimeType}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
  }
);

CrimeListFromOthers.displayName = 'CrimeListFromOthers';

export default CrimeListFromOthers;