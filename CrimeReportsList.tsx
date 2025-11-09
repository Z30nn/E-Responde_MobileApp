import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useTheme, colors, fontSizes } from './services/themeContext';
import Pagination from './components/pagination';
import Geolocation from '@react-native-community/geolocation';
// import { notificationService } from './services/notificationService'; // Removed to avoid duplicate notifications

interface CrimeReportsListProps {
  onViewReport: (reportId: string) => void;
  selectedStatus?: string;
}

const CrimeReportsList = ({ onViewReport, selectedStatus = 'all' }: CrimeReportsListProps) => {
  const { isDarkMode, fontSize } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<CrimeReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const REPORT_FETCH_LIMIT = 25;
  // const [previousReports, setPreviousReports] = useState<{[key: string]: CrimeReport}>({}); // Removed to avoid duplicate notifications

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

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
  const filterReports = (reportsList: CrimeReport[], status: string) => {
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
        // Limit to nearest reports, then sort chronologically
        filtered = filtered.slice(0, REPORT_FETCH_LIMIT);
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
  };

  // Apply filter when reports, selectedStatus, or userLocation changes
  useEffect(() => {
    const filtered = filterReports(reports, selectedStatus);
    setFilteredReports(filtered);
    // Reset to page 1 when filter changes
    setCurrentPage(1);
  }, [reports, selectedStatus, userLocation]);

  const loadUserReports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError('User not authenticated');
        return;
      }

      // Get user's crime reports from Firebase with the configured limit
      const userReports = await FirebaseService.getUserCrimeReports(currentUser.uid, REPORT_FETCH_LIMIT);
      setReports(userReports);
      // If we got less than the limit, there are no more to load
      setHasMore(userReports.length === REPORT_FETCH_LIMIT);
      
      // Status change monitoring removed to avoid duplicate notifications with Dashboard
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
    setHasMore(true);
    loadUserReports(true);
  };

  // Note: Status change monitoring is handled by Dashboard.tsx to avoid duplicate notifications

  useEffect(() => {
    loadUserReports();
    
    // Set up real-time listener for status updates
    const currentUser = auth.currentUser;
    if (currentUser) {
      
      const reportsRef = ref(database, `civilian/civilian account/${currentUser.uid}/crime reports`);
      
      const handleStatusChange = (snapshot: any) => {
        if (snapshot.exists()) {
          const reportsData = snapshot.val();
          
          const reportsArray = Object.keys(reportsData).map(key => {
            const report = {
              ...reportsData[key],
              reportId: key,
              dateTime: new Date(reportsData[key].dateTime)
            };
            return report;
          });
          
          // Sort by creation date (newest first) - will be re-sorted in filterReports
          const sortedReports = reportsArray.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          
          // Limit to latest reports to prevent memory issues
          const limitedReports = sortedReports.slice(0, REPORT_FETCH_LIMIT);
          
          setReports(limitedReports);
        } else {
          setReports([]);
        }
      };
      
      onValue(reportsRef, handleStatusChange);
      
      // Note: Status change monitoring removed to avoid duplicate notifications with Dashboard
      
      // Cleanup listeners on unmount
      return () => {
        off(reportsRef, 'value', handleStatusChange);
      };
    }

    return () => {};
  }, [loadUserReports]);

  const loadMoreReports = useCallback(async () => {
    if (isLoadingMore || !hasMore || reports.length === 0) return;
    
    try {
      setIsLoadingMore(true);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get the oldest report's createdAt to use as pagination cursor
      const oldestReport = reports[reports.length - 1];
      const startAfter = oldestReport.createdAt;

      // Load older reports
      const olderReports = await FirebaseService.getUserCrimeReports(currentUser.uid, REPORT_FETCH_LIMIT, startAfter);
      
      if (olderReports.length === 0) {
        setHasMore(false);
        return;
      }

      // Append older reports to existing ones
      setReports(prev => [...prev, ...olderReports]);
      
      // If we got less than the limit, there are no more to load
      setHasMore(olderReports.length === REPORT_FETCH_LIMIT);
    } catch (error) {
      console.error('Error loading more reports:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, reports]);

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
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          fontSize: fonts.subtitle,
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
          fontSize: fonts.caption,
          fontWeight: '600',
          textAlign: 'center',
          textTransform: 'capitalize',
        },
        dateTime: {
          fontSize: fonts.caption,
          color: theme.secondaryText,
          fontStyle: 'italic',
        },
        description: {
          fontSize: fonts.body,
          color: theme.text,
          lineHeight: fonts.body + 6,
          marginBottom: 16,
        },
        cardFooter: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        location: {
          fontSize: fonts.caption,
          color: theme.secondaryText,
          flex: 1,
        },
        reporter: {
          fontSize: fonts.caption,
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
          fontSize: fonts.body,
          color: theme.secondaryText,
        },
        errorContainer: {
          alignItems: 'center',
          padding: 40,
        },
        errorText: {
          fontSize: fonts.body,
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
          fontSize: fonts.caption,
          fontWeight: '600',
        },
        emptyContainer: {
          alignItems: 'center',
          padding: 40,
        },
        emptyText: {
          fontSize: fonts.subtitle,
          color: theme.secondaryText,
          fontWeight: '600',
          marginBottom: 8,
        },
        emptySubtext: {
          fontSize: fonts.caption,
          color: theme.secondaryText,
          textAlign: 'center',
          lineHeight: fonts.caption + 6,
        },
        loadMoreContainer: {
          padding: 20,
          alignItems: 'center',
        },
        loadMoreButton: {
          backgroundColor: theme.primary,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 8,
        },
        loadMoreButtonText: {
          color: '#FFFFFF',
          fontSize: fonts.body,
          fontWeight: '600',
        },
      }),
    [theme, fonts, isDarkMode],
  );

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
          📍 {item.barangay && `${item.barangay} • `}{item.location.address}
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
        <TouchableOpacity style={styles.retryButton} onPress={() => loadUserReports()}>
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

  // Calculate pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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
        keyExtractor={(item) => item.reportId || item.createdAt}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
        nestedScrollEnabled={true}
        ListFooterComponent={
          hasMore && reports.length >= REPORT_FETCH_LIMIT ? (
            <View style={styles.loadMoreContainer}>
              {isLoadingMore ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={loadMoreReports}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loadMoreButtonText}>Load More Reports</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />
    </View>
  );
};

export default CrimeReportsList;