import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { ref, onValue, off } from 'firebase/database';
import { database, auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useTheme, colors, fontSizes } from '../../services/themeContext';
import { useLanguage } from '../../services/languageContext';

interface SOSAlert {
  id: string;
  type: string;
  title: string;
  body: string;
  data: {
    fromUserId: string;
    fromUserName: string;
    fromUserPhone?: string;
    contactId: string;
    contactName: string;
    contactPhone: string;
    timestamp: string;
    isTest?: boolean;
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
  };
  timestamp: string;
  read: boolean;
}

interface SOSAlertsHistoryProps {
  userId: string;
  selectedAlertId?: string | null;
  onAlertSelected?: (alertId: string | null) => void;
}

const SOSAlertsHistory: React.FC<SOSAlertsHistoryProps> = ({ userId, selectedAlertId, onAlertSelected }) => {
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [newAlertReceived, setNewAlertReceived] = useState(false);
  const { isDarkMode, fontSize } = useTheme();
  const { t } = useLanguage();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];

  // Only show received alerts (alerts sent TO the user)
  const receivedAlerts = sosAlerts.filter(alert => alert.data?.fromUserId !== userId);

  useEffect(() => {
    if (!userId) return;

    console.log('SOSAlertsHistory: Setting up real-time listener for user:', userId);
    console.log('SOSAlertsHistory: Database path:', `civilian/civilian account/${userId}/notifications`);
    
    // Set up authentication state listener
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log('SOSAlertsHistory: Auth state changed:', user?.uid);
      
      if (!user) {
        console.log('SOSAlertsHistory: User not authenticated, skipping real-time listener');
        setLoading(false);
        return;
      }
      
      if (user.uid !== userId) {
        console.log('SOSAlertsHistory: Auth user ID mismatch, skipping real-time listener:', user.uid, 'vs', userId);
        setLoading(false);
        return;
      }
      
      console.log('SOSAlertsHistory: User authenticated successfully:', user.uid);
      console.log('SOSAlertsHistory: Auth state details:');
      console.log('- Current user ID:', user.uid);
      console.log('- Current user email:', user.email);
      console.log('- Current user phone:', user.phoneNumber);
      
      // Wait a bit for authentication to fully settle
      setTimeout(() => {
        setLoading(true);

    // Set up real-time listener for notifications
    const notificationsRef = ref(database, `civilian/civilian account/${userId}/notifications`);
    
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      try {
        console.log('SOSAlertsHistory: Real-time update received');
        
        if (snapshot.exists()) {
          const alerts: SOSAlert[] = [];
          snapshot.forEach((childSnapshot) => {
            const notification = childSnapshot.val();
            console.log('SOSAlertsHistory: Processing notification:', notification.type, 'fromUserId:', notification.data?.fromUserId);
            
            if (notification.type === 'sos_alert') {
              alerts.push({
                id: childSnapshot.key || '',
                ...notification
              });
            }
          });
          
          // Sort by timestamp (newest first)
          const sortedAlerts = alerts.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          console.log('SOSAlertsHistory: Total SOS alerts:', sortedAlerts.length);
          console.log('SOSAlertsHistory: Received alerts (displayed):', sortedAlerts.filter(n => n.data?.fromUserId !== userId).length);
          console.log('SOSAlertsHistory: Sent alerts (hidden):', sortedAlerts.filter(n => n.data?.fromUserId === userId).length);
          
          // Check if this is a new received alert (not initial load)
          const previousReceivedCount = sosAlerts.filter(alert => alert.data?.fromUserId !== userId).length;
          const currentReceivedCount = sortedAlerts.filter(alert => alert.data?.fromUserId !== userId).length;
          
          if (previousReceivedCount > 0 && currentReceivedCount > previousReceivedCount) {
            console.log('SOSAlertsHistory: New received alert detected!');
            setNewAlertReceived(true);
            // Hide the indicator after 3 seconds
            setTimeout(() => setNewAlertReceived(false), 3000);
          }
          
          setSosAlerts(sortedAlerts);
        } else {
          console.log('SOSAlertsHistory: No notifications found');
          setSosAlerts([]);
        }
      } catch (error) {
        console.error('SOSAlertsHistory: Error processing real-time update:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, (error) => {
      // Only log permission errors as warnings, not errors, since the app still works
      if (error.code === 'PERMISSION_DENIED') {
        console.warn('SOSAlertsHistory: Permission denied for real-time listener (this is expected during auth transitions)');
        // Fallback to loading notifications manually
        loadNotificationsManually();
      } else {
        console.error('SOSAlertsHistory: Real-time listener error:', error);
      }
      setLoading(false);
      setRefreshing(false);
    });

    // Cleanup listener on unmount or userId change
    return () => {
      console.log('SOSAlertsHistory: Cleaning up real-time listener');
      off(notificationsRef, 'value', unsubscribe);
    };
      }, 1000); // Wait 1 second for auth to settle
    });
    
    return () => {
      console.log('SOSAlertsHistory: Cleaning up auth listener');
      unsubscribeAuth();
    };
  }, [userId]);

  // Fallback function to load notifications manually when real-time listener fails
  const loadNotificationsManually = async () => {
    try {
      console.log('SOSAlertsHistory: Loading notifications manually as fallback');
      const { NotificationService } = require('../../services/notificationService');
      const notificationService = new NotificationService();
      const notifications = await notificationService.getUserNotifications(userId, 50);
      
      // Filter for SOS alerts only
      const sosAlerts = notifications.filter(notification => 
        notification.type === 'sos_alert'
      );
      
      setSosAlerts(sosAlerts);
      console.log('SOSAlertsHistory: Manually loaded', sosAlerts.length, 'SOS alerts');
    } catch (error) {
      console.warn('SOSAlertsHistory: Failed to load notifications manually:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Real-time listener will automatically update the data
    // Just wait a moment for the listener to process
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const formatFullTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      })
    };
  };

  const handlePress = (alert: SOSAlert) => {
    setSelectedAlert(alert);
    setShowDetailsModal(true);
  };


  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedAlert(null);
    if (onAlertSelected) {
      onAlertSelected(null);
    }
  };

  // Handle selectedAlertId prop changes
  useEffect(() => {
    if (selectedAlertId && sosAlerts.length > 0) {
      const alert = sosAlerts.find(alert => alert.id === selectedAlertId);
      if (alert) {
        setSelectedAlert(alert);
        setShowDetailsModal(true);
      }
    }
  }, [selectedAlertId, sosAlerts]);

  const renderSOSAlert = ({ item }: { item: SOSAlert }) => (
    <TouchableOpacity
      style={[styles.alertItem, { 
        backgroundColor: theme.menuBackground, 
        borderColor: theme.border,
        borderLeftColor: '#FF4444'
      }]}
      onPress={() => handlePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.alertHeader}>
        <View style={styles.alertInfo}>
          <Text style={[styles.alertDateTime, { color: theme.secondaryText, fontSize: fonts.caption }]}>
            {formatFullTimestamp(item.timestamp).date} at {formatFullTimestamp(item.timestamp).time}
          </Text>
        </View>
      </View>
      
      {item.data?.fromUserName && (
        <Text style={[styles.alertBody, { color: theme.text, fontSize: fonts.body }]}>
          {t('emergency.sosTriggeredBy')} <Text style={styles.boldText}>{item.data.fromUserName}</Text>
        </Text>
      )}
      
      {item.data?.location?.address && (
        <Text style={[styles.alertLocation, { color: theme.secondaryText, fontSize: fonts.caption }]}>
          {t('emergency.near')} {item.data.location.address}
        </Text>
      )}
      
      <View style={styles.alertFooter}>
        
        <View style={styles.alertBadges}>
          {item.data?.isTest && (
            <View style={[styles.testBadge, { backgroundColor: '#FFA500' }]}>
              <Text style={[styles.testBadgeText, { color: '#FFFFFF', fontSize: fonts.caption }]}>
                TEST ALERT
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <Text style={[styles.clickHint, { color: theme.secondaryText, fontSize: fonts.caption }]}>
        Tap to view details
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text, fontSize: fonts.body }]}>
          {t('emergency.loadingSosAlerts')}
        </Text>
      </View>
    );
  }


  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* New Alert Indicator */}
        {newAlertReceived && (
          <View style={[styles.newAlertIndicator, { backgroundColor: '#4CAF50' }]}>
            <Text style={[styles.newAlertText, { color: '#FFFFFF', fontSize: fonts.caption }]}>
              {t('emergency.newSosAlertReceived')}
            </Text>
          </View>
        )}
        
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          style={styles.scrollableList}
        >
          {/* Received Alerts Section */}
          {receivedAlerts.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontSize: fonts.subtitle }]}>
                {t('emergency.sosAlerts')}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                {t('emergency.sosAlertsDescription')}
              </Text>
              {receivedAlerts.map((alert) => (
                <View key={alert.id}>
                  {renderSOSAlert({ item: alert })}
                </View>
              ))}
            </View>
          )}

          {/* No Alerts Message */}
          {receivedAlerts.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.text, fontSize: fonts.body }]}>
                🚨 No SOS Alerts Yet
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                SOS alerts from your emergency contacts will appear here when someone triggers an emergency.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeDetailsModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text, fontSize: fonts.subtitle }]}>
                {t('emergency.sosAlertDetails')}
              </Text>
              <TouchableOpacity onPress={closeDetailsModal} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: theme.secondaryText, fontSize: fonts.subtitle }]}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>
            
            {selectedAlert && (
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                    👤 {t('emergency.from')}
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text, fontSize: fonts.body }]}>
                    {selectedAlert.data?.fromUserName || t('emergency.unknown')}
                  </Text>
                </View>

                {selectedAlert.data?.fromUserPhone && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                      📞 {t('emergency.senderPhone')}
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text, fontSize: fonts.body }]}>
                      {selectedAlert.data.fromUserPhone}
                    </Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                    📅 {t('emergency.date')}
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text, fontSize: fonts.body }]}>
                    {formatFullTimestamp(selectedAlert.timestamp).date}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                    🕐 {t('emergency.time')}
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text, fontSize: fonts.body }]}>
                    {formatFullTimestamp(selectedAlert.timestamp).time}
                  </Text>
                </View>

                {selectedAlert.data?.location && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                      📍 {t('emergency.location')}
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text, fontSize: fonts.body }]}>
                      {selectedAlert.data.location.address || t('emergency.locationNotAvailable')}
                    </Text>
                    <Text style={[styles.detailSubValue, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                      {t('emergency.coordinates')}: {selectedAlert.data.location.latitude.toFixed(6)}, {selectedAlert.data.location.longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  newAlertIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  newAlertText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scrollableList: {
    flex: 1,
    minHeight: 400, // Increased minimum height for better visibility
    maxHeight: 600, // Increased maximum height
  },
  listContainer: {
    paddingVertical: 10,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  sectionSubtitle: {
    marginBottom: 12,
    paddingHorizontal: 16,
    opacity: 0.8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
  },
  emptySubtext: {
    textAlign: 'center',
    opacity: 0.5,
    marginTop: 4,
  },
  debugText: {
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  },
  alertItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  alertHeader: {
    marginBottom: 8,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  alertTime: {
    fontStyle: 'italic',
  },
  alertDateTime: {
    fontStyle: 'italic',
  },
  alertBody: {
    marginBottom: 6,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: 'bold',
  },
  alertLocation: {
    marginBottom: 6,
    fontStyle: 'italic',
  },
  alertFrom: {
    marginBottom: 8,
  },
  alertFooter: {
    marginTop: 8,
  },
  alertBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  sentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sentBadgeText: {
    fontWeight: 'bold',
    fontSize: 10,
  },
  receivedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  receivedBadgeText: {
    fontWeight: 'bold',
    fontSize: 10,
  },
  testBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  testBadgeText: {
    fontWeight: 'bold',
    fontSize: 10,
  },
  clickHint: {
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontWeight: '500',
    lineHeight: 22,
  },
  detailSubValue: {
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default SOSAlertsHistory;