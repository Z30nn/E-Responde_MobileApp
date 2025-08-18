import React, { useState, useEffect } from 'react';
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
import { auth } from './firebaseConfig';

interface CrimeListFromOthersProps {
  onViewReport?: (reportId: string) => void;
}

const CrimeListFromOthers = ({ onViewReport }: CrimeListFromOthersProps) => {
  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOtherUsersReports();
  }, []);

  const loadOtherUsersReports = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentUser = auth.currentUser;
      console.log('Current user for crime list:', currentUser);
      if (!currentUser) {
        setError('User not authenticated');
        return;
      }

      // Get all crime reports from Firebase
      const allReports = await FirebaseService.getAllCrimeReports();
      console.log('All crime reports loaded:', allReports.length);
      
      // Filter out current user's reports
      const otherUsersReports = allReports.filter(report => report.reporterUid !== currentUser.uid);
      console.log('Other users crime reports:', otherUsersReports.length);
      
      setReports(otherUsersReports);
    } catch (error) {
      console.error('Error loading other users crime reports:', error);
      setError('Failed to load crime reports');
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
          📍 {item.location.address}
        </Text>
        <Text style={styles.reporter}>
          {item.anonymous ? 'Anonymous Report' : `By: ${item.reporterName}`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Loading crime reports...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadOtherUsersReports}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (reports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No crime reports from others</Text>
        <Text style={styles.emptySubtext}>
          Be the first to report a crime in your area
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
        onRefresh={loadOtherUsersReports}
        refreshing={isLoading}
        nestedScrollEnabled={true}
      />
    </View>
  );
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
    color: '#1E3A8A',
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
    color: '#6B7280',
    fontStyle: 'italic',
  },
  description: {
    fontSize: 16,
    color: '#374151',
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
    color: '#6B7280',
    flex: 1,
  },
  reporter: {
    fontSize: 14,
    color: '#9CA3AF',
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
    color: '#6B7280',
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
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
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

export default CrimeListFromOthers;
