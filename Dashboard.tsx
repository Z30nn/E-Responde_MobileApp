import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  Switch,
  Modal,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { auth } from './firebaseConfig';
import { useTheme, colors, fontSizes } from './services/themeContext';
import { useLanguage } from './services/languageContext';
import { FirebaseService } from './services/firebaseService';
import { useAuth } from './services/authContext';
import Geolocation from '@react-native-community/geolocation';
import CrimeReportForm from './CrimeReportForm';
import CrimeReportsList from './CrimeReportsList';
import CrimeReportDetail from './CrimeReportDetail';
import CrimeListFromOthers, { CrimeListFromOthersRef } from './CrimeListFromOthers';
import ChangePassword from './ChangePassword';
import EmergencyContactsList from './components/emergency-contacts-list';
import NotificationSettings from './components/notification-settings';
import SOSAlertsHistory from './components/sos-alerts-history';
import NotificationsList from './components/notifications-list';
import { EmergencyContactsService } from './services/emergencyContactsService';
import { useNotification } from './services/notificationContext';
import { gyroscopeService } from './services/gyroscopeService';
import { sosCleanupService } from './services/sosCleanupService';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
}

const Dashboard = () => {
  console.log('Dashboard: ===== DASHBOARD COMPONENT LOADED =====');
  const [activeTab, setActiveTab] = useState(2);
  console.log('Dashboard: Initial activeTab:', activeTab);
  const [showCrimeReportForm, setShowCrimeReportForm] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedSOSAlertId, setSelectedSOSAlertId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [showSOSInfoModal, setShowSOSInfoModal] = useState(false);
  const [sosStats, setSosStats] = useState({
    total: 0,
    olderThanWeek: 0,
    newerThanWeek: 0
  });
  const [showUserReportsFilterModal, setShowUserReportsFilterModal] = useState(false);
  const [selectedUserReportsStatus, setSelectedUserReportsStatus] = useState<string>('all');
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const crimeListRef = useRef<CrimeListFromOthersRef>(null);
  const { isDarkMode, toggleTheme, fontSize, setFontSize } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { logout, user } = useAuth();
  const { sendNotification, notifications, markAsRead, clearAllNotifications } = useNotification();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];

  // Load SOS alert statistics
  const loadSOSStats = useCallback(async () => {
    try {
      if (user) {
        const stats = await sosCleanupService.getUserSOSStats(user.uid);
        setSosStats(stats);
      }
    } catch (error: any) {
      console.error('Error loading SOS stats:', error);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 4) {
      loadUserProfile();
      loadSOSStats();
    }
  }, [activeTab, loadSOSStats]);

  // Global status change monitor for notifications
  useEffect(() => {
    console.log('Dashboard: ===== STATUS MONITOR USEEFFECT TRIGGERED =====');
    console.log('Dashboard: User object:', user);
    console.log('Dashboard: User UID:', user?.uid);
    
    if (!user) {
      console.log('Dashboard: No user found, skipping status monitor setup');
      return;
    }

    console.log('Dashboard: Setting up global status change monitor for user:', user.uid);
    
    // Track previous report statuses to detect changes
    const previousReportStatuses = new Map<string, string>();
    let statusCheckInterval: NodeJS.Timeout | null = null;
    
    // Import notification service
    const setupStatusMonitor = async () => {
      try {
        console.log('Dashboard: ===== SETTING UP STATUS MONITOR =====');
        const { notificationService } = await import('./services/notificationService');
        console.log('Dashboard: Notification service imported');
        const { database } = await import('./firebaseConfig');
        console.log('Dashboard: Database imported');
        const { ref, onValue, off, get } = await import('firebase/database');
        console.log('Dashboard: Firebase functions imported');
        
        // Function to check for status changes
        const checkForStatusChanges = async () => {
          try {
            const userReportsRef = ref(database, `civilian/civilian account/${user.uid}/crime reports`);
            const snapshot = await get(userReportsRef);
            
            if (snapshot.exists()) {
              const reportsData = snapshot.val();
              
              // Check each report for status changes
              Object.entries(reportsData).forEach(([reportId, reportData]: [string, any]) => {
                const currentStatus = reportData.status;
                const previousStatus = previousReportStatuses.get(reportId);
                
                // Only send notification if status actually changed
                if (previousStatus && previousStatus !== currentStatus) {
                  console.log('Dashboard: Status change detected for report:', reportId, previousStatus, '->', currentStatus);
                  
                  notificationService.sendReportStatusUpdateNotification(
                    reportId,
                    user.uid,
                    previousStatus,
                    currentStatus,
                    reportData.crimeType || 'Crime Report'
                  ).then(success => {
                    console.log('Dashboard: Status change notification sent:', success);
                  }).catch(error => {
                    console.error('Dashboard: Error sending status change notification:', error);
                  });
                }
                
                // Update the previous status
                previousReportStatuses.set(reportId, currentStatus);
              });
            }
          } catch (error) {
            console.error('Dashboard: Error in periodic status check:', error);
          }
        };
        
        // Monitor user's crime reports for status changes (real-time)
        const userReportsRef = ref(database, `civilian/civilian account/${user.uid}/crime reports`);
        
        const handleStatusChange = (snapshot: any) => {
          if (snapshot.exists()) {
            const reportsData = snapshot.val();
            
            // Check each report for status changes
            Object.entries(reportsData).forEach(([reportId, reportData]: [string, any]) => {
              const currentStatus = reportData.status;
              const previousStatus = previousReportStatuses.get(reportId);
              
              // Only send notification if status actually changed
              if (previousStatus && previousStatus !== currentStatus) {
                console.log('Dashboard: Real-time status change detected for report:', reportId, previousStatus, '->', currentStatus);
                
                notificationService.sendReportStatusUpdateNotification(
                  reportId,
                  user.uid,
                  previousStatus,
                  currentStatus,
                  reportData.crimeType || 'Crime Report'
                ).then(success => {
                  console.log('Dashboard: Real-time status change notification sent:', success);
                }).catch(error => {
                  console.error('Dashboard: Error sending real-time status change notification:', error);
                });
              }
              
              // Update the previous status
              previousReportStatuses.set(reportId, currentStatus);
            });
          }
        };
        
        // Set up the real-time listener
        onValue(userReportsRef, handleStatusChange);
        
        // Set up periodic check every 30 seconds
        statusCheckInterval = setInterval(checkForStatusChanges, 30000);
        console.log('Dashboard: Set up periodic status check every 30 seconds');
        
        // Initial check
        console.log('Dashboard: Running initial status check...');
        checkForStatusChanges();
        
        console.log('Dashboard: ===== STATUS MONITOR SETUP COMPLETE =====');
        
        // Return cleanup function
        return () => {
          console.log('Dashboard: Cleaning up global status change monitor');
          off(userReportsRef, 'value', handleStatusChange);
          if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
          }
        };
      } catch (error) {
        console.error('Dashboard: Error setting up status monitor:', error);
      }
    };
    
    const cleanup = setupStatusMonitor();
    console.log('Dashboard: Status monitor setup initiated');
    
    return () => {
      console.log('Dashboard: ===== CLEANING UP STATUS MONITOR =====');
      cleanup.then(cleanupFn => {
        if (cleanupFn) {
          console.log('Dashboard: Running cleanup function');
          cleanupFn();
        } else {
          console.log('Dashboard: No cleanup function returned');
        }
      }).catch(error => {
        console.error('Dashboard: Error in cleanup:', error);
      });
    };
  }, [user]);

  // Clean up old SOS alerts
  const cleanupOldSOSAlerts = async () => {
    if (!user) return;

    Alert.alert(
      t('emergency.cleanOldAlerts'),
      t('emergency.cleanOldAlertsDesc').replace('{count}', sosStats.olderThanWeek.toString()),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('emergency.cleanUp'),
          style: 'destructive',
          onPress: async () => {
            try {
              setCleanupLoading(true);
              const result = await sosCleanupService.cleanupUserSOSAlerts(user.uid);
              
              if (result.deleted > 0) {
                Alert.alert(
                  'Cleanup Complete',
                  `Successfully removed ${result.deleted} old SOS alerts.`
                );
                // Refresh stats
                loadSOSStats();
              } else {
                Alert.alert(t('emergency.noOldAlerts'), t('emergency.noOldAlertsDesc'));
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to clean up old alerts. Please try again.');
            } finally {
              setCleanupLoading(false);
            }
          }
        }
      ]
    );
  };

  const loadUserProfile = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userData = await FirebaseService.getCivilianUser(currentUser.uid);
      if (userData) {
        setUserProfile({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          contactNumber: userData.contactNumber || '',
        });
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    }
  };

  const getInitials = () => {
    if (!userProfile) return '';
    return `${userProfile.firstName[0]}${userProfile.lastName[0]}`.toUpperCase();
  };

  const tabs = [
    { id: 0, name: t('nav.crimeList'), icon: require('./assets/reports.png') },
    { id: 1, name: 'Contacts', icon: require('./assets/contacts.png') },
    { id: 2, name: 'SOS', icon: require('./assets/SOS.png') },
    { id: 3, name: t('nav.reports'), icon: require('./assets/WriteR.png') },
    { id: 4, name: 'Notifications', icon: require('./assets/notif.png') },
    { id: 5, name: t('nav.profile'), icon: require('./assets/Profile.png') },
  ];

  const handleTabPress = (tabId: number) => {
    console.log('Dashboard: Tab pressed, changing from', activeTab, 'to', tabId);
    setActiveTab(tabId);
  };

  // Get unread notifications count
  const getUnreadCount = () => {
    if (!notifications) return 0;
    return notifications.filter(notification => !notification.data?.read).length;
  };

  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [sosCountdownInterval, setSosCountdownInterval] = useState<NodeJS.Timeout | null>(null);

  // Request location permission for SOS alerts
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'E-Responde needs access to your location to send accurate SOS alerts to your emergency contacts.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Location permission error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  };

  const handleSOSPress = useCallback(async () => {

    try {
      // If countdown is active, cancel it
      if (sosCountdown !== null) {
        if (sosCountdownInterval) {
          clearInterval(sosCountdownInterval);
        }
        setSosCountdown(null);
        setSosCountdownInterval(null);
        setSosLoading(false);
        console.log('SOS countdown cancelled');
        return;
      }
      
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Request location permission immediately
      const hasLocationPermission = await requestLocationPermission();
      if (!hasLocationPermission) {
        Alert.alert(
          'Location Permission Required',
          'Location access is needed to send accurate SOS alerts. Please enable location permissions in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Check if user has primary contacts
      const contacts = await EmergencyContactsService.getUserEmergencyContacts(user.uid);
      const primaryContacts = contacts.filter(contact => contact.isPrimary);
      
      if (primaryContacts.length === 0) {
        Alert.alert(
          t('emergency.noPrimaryContacts') || 'No Primary Contacts',
          t('emergency.noPrimaryContactsDesc') || 'You need at least one primary emergency contact to send SOS alerts. Please add emergency contacts first.',
          [{ text: t('common.ok') || 'OK' }]
        );
        return;
      }

      // Start 5-second countdown for user to cancel if needed
      let countdown = 5;
      setSosCountdown(countdown);
      
      const interval = setInterval(() => {
        countdown--;
        setSosCountdown(countdown);
        
        if (countdown <= 0) {
          clearInterval(interval);
          setSosCountdown(null);
          setSosCountdownInterval(null);
          // Send SOS alert after countdown completes
          sendSOSAlert();
        }
      }, 1000);
      
      setSosCountdownInterval(interval);

      const sendSOSAlert = async () => {
        // Show loading state while capturing location and sending alert
        setSosLoading(true);
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            // Fetch user info for report
            const userData = await FirebaseService.getCivilianUser(currentUser.uid);
            const userName = userData
              ? `${userData.firstName} ${userData.lastName}`
              : 'Unknown User';

            // Get current location for SOS report immediately
            let sosLocation = {
              latitude: 0,
              longitude: 0,
              address: 'Location not available',
            };
            
            try {
              // Use the same approach as CrimeReportForm that works
              const locationPromise = new Promise<{latitude: number, longitude: number, address: string}>((resolve, reject) => {
                console.log('SOS Report: Starting location capture...');
                
                Geolocation.getCurrentPosition(
                  async (position: any) => {
                    console.log('SOS Report: Position received:', position);
                    const { latitude, longitude } = position.coords;
                    console.log('SOS Report: Coordinates - Lat:', latitude, 'Lng:', longitude);
                    
                    // Use reverse geocoding to get address (same as working crime reports)
                    let address = 'Location not available';
                    try {
                      console.log('SOS Report: Starting reverse geocoding...');
                      const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                        {
                          headers: {
                            'User-Agent': 'E-Responde-MobileApp/1.0',
                            'Accept': 'application/json',
                          },
                        }
                      );
                      
                      if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                      }
                      
                      const data = await response.json();
                      console.log('SOS Report: Geocoding response:', data);
                      if (data && data.display_name) {
                        address = data.display_name;
                        console.log('SOS Report: Address found:', address);
                      } else {
                        // Fallback to coordinates if no address found
                        address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                        console.log('SOS Report: Using coordinate fallback:', address);
                      }
                    } catch (geocodeError) {
                      console.log('SOS Report: Reverse geocoding failed:', geocodeError);
                      // Fallback to coordinates on error
                      address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                      console.log('SOS Report: Using coordinate fallback after error:', address);
                    }
                    
                    const locationData = {
                      latitude,
                      longitude,
                      address
                    };
                    console.log('SOS Report: Resolving with location data:', locationData);
                    resolve(locationData);
                  },
                  (error: any) => {
                    console.log('SOS Report: Location error:', error);
                    console.log('SOS Report: Error code:', error.code);
                    console.log('SOS Report: Error message:', error.message);
                    reject(error);
                  },
                  {
                    enableHighAccuracy: false, // Same as working crime reports
                    timeout: 10000, // Same as working crime reports
                    maximumAge: 30000 // Same as working crime reports
                  }
                );
              });
              
              // Wait for location with same timeout as crime reports
              console.log('SOS Report: Waiting for location with 10 second timeout...');
              sosLocation = await Promise.race([
                locationPromise,
                new Promise<{latitude: number, longitude: number, address: string}>((_, reject) => 
                  setTimeout(() => {
                    console.log('SOS Report: Location timeout after 10 seconds');
                    reject(new Error('Location timeout'));
                  }, 10000)
                )
              ]);
              
              console.log('SOS Report: Location captured successfully:', sosLocation);
              
              // Debug: Check if location is valid
              if (sosLocation.latitude === 0 && sosLocation.longitude === 0) {
                console.log('SOS Report: WARNING - Location is still 0,0 - this indicates a problem');
              } else {
                console.log('SOS Report: SUCCESS - Valid location captured');
              }
            } catch (error: any) {
              console.log('SOS Report: Could not get location:', error);
              console.log('SOS Report: Location error details:', error.message);
            }

            // Create immediate severity crime report for SOS
            const sosReport = {
              crimeType: 'Emergency SOS',
              dateTime: new Date(),
              description: 'SOS Alert triggered - Immediate assistance required',
              multimedia: [],
              location: sosLocation,
              anonymous: false,
              reporterName: userName,
              reporterUid: currentUser.uid,
              status: 'pending',
              createdAt: new Date().toISOString(),
              severity: 'Immediate' as const,
            };

            try {
              await FirebaseService.submitCrimeReport(sosReport);
              console.log('SOS: Emergency report created with Immediate severity');
            } catch (reportError) {
              console.error('Error creating SOS report:', reportError);
              // Don't block SOS if report creation fails
            }
          }

          // Send SOS alert to emergency contacts (location captured in service)
          const result = await EmergencyContactsService.sendSOSAlert(
            currentUser!.uid,
            ''
          );

          if (result.success) {
            Alert.alert(
              t('emergency.sosSent') || 'SOS Alert Sent',
              `SOS alert has been sent to ${result.sentTo} emergency contact(s) with your current location.`,
              [{ text: t('common.ok') || 'OK' }]
            );
          } else {
            Alert.alert(
              t('common.error') || 'Error',
              t('emergency.sosError') || 'Failed to send SOS alert.',
              [{ text: t('common.ok') || 'OK' }]
            );
          }
        } catch (error: any) {
          console.error('Error in sendSOSAlert:', error);
          Alert.alert(
            t('common.error') || 'Error',
            error.message || t('emergency.sosError') || 'Failed to send SOS alert.',
            [{ text: t('common.ok') || 'OK' }]
          );
        } finally {
          // Always reset UI state after attempt
          setSosLoading(false);
          setSosCountdown(null);
          if (sosCountdownInterval) {
            clearInterval(sosCountdownInterval);
            setSosCountdownInterval(null);
          }
        }
      };

      // SOS alert will be sent after countdown completes
    } catch (error: any) {
      console.error('Error in handleSOSPress:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(t('common.error') || 'Error', errorMessage);
      setSosLoading(false);
      setSosCountdown(null);
      if (sosCountdownInterval) {
        clearInterval(sosCountdownInterval);
        setSosCountdownInterval(null);
      }
    }
  }, [user, t, sosCountdown, sosCountdownInterval]);

  const sendSOSAlert = async () => {
    try {
      const result = await EmergencyContactsService.sendSOSAlert(
        user!.uid,
        ''
      );

      if (result.success) {
        Alert.alert(
          t('emergency.sosSent') || 'SOS Alert Sent',
          t('emergency.sosSentDesc') || `SOS alert sent to ${result.sentTo} emergency contact(s).`,
          [{ text: t('common.ok') || 'OK' }]
        );
      } else {
        // Alert removed - no popup for failed SOS
        console.log('SOS alert failed to send to all contacts');
      }
    } catch (error: any) {
      console.error('Error sending SOS alert:', error);
      // Alert removed - no popup for SOS errors
      console.log('SOS alert error:', error.message);
    } finally {
      setSosLoading(false);
    }
  };

  // Gyroscope SOS functionality
  useEffect(() => {
    const handleGyroscopeSOS = () => {
      console.log('Dashboard: Gyroscope SOS triggered');
      handleSOSPress();
    };

    // Start gyroscope listening when component mounts
    gyroscopeService.startListening(handleGyroscopeSOS);

    // Cleanup on unmount
    return () => {
      gyroscopeService.stopListening();
    };
  }, [handleSOSPress]);

  const styles = StyleSheet.create({
    profileScrollView: {
      flex: 1,
      backgroundColor: theme.background,
    },
    profileContainer: {
      flex: 1,
      padding: 20,
      paddingBottom: 100,
      marginTop: 40,
    },

    avatarContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 16,
    },
    avatarText: {
      color: theme.background,
      fontSize: fonts.title + 14,
      fontWeight: 'bold',
    },
    userName: {
      fontSize: fonts.title,
      fontWeight: 'bold',
      color: theme.primary,
      textAlign: 'center',
      marginBottom: 8,
    },
    userEmail: {
      fontSize: fonts.body,
      color: theme.secondaryText,
      textAlign: 'center',
      marginBottom: 16,
    },
    contactInfoBox: {
      backgroundColor: theme.menuBackground,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 8,
      marginHorizontal: 20,
      marginBottom: 12,
    },
    contactInfoItem: {
      marginBottom: 6,
    },
    contactInfoLabel: {
      color: theme.secondaryText,
      marginBottom: 4,
      fontWeight: '500',
    },
    contactInfoText: {
      color: theme.text,
      fontWeight: '600',
    },

    settingsContainer: {
      backgroundColor: theme.menuBackground,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.secondaryText,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: theme.settingsBackground,
    },
    menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    menuItemText: {
      fontSize: fonts.body,
      color: theme.text,
    },
    chevronRight: {
      fontSize: 20,
      color: theme.secondaryText,
    },
    themeSwitch: {
      transform: [{ scale: 1.2 }],
    },
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    mainContent: {
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: 0,
    },
    contentContainer: {
      alignItems: 'center',
      maxWidth: 400,
      width: '100%',
      paddingBottom: 0,
    },
    contentTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    contentText: {
      fontSize: 16,
      color: theme.secondaryText,
      textAlign: 'center',
      lineHeight: 24,
    },
    bottomNav: {
      flexDirection: 'row',
      backgroundColor: '#2d3480',
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingVertical: 16,
      paddingHorizontal: 2,
      paddingBottom: 24,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 8,
      minHeight: 120,
      alignItems: 'center',
      justifyContent: 'space-around',
      position: 'relative',
    },
    tabButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 12,
      marginHorizontal: 2,
    },
    sosTabButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 12,
      marginHorizontal: 1,
      minWidth: 60,
      flex: 1,
    },
    regularTabButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2,
      paddingHorizontal: 4,
      borderRadius: 12,
      marginHorizontal: 1,
      minWidth: 40,
      flex: 1,
    },
    tabIconContainer: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeTabButton: {
      backgroundColor: 'rgba(74, 144, 226, 0.3)',
      paddingHorizontal: 0,
      marginHorizontal: -2,
    },
    tabIcon: {
      fontSize: 18,
      marginBottom: 3,
      color: isDarkMode ? '#FFFFFF' : theme.background,
    },
    activeTabIcon: {
      transform: [{ scale: 1.1 }],
    },
    tabIconImage: {
      width: 20,
      height: 20,
      marginBottom: 3,
      tintColor: isDarkMode ? '#FFFFFF' : theme.background,
      resizeMode: 'contain',
    },
    notificationIconImage: {
      width: 28,
      height: 28,
      marginBottom: 3,
      tintColor: isDarkMode ? '#FFFFFF' : theme.background,
      resizeMode: 'contain',
    },
    activeTabIconImage: {
      transform: [{ scale: 1.1 }],
    },
    sosIconImage: {
      width: 48,
      height: 48,
      marginBottom: 4,
      resizeMode: 'contain',
      transform: [{ scale: 1.2 }],
    },
    sosFab: {
      position: 'absolute',
      top: -40,
      left: '50%',
      marginLeft: -40,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#2d3480',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    sosFabIcon: {
      width: 64,
      height: 64,
      resizeMode: 'contain',
    },
    tabLabel: {
      fontSize: fonts.caption - 2,
      color: isDarkMode ? '#FFFFFF' : theme.background,
      fontWeight: '500',
      opacity: 0.8,
    },
    activeTabLabel: {
      color: isDarkMode ? '#FFFFFF' : theme.background,
      fontWeight: '600',
      opacity: 1,
    },
    notificationBadge: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: '#FF4444',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    notificationBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    logoutButtonContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      marginTop: 3,
    },
    logoutButton: {
      backgroundColor: '#FF0000',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 12,
      width: '70%',
      alignSelf: 'center',
      minHeight: 56,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    logoutButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
      marginLeft: 8,
    },
    logoutIcon: {
      width: 24,
      height: 24,
      tintColor: '#FFFFFF',
    },
    reportButton: {
      backgroundColor: '#D21414',
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 12,
      marginTop: 40,
      marginBottom: 50,
      width: '80%',
      alignSelf: 'center',
      minHeight: 56,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 10,
    },
    reportButtonText: {
      color: '#FFFFFF',
      fontSize: fonts.subtitle,
      fontWeight: '700',
      textAlign: 'center',
    },
    reportsSection: {
      marginTop: 40,
      marginBottom: 0,
      width: '100%',
      maxWidth: 400,
      flex: 1,
      minHeight: 500,
    },
    reportsSectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    reportsTabContainer: {
      flex: 1,
      width: '100%',
      maxWidth: 400,
      paddingTop: 0,
      paddingBottom: 20,
    },
    crimeListTabContainer: {
      flex: 1,
      width: '100%',
      maxWidth: 400,
      paddingTop: 40,
    },
    crimeListSection: {
      marginTop: 30,
      width: '100%',
      maxWidth: 400,
      flex: 1,
      minHeight: 400,
    },
    crimeListSectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      backgroundColor: theme.menuBackground,
      marginTop: 0,
    },
    sectionHeaderTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    sidebarButton: {
      padding: 8,
      borderRadius: 8,
    },
    sidebarIcon: {
      width: 24,
      height: 24,
      tintColor: theme.text,
    },
    sidebarSpacer: {
      width: 40, // Same width as sidebar button to center title
    },
    notificationHeaderButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    markAllReadButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    markAllReadText: {
      fontSize: 14,
      fontWeight: '500',
    },
    threeDotButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    threeDotText: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    notificationMenu: {
      position: 'absolute',
      top: 60,
      right: 20,
      borderRadius: 8,
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 1000,
      minWidth: 150,
    },
    notificationMenuItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    notificationMenuItemText: {
      fontSize: 16,
      fontWeight: '500',
    },
    // Font Size Modal Styles
    fontSizePreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    fontSizePreviewText: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fontSizeModal: {
      backgroundColor: theme.background,
      borderRadius: 16,
      margin: 20,
      maxWidth: '90%',
      minWidth: '80%',
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
      borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    modalHeaderCentered: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    modalTitle: {
      fontSize: fonts.subtitle,
      fontWeight: '600',
      color: theme.text,
    },
    closeButton: {
      padding: 8,
    },
    closeButtonText: {
      fontSize: fonts.subtitle,
      color: theme.secondaryText,
      fontWeight: '600',
    },
    fontSizeOptions: {
      padding: 20,
    },
    fontSizeOption: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.menuBackground,
      marginBottom: 12,
    },
    fontSizeOptionSelected: {
      backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.3)' : 'rgba(30, 58, 138, 0.1)',
      borderColor: theme.primary,
    },
    fontSizeOptionText: {
      fontSize: fonts.subtitle,
      color: theme.text,
      fontWeight: '600',
      marginBottom: 4,
    },
    fontSizeOptionTextSelected: {
      color: theme.primary,
    },
    fontSizeDescription: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      lineHeight: 18,
    },
    fontSizeDescriptionSelected: {
      color: theme.primary,
      opacity: 0.8,
    },
    // Terms of Service Modal Styles
    termsModal: {
      backgroundColor: theme.background,
      borderRadius: 16,
      margin: 20,
      maxHeight: fontSize === 'large' ? '90%' : fontSize === 'medium' ? '88%' : '85%',
      minWidth: '90%',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    termsContent: {
      padding: fontSize === 'large' ? 24 : fontSize === 'medium' ? 22 : 20,
      flex: 1,
      backgroundColor: theme.background,
    },
    termsSectionTitle: {
      fontSize: fonts.subtitle,
      fontWeight: '600',
      color: theme.primary,
      marginTop: fontSize === 'large' ? 24 : fontSize === 'medium' ? 22 : 20,
      marginBottom: fontSize === 'large' ? 12 : fontSize === 'medium' ? 10 : 8,
    },
    termsText: {
      fontSize: fonts.body,
      color: theme.text,
      lineHeight: fontSize === 'large' ? 28 : fontSize === 'medium' ? 25 : 22,
      marginBottom: fontSize === 'large' ? 20 : fontSize === 'medium' ? 18 : 16,
    },
    termsLastUpdated: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 20,
      marginBottom: 10,
    },
    // Privacy and Policies Modal Styles
    privacyModal: {
      backgroundColor: theme.background,
      borderRadius: 16,
      margin: 20,
      maxHeight: fontSize === 'large' ? '90%' : fontSize === 'medium' ? '88%' : '85%',
      minWidth: '90%',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    privacyContent: {
      padding: fontSize === 'large' ? 24 : fontSize === 'medium' ? 22 : 20,
      flex: 1,
      backgroundColor: theme.background,
    },
    privacySectionTitle: {
      fontSize: fonts.subtitle,
      fontWeight: '600',
      color: theme.primary,
      marginTop: fontSize === 'large' ? 24 : fontSize === 'medium' ? 22 : 20,
      marginBottom: fontSize === 'large' ? 12 : fontSize === 'medium' ? 10 : 8,
    },
    privacyText: {
      fontSize: fonts.body,
      color: theme.text,
      lineHeight: fontSize === 'large' ? 28 : fontSize === 'medium' ? 25 : 22,
      marginBottom: fontSize === 'large' ? 20 : fontSize === 'medium' ? 18 : 16,
    },
    privacyLastUpdated: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 20,
      marginBottom: 10,
    },
    // Language Modal Styles
    languagePreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    languagePreviewText: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      fontWeight: '500',
    },
    languageModal: {
      backgroundColor: theme.background,
      borderRadius: 16,
      margin: 20,
      maxWidth: '90%',
      minWidth: '80%',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    languageOptions: {
      padding: 20,
    },
    languageOption: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.menuBackground,
      marginBottom: 12,
    },
    languageOptionSelected: {
      backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.3)' : 'rgba(30, 58, 138, 0.1)',
      borderColor: theme.primary,
    },
    languageOptionText: {
      fontSize: fonts.subtitle,
      color: theme.text,
      fontWeight: '600',
      marginBottom: 4,
    },
    languageOptionTextSelected: {
      color: theme.primary,
    },
    languageOptionDesc: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      lineHeight: 18,
    },
    languageOptionDescSelected: {
      color: theme.primary,
      opacity: 0.8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },
    loadingText: {
      fontSize: 16,
      color: theme.text,
      marginTop: 16,
    },
    emergencyContactsContainer: {
      flex: 1,
      backgroundColor: theme.background,
    },
    notificationsContainer: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 16,
      paddingTop: 40,
    },
    // Notification Settings Modal Styles
    modalContainer: {
      flex: 1,
    },
    modalHeaderSpacer: {
      width: 60, // Same width as close button to center title
    },
    modalCloseButton: {
      padding: 8,
    },
    modalCloseText: {
      fontSize: 16,
      fontWeight: '500',
    },
    sosButtonContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    sosOuterButton: {
      width: 360,
      height: 360,
      borderRadius: 180,
      backgroundColor: '#FFAAAA',
      position: 'absolute',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    sosButton: {
      width: 320,
      height: 320,
      borderRadius: 160,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FF4444',
      borderWidth: 20,
      borderColor: '#FF6666',
      elevation: 15,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.3,
      shadowRadius: 15,
    },
    sosButtonIcon: {
      fontSize: 70,
      marginBottom: 15,
    },
    sosButtonText: {
      color: '#FFFFFF',
      fontSize: 26,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    sosButtonSubtext: {
      color: '#FFFFFF',
      fontSize: 18,
      opacity: 0.9,
    },
    sosButtonTextContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    sosButtonMainText: {
      color: '#FFFFFF',
      fontSize: fonts.title + 6,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 4,
    },
    sosButtonSubText: {
      color: '#FFFFFF',
      fontSize: fonts.subtitle,
      opacity: 0.8,
      textAlign: 'center',
    },
    sosTitle: {
      fontSize: fonts.title + 6,
      fontWeight: 'bold',
      textAlign: 'center',
      marginTop: 50,
      marginBottom: 30,
    },
    infoButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 1000,
    },
    infoButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    sosInfoContent: {
      flex: 1,
      padding: 20,
    },
    sosInfoSection: {
      marginBottom: 24,
    },
    sosInfoTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    sosInfoText: {
      fontSize: 16,
      lineHeight: 24,
    },
    sosHistoryContainer: {
      marginTop: 20,
      width: '100%',
      maxWidth: 400,
      minHeight: 400,
      flex: 1,
      marginBottom: 10,
      paddingBottom: 0,
    },
    sosHistoryTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
      textAlign: 'center',
    },
    sosHistorySubtitle: {
      fontSize: 14,
      color: theme.secondaryText,
      marginBottom: 16,
      textAlign: 'center',
      opacity: 0.8,
    },
    cleanupMenuItem: {
      backgroundColor: '#FFF5F5',
      borderLeftWidth: 4,
      borderLeftColor: '#FF6B6B',
    },
    cleanupInfo: {
      flex: 1,
      marginRight: 10,
    },
    cleanupSubtext: {
      marginTop: 4,
      opacity: 0.7,
    },
    cleanupButton: {
      fontWeight: 'bold',
      fontSize: 14,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    filterIcon: {
      width: 16,
      height: 16,
      marginRight: 4,
    },
    filterButtonText: {
      color: '#374151',
      fontSize: fonts.caption - 2,
      fontWeight: '600',
    },
    // Filter modal styles (using existing modal styles)
    modalContent: {
      padding: 20,
    },
    filterOption: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 8,
    },
    filterOptionText: {
      fontSize: fonts.body,
      fontWeight: '500',
    },
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <View style={styles.crimeListTabContainer}>
            <View style={[styles.sectionHeader, { backgroundColor: isDarkMode ? 'transparent' : theme.menuBackground, borderBottomColor: theme.border, justifyContent: 'center', alignItems: 'center', position: 'relative' }]}>
              <Text style={[styles.sectionHeaderTitle, { color: theme.text, fontSize: fonts.subtitle, textAlign: 'center' }]}>{t('dashboard.crimeList')}</Text>
              <TouchableOpacity 
                style={[styles.filterButton, { backgroundColor: isDarkMode ? theme.menuBackground : '#FFFFFF', position: 'absolute', right: 0 }]}
                onPress={() => {
                  crimeListRef.current?.openFilterModal();
                }}
              >
                <Image 
                  source={require('./assets/filter.png')} 
                  style={[styles.filterIcon, { tintColor: isDarkMode ? theme.text : '#374151' }]}
                  resizeMode="contain"
                />
                <Text style={[styles.filterButtonText, { color: isDarkMode ? theme.text : '#374151' }]}>Filter</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.contentText}>
              {t('dashboard.crimeListDesc')}
            </Text>
            
            <View style={styles.crimeListSection}>
              <CrimeListFromOthers 
                ref={crimeListRef}
                onViewReport={(reportId) => setSelectedReportId(reportId)} 
              />
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.emergencyContactsContainer}>
            {user ? (
              <EmergencyContactsList userId={user.uid} />
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}
          </View>
        );
      case 2:
        return (
          <View style={styles.contentContainer}>
            <Text style={[styles.sosTitle, { color: isDarkMode ? '#FFFFFF' : theme.primary }]}>SOS</Text>
            <TouchableOpacity
              style={[styles.infoButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowSOSInfoModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.infoButtonText}>i</Text>
            </TouchableOpacity>
            
            {/* SOS Button */}
            {user && (
              <View style={styles.sosButtonContainer}>
                {/* Outer light red button */}
                <View style={styles.sosOuterButton} />
                
                {/* Main SOS Button */}
                <TouchableOpacity
                  style={[styles.sosButton, { backgroundColor: '#FF4444' }]}
                  onPress={handleSOSPress}
                  onLongPress={handleSOSPress}
                  activeOpacity={0.8}
                  disabled={sosLoading}
                >
                  {sosLoading ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  ) : sosCountdown !== null ? (
                    <View style={styles.sosButtonTextContainer}>
                      <Text style={styles.sosButtonMainText}>{sosCountdown}</Text>
                      <Text style={styles.sosButtonSubText}>{t('emergency.tapToCancel')}</Text>
                      <Text style={[styles.sosButtonSubText, { fontSize: fonts.caption - 1, marginTop: 6, opacity: 0.8, lineHeight: fonts.caption + 2 }]}>
                        {t('emergency.sosCountdownMessage')}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.sosButtonTextContainer}>
                      <Text style={styles.sosButtonMainText}>{t('emergency.tapToSendSOS')}</Text>
                      <Text style={styles.sosButtonSubText}>{t('emergency.pressAndHold')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* SOS Alerts History */}
            {user && (
              <View style={styles.sosHistoryContainer}>
                <SOSAlertsHistory 
                  userId={user.uid} 
                  selectedAlertId={selectedSOSAlertId}
                  onAlertSelected={setSelectedSOSAlertId}
                />
              </View>
            )}

          </View>
        );
      case 3:
        console.log('Dashboard: Rendering Reports tab (case 3)');
        return (
          <View style={styles.reportsTabContainer}>
            <View style={styles.reportsSection}>
            <View style={[styles.sectionHeader, { backgroundColor: isDarkMode ? 'transparent' : theme.menuBackground, borderBottomColor: theme.border, justifyContent: 'center', alignItems: 'center', position: 'relative' }]}>
              <Text style={[styles.sectionHeaderTitle, { color: theme.text, fontSize: fonts.subtitle, textAlign: 'center' }]}>{t('dashboard.yourCrimeReports')}</Text>
              <TouchableOpacity 
                style={[styles.filterButton, { backgroundColor: isDarkMode ? theme.menuBackground : '#FFFFFF', position: 'absolute', right: 0 }]}
                onPress={() => setShowUserReportsFilterModal(true)}
              >
                <Image 
                  source={require('./assets/filter.png')} 
                  style={[styles.filterIcon, { tintColor: isDarkMode ? theme.text : '#374151' }]}
                  resizeMode="contain"
                />
                <Text style={[styles.filterButtonText, { color: isDarkMode ? theme.text : '#374151' }]}>Filter</Text>
              </TouchableOpacity>
            </View>
              <CrimeReportsList 
                onViewReport={(reportId) => setSelectedReportId(reportId)} 
                selectedStatus={selectedUserReportsStatus}
              />
            </View>
            
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => setShowCrimeReportForm(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.reportButtonText}>{t('crime.reportCrime')}</Text>
            </TouchableOpacity>
          </View>
        );
      case 4:
        return (
          <View style={styles.notificationsContainer}>
            <View style={[styles.sectionHeader, { backgroundColor: isDarkMode ? 'transparent' : theme.menuBackground, borderBottomColor: theme.border, justifyContent: 'space-between' }]}>
              <Text style={[styles.sectionHeaderTitle, { color: theme.text, fontSize: fonts.subtitle }]}>Notifications</Text>
              <View style={styles.notificationHeaderButtons}>
                <TouchableOpacity
                  style={styles.threeDotButton}
                  onPress={() => {
                    setShowNotificationMenu(!showNotificationMenu);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.threeDotText, { color: theme.text }]}>⋯</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Notification Menu */}
            {showNotificationMenu && (
              <View style={[styles.notificationMenu, { backgroundColor: theme.menuBackground, borderColor: theme.border }]}>
                <TouchableOpacity
                  style={[styles.notificationMenuItem, { borderBottomColor: theme.border }]}
                  onPress={async () => {
                    try {
                      // Mark all notifications as read
                      if (notifications) {
                        const unreadNotifications = notifications.filter(notification => !notification.data?.read);
                        
                        if (unreadNotifications.length === 0) {
                          Alert.alert('Info', 'All notifications are already marked as read');
                          setShowNotificationMenu(false);
                          return;
                        }

                        // Mark all unread notifications as read
                        const promises = unreadNotifications.map(notification => 
                          notification.id ? markAsRead(notification.id) : Promise.resolve()
                        );
                        
                        await Promise.all(promises);
                        
                        console.log(`Marked ${unreadNotifications.length} notifications as read`);
                        Alert.alert('Success', `Marked ${unreadNotifications.length} notifications as read`);
                      }
                    } catch (error) {
                      console.error('Error marking all notifications as read:', error);
                      Alert.alert('Error', 'Failed to mark all notifications as read');
                    }
                    setShowNotificationMenu(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.notificationMenuItemText, { color: theme.text }]}>{t('notifications.markAllRead')}</Text>
                </TouchableOpacity>



                
              </View>
            )}
            
            {user ? (
              <NotificationsList 
                userId={user.uid} 
                onNavigateToScreen={(screen, params) => {
                  console.log('Navigate to screen:', screen, 'with params:', params);
                  // Handle navigation based on screen type
                  switch (screen) {
                    case 'SOS':
                      // Navigate to SOS tab and show specific alert
                      setActiveTab(2); // SOS tab
                      if (params?.alertId) {
                        setSelectedSOSAlertId(params.alertId);
                      }
                      break;
                    case 'CrimeReportDetail':
                      // Navigate to crime report detail
                      if (params?.reportId) {
                        setSelectedReportId(params.reportId);
                      }
                      break;
                    case 'Emergency':
                      // Navigate to emergency tab or specific emergency
                      setActiveTab(2); // SOS tab for emergency
                      break;
                    case 'Settings':
                      // Navigate to settings tab
                      setActiveTab(5); // Profile tab (where settings are)
                      break;
                    case 'Community':
                      // Navigate to community updates
                      setActiveTab(0); // Crime list tab for community updates
                      break;
                    default:
                      console.log('Unknown screen:', screen);
                      break;
                  }
                }}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}
          </View>
        );
      case 5:
        return (
          <ScrollView 
            style={styles.profileScrollView}
            showsVerticalScrollIndicator={true}
            showsHorizontalScrollIndicator={false}
            bounces={true}
            alwaysBounceVertical={false}>
            <View style={styles.profileContainer}>
              {/* Profile Info */}
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{userProfile ? getInitials() : 'JD'}</Text>
              </View>
              <Text style={styles.userName}>
                {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'John Doe'}
              </Text>
              
              {/* Contact Information Box */}
              <View style={[styles.contactInfoBox, { backgroundColor: theme.menuBackground, borderColor: theme.border }]}>
                <View style={styles.contactInfoItem}>
                  <Text style={[styles.contactInfoLabel, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                    {t('profile.email')}
                  </Text>
                  <Text style={[styles.contactInfoText, { color: theme.text, fontSize: fonts.body }]}>
                    {userProfile?.email || 'JohnDoe@gmail.com'}
                  </Text>
                </View>
                
                {userProfile?.contactNumber && (
                  <View style={styles.contactInfoItem}>
                    <Text style={[styles.contactInfoLabel, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                      {t('profile.contactNumber')}
                    </Text>
                    <Text style={[styles.contactInfoText, { color: theme.text, fontSize: fonts.body }]}>
                      {userProfile.contactNumber}
                    </Text>
                  </View>
                )}
              </View>

              {/* Settings Menu */}
              <View style={styles.settingsContainer}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowChangePassword(true)}
                >
                  <Text style={styles.menuItemText}>{t('auth.changePassword')}</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>SETTINGS</Text>

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowNotificationModal(true)}
                >
                  <Text style={styles.menuItemText}>{t('settings.notifications')}</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <View style={styles.menuItem}>
                  <Text style={styles.menuItemText}>{t('settings.darkMode')}</Text>
                  <Switch
                    trackColor={{ false: '#767577', true: '#f8f9ed' }}
                    thumbColor={isDarkMode ? '#f8f9ed' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={toggleTheme}
                    value={isDarkMode}
                    style={styles.themeSwitch}
                  />
                </View>

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowFontSizeModal(true)}
                >
                  <Text style={styles.menuItemText}>{t('settings.fontSize')}</Text>
                  <View style={styles.fontSizePreview}>
                    <Text style={styles.fontSizePreviewText}>
                      {fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}
                    </Text>
                    <Text style={styles.chevronRight}>›</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowLanguageModal(true)}
                >
                  <Text style={styles.menuItemText}>{t('settings.language')}</Text>
                  <View style={styles.languagePreview}>
                    <Text style={styles.languagePreviewText}>
                      {language === 'en' ? 'English' : 'Filipino'}
                    </Text>
                    <Text style={styles.chevronRight}>›</Text>
                  </View>
                </TouchableOpacity>

                {/* SOS Cleanup Option */}
                {sosStats.olderThanWeek > 0 && (
                  <TouchableOpacity 
                    style={[styles.menuItem, styles.cleanupMenuItem]}
                    onPress={cleanupOldSOSAlerts}
                    disabled={cleanupLoading}
                  >
                    <View style={styles.cleanupInfo}>
                      <Text style={styles.menuItemText}>{t('emergency.cleanOldAlerts')}</Text>
                      <Text style={[styles.cleanupSubtext, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                        {t('emergency.alertsOlderThanWeek').replace('{count}', sosStats.olderThanWeek.toString())}
                      </Text>
                    </View>
                    {cleanupLoading ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Text style={[styles.cleanupButton, { color: '#FF6B6B' }]}>{t('emergency.cleanUp')}</Text>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowTermsModal(true)}
                >
                  <Text style={styles.menuItemText}>{t('settings.termsOfService')}</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowPrivacyModal(true)}
                >
                  <Text style={styles.menuItemText}>{t('settings.privacyPolicies')}</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                {/* Logout Button */}
                <TouchableOpacity
                  style={styles.logoutButtonContainer}
                  onPress={logout}
                  activeOpacity={0.7}
                >
                  <View style={styles.logoutButton}>
                    <Image 
                      source={require('./assets/logout.png')} 
                      style={styles.logoutIcon}
                    />
                    <Text style={styles.logoutButtonText}>Logout</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent={true} />
      
      {showCrimeReportForm ? (
        <CrimeReportForm
          onClose={() => setShowCrimeReportForm(false)}
          onSuccess={() => {
            setShowCrimeReportForm(false);
          }}
        />
      ) : selectedReportId ? (
        <CrimeReportDetail
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
        />
      ) : (
        <>
          {/* Main Content Area */}
          <View style={styles.mainContent}>
            {renderTabContent()}
          </View>

          {/* Bottom Navigation Bar */}
          <View style={styles.bottomNav}>
            {tabs.filter(tab => tab.id !== 2).map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.regularTabButton,
                  activeTab === tab.id && styles.activeTabButton,
                ]}
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.7}
              >
                <View style={styles.tabIconContainer}>
                  {typeof tab.icon === 'string' ? (
                    <Text style={[
                      styles.tabIcon,
                      activeTab === tab.id && styles.activeTabIcon,
                    ]}>
                      {tab.icon}
                    </Text>
                  ) : (
                    <Image
                      source={tab.icon}
                      style={[
                        tab.id === 4 ? styles.notificationIconImage : styles.tabIconImage,
                        activeTab === tab.id && styles.activeTabIconImage,
                      ]}
                    />
                  )}
                  {/* Notification badge for notifications tab */}
                  {tab.id === 4 && getUnreadCount() > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {getUnreadCount() > 99 ? '99+' : getUnreadCount()}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            
            {/* Floating SOS Button */}
            <TouchableOpacity
              style={styles.sosFab}
              onPress={() => handleTabPress(2)}
              activeOpacity={1}
            >
              <Image
                source={require('./assets/SOS.png')}
                style={styles.sosFabIcon}
              />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePassword
          onClose={() => setShowChangePassword(false)}
        />
      )}

      {/* User Reports Filter Modal */}
      <Modal
        visible={showUserReportsFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUserReportsFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filter Your Reports</Text>
              <TouchableOpacity onPress={() => setShowUserReportsFilterModal(false)} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: theme.secondaryText }]}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
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
                    selectedUserReportsStatus === option.key && { backgroundColor: theme.primary }
                  ]}
                  onPress={() => {
                    setSelectedUserReportsStatus(option.key);
                    setShowUserReportsFilterModal(false);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: selectedUserReportsStatus === option.key ? '#FFFFFF' : theme.text }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Font Size Modal */}
      <Modal
        visible={showFontSizeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFontSizeModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFontSizeModal(false)}
        >
          <View style={styles.fontSizeModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.fontSize')}</Text>
              <TouchableOpacity 
                onPress={() => setShowFontSizeModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.fontSizeOptions}>
              <TouchableOpacity
                style={[
                  styles.fontSizeOption,
                  fontSize === 'small' && styles.fontSizeOptionSelected
                ]}
                onPress={() => {
                  setFontSize('small');
                  setShowFontSizeModal(false);
                }}
              >
                <Text style={[
                  styles.fontSizeOptionText,
                  fontSize === 'small' && styles.fontSizeOptionTextSelected
                ]}>{t('settings.fontSize.small')}</Text>
                <Text style={[
                  styles.fontSizeDescription,
                  fontSize === 'small' && styles.fontSizeDescriptionSelected
                ]}>{t('settings.fontSize.smallDesc')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.fontSizeOption,
                  fontSize === 'medium' && styles.fontSizeOptionSelected
                ]}
                onPress={() => {
                  setFontSize('medium');
                  setShowFontSizeModal(false);
                }}
              >
                <Text style={[
                  styles.fontSizeOptionText,
                  fontSize === 'medium' && styles.fontSizeOptionTextSelected
                ]}>{t('settings.fontSize.medium')}</Text>
                <Text style={[
                  styles.fontSizeDescription,
                  fontSize === 'medium' && styles.fontSizeDescriptionSelected
                ]}>{t('settings.fontSize.mediumDesc')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.fontSizeOption,
                  fontSize === 'large' && styles.fontSizeOptionSelected
                ]}
                onPress={() => {
                  setFontSize('large');
                  setShowFontSizeModal(false);
                }}
              >
                <Text style={[
                  styles.fontSizeOptionText,
                  fontSize === 'large' && styles.fontSizeOptionTextSelected
                ]}>{t('settings.fontSize.large')}</Text>
                <Text style={[
                  styles.fontSizeDescription,
                  fontSize === 'large' && styles.fontSizeDescriptionSelected
                ]}>{t('settings.fontSize.largeDesc')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        visible={showTermsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTermsModal(false)}
        >
          <TouchableOpacity 
            style={styles.termsModal}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderCentered}>
              <View style={{ width: 40 }} />
              <Text style={styles.modalTitle}>{t('terms.title')}</Text>
              <TouchableOpacity 
                onPress={() => setShowTermsModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.termsContent, { borderRightWidth: 3, borderRightColor: '#2d3480' }]}>
              <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
                showsHorizontalScrollIndicator={false}
                bounces={true}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={false}
                scrollEnabled={true}
            >
              <Text style={styles.termsSectionTitle}>{t('terms.acceptance')}</Text>
              <Text style={styles.termsText}>
                {t('terms.acceptanceDesc')}
              </Text>

              <Text style={styles.termsSectionTitle}>{t('terms.description')}</Text>
              <Text style={styles.termsText}>
                {t('terms.descriptionDesc')}
              </Text>

              <Text style={styles.termsSectionTitle}>{t('terms.responsibilities')}</Text>
              <Text style={styles.termsText}>
                {t('terms.responsibilitiesDesc')}
              </Text>

              <Text style={styles.termsSectionTitle}>{t('terms.privacy')}</Text>
              <Text style={styles.termsText}>
                {t('terms.privacyDesc')}
              </Text>

              <Text style={styles.termsSectionTitle}>{t('terms.emergency')}</Text>
              <Text style={styles.termsText}>
                {t('terms.emergencyDesc')}
              </Text>

              <Text style={styles.termsSectionTitle}>{t('terms.liability')}</Text>
              <Text style={styles.termsText}>
                {t('terms.liabilityDesc')}
              </Text>

              <Text style={styles.termsSectionTitle}>{t('terms.modifications')}</Text>
              <Text style={styles.termsText}>
                {t('terms.modificationsDesc')}
              </Text>

              <Text style={styles.termsSectionTitle}>{t('terms.contact')}</Text>
              <Text style={styles.termsText}>
                {t('terms.contactDesc')}
              </Text>

              <Text style={styles.termsLastUpdated}>
                {t('terms.lastUpdated')} {new Date().toLocaleDateString()}
              </Text>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Privacy and Policies Modal */}
      <Modal
        visible={showPrivacyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPrivacyModal(false)}
        >
          <TouchableOpacity 
            style={styles.privacyModal}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderCentered}>
              <View style={{ width: 40 }} />
              <Text style={styles.modalTitle}>{t('privacy.title')}</Text>
              <TouchableOpacity 
                onPress={() => setShowPrivacyModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.privacyContent, { borderRightWidth: 3, borderRightColor: '#2d3480' }]}>
              <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
                showsHorizontalScrollIndicator={false}
                bounces={true}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={false}
                scrollEnabled={true}
            >
              <Text style={styles.privacySectionTitle}>{t('privacy.informationCollected')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.informationCollectedDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.howWeUse')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.howWeUseDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.informationSharing')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.informationSharingDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.dataSecurity')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.dataSecurityDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.dataRetention')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.dataRetentionDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.yourRights')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.yourRightsDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.locationServices')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.locationServicesDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.childrensPrivacy')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.childrensPrivacyDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.changesToPolicy')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.changesToPolicyDesc')}
              </Text>

              <Text style={styles.privacySectionTitle}>{t('privacy.contactUs')}</Text>
              <Text style={styles.privacyText}>
                {t('privacy.contactUsDesc')}
              </Text>

              <Text style={styles.privacyLastUpdated}>
                {t('privacy.lastUpdated')} {new Date().toLocaleDateString()}
              </Text>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.languageModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.language')}</Text>
              <TouchableOpacity 
                onPress={() => setShowLanguageModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.languageOptions}>
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  language === 'en' && styles.languageOptionSelected
                ]}
                onPress={() => {
                  setLanguage('en');
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[
                  styles.languageOptionText,
                  language === 'en' && styles.languageOptionTextSelected
                ]}>English</Text>
                <Text style={[
                  styles.languageOptionDesc,
                  language === 'en' && styles.languageOptionDescSelected
                ]}>English language</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  language === 'fil' && styles.languageOptionSelected
                ]}
                onPress={() => {
                  setLanguage('fil');
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[
                  styles.languageOptionText,
                  language === 'fil' && styles.languageOptionTextSelected
                ]}>Filipino</Text>
                <Text style={[
                  styles.languageOptionDesc,
                  language === 'fil' && styles.languageOptionDescSelected
                ]}>Wikang Filipino</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal
        visible={showNotificationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.menuBackground }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowNotificationModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: theme.text }]}>
                {t('common.close')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('notifications.settings')}
            </Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          <NotificationSettings />
        </SafeAreaView>
      </Modal>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowProfileModal(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCloseText, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Profile
            </Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          
          <ScrollView 
            style={styles.profileScrollView}
            showsVerticalScrollIndicator={true}
            showsHorizontalScrollIndicator={false}
            bounces={true}
            alwaysBounceVertical={false}>
            <View style={styles.profileContainer}>
              {/* Profile Info */}
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{userProfile ? getInitials() : 'JD'}</Text>
              </View>
              <Text style={styles.userName}>
                {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'John Doe'}
              </Text>
              
              {/* Contact Information Box */}
              <View style={[styles.contactInfoBox, { backgroundColor: theme.menuBackground, borderColor: theme.border }]}>
                <View style={styles.contactInfoItem}>
                  <Text style={[styles.contactInfoLabel, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                    {t('profile.email')}
                  </Text>
                  <Text style={[styles.contactInfoText, { color: theme.text, fontSize: fonts.body }]}>
                    {userProfile?.email || 'JohnDoe@gmail.com'}
                  </Text>
                </View>
                
                {userProfile?.contactNumber && (
                  <View style={styles.contactInfoItem}>
                    <Text style={[styles.contactInfoLabel, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                      {t('profile.contactNumber')}
                    </Text>
                    <Text style={[styles.contactInfoText, { color: theme.text, fontSize: fonts.body }]}>
                      {userProfile.contactNumber}
                    </Text>
                  </View>
                )}
              </View>

              {/* Settings Menu */}
              <View style={styles.settingsContainer}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowChangePassword(true)}
                >
                  <Text style={styles.menuItemText}>{t('auth.changePassword')}</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>SETTINGS</Text>

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowNotificationModal(true)}
                >
                  <Text style={styles.menuItemText}>{t('settings.notifications')}</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <View style={styles.menuItem}>
                  <Text style={styles.menuItemText}>{t('settings.darkMode')}</Text>
                  <Switch
                    trackColor={{ false: '#767577', true: '#f8f9ed' }}
                    thumbColor={isDarkMode ? '#f8f9ed' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={toggleTheme}
                    value={isDarkMode}
                    style={styles.themeSwitch}
                  />
                </View>

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowFontSizeModal(true)}
                >
                  <Text style={styles.menuItemText}>{t('settings.fontSize')}</Text>
                  <View style={styles.fontSizePreview}>
                    <Text style={styles.fontSizePreviewText}>
                      {fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}
                    </Text>
                    <Text style={styles.chevronRight}>›</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowLanguageModal(true)}
                >
                  <Text style={styles.menuItemText}>{t('settings.language')}</Text>
                  <View style={styles.languagePreview}>
                    <Text style={styles.languagePreviewText}>
                      {language === 'en' ? 'English' : 'Filipino'}
                    </Text>
                    <Text style={styles.chevronRight}>›</Text>
                  </View>
                </TouchableOpacity>

                {/* SOS Cleanup Option */}
                {sosStats.olderThanWeek > 0 && (
                  <TouchableOpacity 
                    style={[styles.menuItem, styles.cleanupMenuItem]}
                    onPress={cleanupOldSOSAlerts}
                    disabled={cleanupLoading}
                  >
                    <View style={styles.cleanupInfo}>
                      <Text style={styles.menuItemText}>{t('emergency.cleanOldAlerts')}</Text>
                      <Text style={[styles.cleanupSubtext, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                        {t('emergency.alertsOlderThanWeek').replace('{count}', sosStats.olderThanWeek.toString())}
                      </Text>
                    </View>
                    {cleanupLoading ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Text style={[styles.cleanupButton, { color: '#FF6B6B' }]}>{t('emergency.cleanUp')}</Text>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowTermsModal(true)}
                >
                  <Text style={styles.menuItemText}>{t('settings.termsOfService')}</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowPrivacyModal(true)}
                >
                  <Text style={styles.menuItemText}>{t('settings.privacyPolicies')}</Text>
                  <Text style={styles.chevronRight}>›</Text>
                </TouchableOpacity>

                {/* Logout Button */}
                <TouchableOpacity
                  style={styles.logoutButtonContainer}
                  onPress={logout}
                  activeOpacity={0.7}
                >
                  <View style={styles.logoutButton}>
                    <Image 
                      source={require('./assets/logout.png')} 
                      style={styles.logoutIcon}
                    />
                    <Text style={styles.logoutButtonText}>Logout</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* SOS Info Modal */}
      <Modal
        visible={showSOSInfoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSOSInfoModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.menuBackground }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSOSInfoModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: theme.text }]}>
                ×
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('emergency.sosAlertInfo')}
            </Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          
          <ScrollView 
            style={styles.sosInfoContent} 
            showsVerticalScrollIndicator={true}
            showsHorizontalScrollIndicator={false}
            bounces={true}
            alwaysBounceVertical={false}>
            <View style={styles.sosInfoSection}>
              <Text style={[styles.sosInfoTitle, { color: theme.text }]}>
                {t('emergency.whatIsSosAlert')}
              </Text>
              <Text style={[styles.sosInfoText, { color: theme.secondaryText }]}>
                {t('emergency.whatIsSosAlertDesc')}
              </Text>
            </View>

            <View style={styles.sosInfoSection}>
              <Text style={[styles.sosInfoTitle, { color: theme.text }]}>
                {t('emergency.howToUse')}
              </Text>
              <Text style={[styles.sosInfoText, { color: theme.secondaryText }]}>
                {t('emergency.howToUseDesc')}
              </Text>
            </View>

            <View style={styles.sosInfoSection}>
              <Text style={[styles.sosInfoTitle, { color: theme.text }]}>
                {t('emergency.whenToUse')}
              </Text>
              <Text style={[styles.sosInfoText, { color: theme.secondaryText }]}>
                {t('emergency.whenToUseDesc')}
              </Text>
            </View>

            <View style={styles.sosInfoSection}>
              <Text style={[styles.sosInfoTitle, { color: theme.text }]}>
                {t('emergency.importantNotes')}
              </Text>
              <Text style={[styles.sosInfoText, { color: theme.secondaryText }]}>
                {t('emergency.importantNotesDesc')}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default Dashboard;