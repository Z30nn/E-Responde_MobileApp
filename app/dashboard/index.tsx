import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StatusBar,
  Image,
  Text,
  Modal,
  ScrollView,
  BackHandler,
} from 'react-native';
import { useTheme, colors, fontSizes } from '../../services/themeContext';
import { useLanguage } from '../../services/languageContext';
import { useAuth } from '../../services/authContext';
import { useNotification } from '../../services/notificationContext';
import { gyroscopeService } from '../../services/gyroscopeService';
import { backgroundService } from '../../services/backgroundService';
import CrimeReportForm from '../crime-report/form';
import CrimeReportDetail from '../crime-report/detail';
import ChangePassword from '../change-password';
import TermsOfService from '../terms-of-service';
import PrivacyPolicy from '../privacy-policy';
import { CrimeListFromOthersRef } from '../../CrimeListFromOthers';

// Tab Components
import HomeTab from './tabs/home-tab';
import ContactsTab from './tabs/contacts-tab';
import SOSTab, { SOSTabRef } from './tabs/sos-tab';
import ReportsTab from './tabs/reports-tab';
import NotificationsTab from './tabs/notifications-tab';
import ProfileTab from './tabs/profile-tab';

import { createStyles } from './styles';

interface DashboardProps {
  globalActiveTab?: number;
  onGlobalTabChange?: (tab: number) => void;
  globalSosTabRef?: React.RefObject<SOSTabRef>;
  globalModalState?: {
    showCrimeReportForm: boolean;
    showCrimeReportDetail: boolean;
    selectedReportId: string | null;
    showTermsModal?: boolean;
    showPrivacyModal?: boolean;
    showChangePassword?: boolean;
    showFontSizeModal?: boolean;
    showLanguageModal?: boolean;
    showSOSInfoModal?: boolean;
    showUserReportsFilterModal?: boolean;
  };
  onGlobalModalChange?: (state: {
    showCrimeReportForm: boolean;
    showCrimeReportDetail: boolean;
    selectedReportId: string | null;
    showTermsModal?: boolean;
    showPrivacyModal?: boolean;
    showChangePassword?: boolean;
    showFontSizeModal?: boolean;
    showLanguageModal?: boolean;
    showSOSInfoModal?: boolean;
    showUserReportsFilterModal?: boolean;
  }) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  globalActiveTab, 
  onGlobalTabChange, 
  globalSosTabRef,
  globalModalState,
  onGlobalModalChange
}) => {
  const [activeTab, setActiveTab] = useState(globalActiveTab ?? 2);
  const [showCrimeReportForm, setShowCrimeReportForm] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedSOSAlertId, setSelectedSOSAlertId] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSOSInfoModal, setShowSOSInfoModal] = useState(false);
  const [showUserReportsFilterModal, setShowUserReportsFilterModal] = useState(false);
  const [selectedUserReportsStatus, setSelectedUserReportsStatus] = useState<string>('all');
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  const crimeListRef = useRef<CrimeListFromOthersRef>(null);
  const localSosTabRef = useRef<SOSTabRef>(null);
  const sosTabRef = globalSosTabRef || localSosTabRef;
  const { isDarkMode, fontSize, setFontSize } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const { notifications } = useNotification();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const styles = createStyles(theme, fonts, isDarkMode);


  // Real-time status monitoring for crime report notifications (NON-INTERFERING)
  useEffect(() => {
    if (!user) return;

    console.log('Dashboard: Setting up NON-INTERFERING real-time status monitoring for user:', user.uid);
    console.log('Dashboard: Real-time monitoring is ACTIVE and listening for changes...');
    console.log('Dashboard: This monitoring will NOT interfere with SOS functionality');
    
    // Track previous report statuses to detect changes
    const previousReportStatuses = new Map<string, string>();
    
    const setupStatusMonitor = async () => {
      try {
        // Import notification service
        const { notificationService } = await import('../../services/notificationService');
        
        // Set up real-time listener for user's crime reports AND main collection
        const { ref, onValue, off, get } = await import('firebase/database');
        const { database } = await import('../../firebaseConfig');
        
        const userReportsRef = ref(database, `civilian/civilian account/${user.uid}/crime reports`);
        const mainReportsRef = ref(database, `civilian/civilian crime reports`);
        
        // First, check for any existing resolved reports that might need notifications
        try {
          const snapshot = await get(userReportsRef);
          if (snapshot.exists()) {
            const reportsData = snapshot.val();
            console.log('Dashboard: Checking existing reports for resolved status...');
            console.log('Dashboard: Found reports:', Object.keys(reportsData).length);
            
            for (const [reportId, reportData] of Object.entries(reportsData)) {
              const currentStatus = (reportData as any).status;
              console.log('Dashboard: Report', reportId, 'Status:', currentStatus);
              
              // If report is resolved, check if we need to send a notification
              if (currentStatus && currentStatus.toLowerCase() === 'resolved') {
                console.log('Dashboard: Found resolved report:', reportId, 'Status:', currentStatus);
                
                // Check if notification already exists for this resolved report
                const existingNotifications = await notificationService.getUserNotifications(user.uid);
                const hasResolvedNotification = existingNotifications.some(notification => 
                  notification.type === 'crime_report_solved' && 
                  notification.data?.reportId === reportId
                );
                
                if (!hasResolvedNotification) {
                  console.log('Dashboard: Sending missing resolved notification for report:', reportId);
                  
                  // Send the missing notification
                  const success = await notificationService.sendReportStatusUpdateNotification(
                    reportId,
                    user.uid,
                    'pending', // Assume it was pending before
                    'resolved',
                    (reportData as any).crimeType || 'Crime Report'
                  );
                  
                  console.log('Dashboard: Notification sent successfully:', success);
                } else {
                  console.log('Dashboard: Resolved notification already exists for report:', reportId);
                }
              }
            }
          } else {
            console.log('Dashboard: No reports found for user');
          }
        } catch (error) {
          console.error('Dashboard: Error checking existing resolved reports:', error);
        }
        
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
                ).catch(error => {
                  console.error('Dashboard: Error sending real-time status change notification:', error);
                });
              }
              
              // Update the previous status
              previousReportStatuses.set(reportId, currentStatus);
            });
          }
        };
        
        // Set up the real-time listener for user's reports
        onValue(userReportsRef, handleStatusChange);
        
        // Also listen to main collection for any changes that might affect user's reports
        const handleMainCollectionChange = async (snapshot: any) => {
          if (snapshot.exists()) {
            const mainReportsData = snapshot.val();
            console.log('Dashboard: Main collection change detected');
            
            // Check if any of the user's reports have been updated in main collection
            const userSnapshot = await get(userReportsRef);
            if (userSnapshot.exists()) {
              const userReportsData = userSnapshot.val();
              
              for (const [reportId, mainReportData] of Object.entries(mainReportsData)) {
                if (userReportsData[reportId]) {
                  const mainStatus = (mainReportData as any)?.status;
                  const userStatus = userReportsData[reportId]?.status;
                  
                  // Only update if mainStatus exists and is different from userStatus
                  if (mainStatus && mainStatus !== userStatus) {
                    console.log('Dashboard: Status mismatch detected in main collection:', reportId, 'Main:', mainStatus, 'User:', userStatus);
                    
                    // Update user's collection to match main collection
                    const { update } = await import('firebase/database');
                    const userReportRef = ref(database, `civilian/civilian account/${user.uid}/crime reports/${reportId}`);
                    await update(userReportRef, {
                      status: mainStatus,
                      statusUpdatedAt: new Date().toISOString(),
                      statusUpdatedBy: 'system_sync'
                    });
                    
                    // Send notification for the status change
                    if (mainStatus.toLowerCase() === 'resolved') {
                      console.log('Dashboard: Sending resolved notification for report:', reportId);
                      notificationService.sendReportStatusUpdateNotification(
                        reportId,
                        user.uid,
                        userStatus || 'pending',
                        mainStatus,
                        (mainReportData as any)?.crimeType || 'Crime Report'
                      ).then(success => {
                        console.log('Dashboard: Resolved notification sent:', success);
                      }).catch(error => {
                        console.error('Dashboard: Error sending resolved notification:', error);
                      });
                    }
                  }
                }
              }
            }
          }
        };
        
        // Set up listener for main collection
        onValue(mainReportsRef, handleMainCollectionChange);
        
        console.log('Dashboard: Real-time status monitoring set up successfully for both collections');
        
        // Add periodic check every 2 minutes as backup (NON-INTERFERING)
        const periodicCheck = setInterval(async () => {
          try {
            console.log('Dashboard: Running NON-INTERFERING periodic status check...');
            console.log('Dashboard: This check will NOT interfere with SOS functionality');
            const userSnapshot = await get(userReportsRef);
            const mainSnapshot = await get(mainReportsRef);
            
            if (userSnapshot.exists() && mainSnapshot.exists()) {
              const userReportsData = userSnapshot.val();
              const mainReportsData = mainSnapshot.val();
              
              for (const [reportId, userReportData] of Object.entries(userReportsData)) {
                if (mainReportsData[reportId]) {
                  const mainReportData = mainReportsData[reportId];
                  const mainStatus = (mainReportData as any)?.status;
                  const userStatus = (userReportData as any)?.status;
                  
                  // Only update if mainStatus exists and is different from userStatus
                  if (mainStatus && mainStatus !== userStatus) {
                    console.log('Dashboard: Periodic check found mismatch:', reportId, 'Main:', mainStatus, 'User:', userStatus);
                    
                    // Update user's collection
                    const { update } = await import('firebase/database');
                    const userReportRef = ref(database, `civilian/civilian account/${user.uid}/crime reports/${reportId}`);
                    await update(userReportRef, {
                      status: mainStatus,
                      statusUpdatedAt: new Date().toISOString(),
                      statusUpdatedBy: 'periodic_sync'
                    });
                    
                    // Send notification if resolved
                    if (mainStatus.toLowerCase() === 'resolved') {
                      console.log('Dashboard: Periodic check sending resolved notification for report:', reportId);
                      notificationService.sendReportStatusUpdateNotification(
                        reportId,
                        user.uid,
                        userStatus || 'pending',
                        mainStatus,
                        (mainReportData as any)?.crimeType || 'Crime Report'
                      ).then(success => {
                        console.log('Dashboard: Periodic resolved notification sent:', success);
                      }).catch(error => {
                        console.error('Dashboard: Error sending periodic resolved notification:', error);
                      });
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('Dashboard: Error in periodic check:', error);
          }
        }, 120000); // Check every 2 minutes (NON-INTERFERING)
        
        // Return cleanup function
        return () => {
          off(userReportsRef, 'value', handleStatusChange);
          off(mainReportsRef, 'value', handleMainCollectionChange);
          clearInterval(periodicCheck);
          console.log('Dashboard: Real-time status monitoring cleaned up');
        };
      } catch (error) {
        console.error('Dashboard: Error setting up status monitoring:', error);
        // Return a no-op cleanup function if there's an error
        return () => {};
      }
    };
    
    let cleanup: (() => void) | null = null;
    
    setupStatusMonitor().then((cleanupFn) => {
      cleanup = cleanupFn;
    });
    
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [user]);

  // Note: Gyroscope functionality is handled globally in App.tsx
  // Ensure gyroscope is working properly
  useEffect(() => {
    if (user && user.uid) {
      console.log('Dashboard: Checking gyroscope service status...');
      console.log('Dashboard: Gyroscope available:', gyroscopeService.isGyroscopeAvailable());
      console.log('Dashboard: Gyroscope enabled:', gyroscopeService.isGyroscopeEnabled());
      console.log('Dashboard: Gyroscope sensor status:', gyroscopeService.getSensorStatus());
    }
  }, [user]);


  // Sync global active tab with local state
  useEffect(() => {
    if (globalActiveTab !== undefined && globalActiveTab !== activeTab) {
      setActiveTab(globalActiveTab);
    }
  }, [globalActiveTab, activeTab]);

  // Sync global modal state with local state
  useEffect(() => {
    if (globalModalState) {
      setShowCrimeReportForm(globalModalState.showCrimeReportForm);
      
      // Only sync selectedReportId if it's not null (to prevent overriding local close attempts)
      if (globalModalState.selectedReportId !== null) {
        console.log('Dashboard: Syncing selectedReportId from global state:', globalModalState.selectedReportId);
        setSelectedReportId(globalModalState.selectedReportId);
      }
      
      if (globalModalState.showTermsModal !== undefined) {
        setShowTermsModal(globalModalState.showTermsModal);
      }
      if (globalModalState.showPrivacyModal !== undefined) {
        setShowPrivacyModal(globalModalState.showPrivacyModal);
      }
      if (globalModalState.showChangePassword !== undefined) {
        setShowChangePassword(globalModalState.showChangePassword);
      }
      if (globalModalState.showFontSizeModal !== undefined) {
        setShowFontSizeModal(globalModalState.showFontSizeModal);
      }
      if (globalModalState.showLanguageModal !== undefined) {
        setShowLanguageModal(globalModalState.showLanguageModal);
      }
      if (globalModalState.showSOSInfoModal !== undefined) {
        setShowSOSInfoModal(globalModalState.showSOSInfoModal);
      }
      if (globalModalState.showUserReportsFilterModal !== undefined) {
        setShowUserReportsFilterModal(globalModalState.showUserReportsFilterModal);
      }
    }
  }, [globalModalState]);

  // Background service initialization
  useEffect(() => {
    if (!user) return;

    try {
      console.log('Dashboard: Starting background service');
      backgroundService.start();
    } catch (error) {
      console.error('Dashboard: Error starting background service:', error);
    }

    return () => {
      try {
        console.log('Dashboard: Stopping background service');
        backgroundService.stop();
      } catch (error) {
        console.error('Dashboard: Error stopping background service:', error);
      }
    };
  }, [user]);

  const tabs = [
    { id: 0, name: t('nav.crimeList'), icon: require('../../assets/reports.png') },
    { id: 1, name: 'Contacts', icon: require('../../assets/contacts.png') },
    { id: 2, name: 'SOS', icon: require('../../assets/SOS.png') },
    { id: 3, name: t('nav.reports'), icon: require('../../assets/WriteR.png') },
    { id: 4, name: 'Notifications', icon: require('../../assets/notif.png') },
    { id: 5, name: t('nav.profile'), icon: require('../../assets/Profile.png') },
  ];

  const handleTabPress = (tabId: number) => {
    setActiveTab(tabId);
    if (onGlobalTabChange) {
      onGlobalTabChange(tabId);
    }
  };

  const handleModalChange = useCallback((modalState: { 
    showCrimeReportForm?: boolean; 
    selectedReportId?: string | null;
    showTermsModal?: boolean;
    showPrivacyModal?: boolean;
    showChangePassword?: boolean;
    showFontSizeModal?: boolean;
    showLanguageModal?: boolean;
    showSOSInfoModal?: boolean;
    showUserReportsFilterModal?: boolean;
  }) => {
    console.log('Dashboard: handleModalChange called with:', modalState);
    if (modalState.showCrimeReportForm !== undefined) {
      setShowCrimeReportForm(modalState.showCrimeReportForm);
    }
    if (modalState.selectedReportId !== undefined) {
      console.log('Dashboard: Setting selectedReportId to:', modalState.selectedReportId);
      console.log('Dashboard: Previous selectedReportId was:', selectedReportId);
      setSelectedReportId(modalState.selectedReportId);
      console.log('Dashboard: selectedReportId state updated');
    }
    if (modalState.showTermsModal !== undefined) {
      setShowTermsModal(modalState.showTermsModal);
    }
    if (modalState.showPrivacyModal !== undefined) {
      setShowPrivacyModal(modalState.showPrivacyModal);
    }
    if (modalState.showChangePassword !== undefined) {
      setShowChangePassword(modalState.showChangePassword);
    }
    if (modalState.showFontSizeModal !== undefined) {
      setShowFontSizeModal(modalState.showFontSizeModal);
    }
    if (modalState.showLanguageModal !== undefined) {
      setShowLanguageModal(modalState.showLanguageModal);
    }
    if (modalState.showSOSInfoModal !== undefined) {
      setShowSOSInfoModal(modalState.showSOSInfoModal);
    }
    if (modalState.showUserReportsFilterModal !== undefined) {
      setShowUserReportsFilterModal(modalState.showUserReportsFilterModal);
    }
    
    // Update global modal state
    if (onGlobalModalChange) {
      console.log('Dashboard: Updating global modal state with:', {
        showCrimeReportForm: modalState.showCrimeReportForm ?? showCrimeReportForm,
        showCrimeReportDetail: modalState.selectedReportId !== null,
        selectedReportId: modalState.selectedReportId ?? selectedReportId,
      });
      
      onGlobalModalChange({
        showCrimeReportForm: modalState.showCrimeReportForm ?? showCrimeReportForm,
        showCrimeReportDetail: modalState.selectedReportId !== null,
        selectedReportId: modalState.selectedReportId ?? selectedReportId,
        showTermsModal: modalState.showTermsModal ?? showTermsModal,
        showPrivacyModal: modalState.showPrivacyModal ?? showPrivacyModal,
        showChangePassword: modalState.showChangePassword ?? showChangePassword,
        showFontSizeModal: modalState.showFontSizeModal ?? showFontSizeModal,
        showLanguageModal: modalState.showLanguageModal ?? showLanguageModal,
        showSOSInfoModal: modalState.showSOSInfoModal ?? showSOSInfoModal,
        showUserReportsFilterModal: modalState.showUserReportsFilterModal ?? showUserReportsFilterModal,
      });
    }
  }, [
    selectedReportId,
    showCrimeReportForm,
    showTermsModal,
    showPrivacyModal,
    showChangePassword,
    showFontSizeModal,
    showLanguageModal,
    showSOSInfoModal,
    showUserReportsFilterModal,
    onGlobalModalChange,
  ]);

  // Back button handler to close modals (must be after handleModalChange)
  // Note: CrimeReportDetail handles its own back button, so we don't check selectedReportId here
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Close modals in order of priority (most recent/important first)
      if (showCrimeReportForm) {
        handleModalChange({ showCrimeReportForm: false });
        return true;
      }
      
      // CrimeReportDetail handles its own back button via its own BackHandler
      // If selectedReportId is set, CrimeReportDetail's handler will run first
      
      if (showUserReportsFilterModal) {
        handleModalChange({ showUserReportsFilterModal: false });
        return true;
      }
      
      if (showSOSInfoModal) {
        handleModalChange({ showSOSInfoModal: false });
        return true;
      }
      
      if (showLanguageModal) {
        handleModalChange({ showLanguageModal: false });
        return true;
      }
      
      if (showFontSizeModal) {
        handleModalChange({ showFontSizeModal: false });
        return true;
      }
      
      if (showChangePassword) {
        handleModalChange({ showChangePassword: false });
        return true;
      }
      
      if (showPrivacyModal) {
        handleModalChange({ showPrivacyModal: false });
        return true;
      }
      
      if (showTermsModal) {
        handleModalChange({ showTermsModal: false });
        return true;
      }
      
      // No modals open, allow default behavior (exit confirmation at App level)
      return false;
    });

    return () => backHandler.remove();
  }, [
    showCrimeReportForm,
    showUserReportsFilterModal,
    showSOSInfoModal,
    showLanguageModal,
    showFontSizeModal,
    showChangePassword,
    showPrivacyModal,
    showTermsModal,
    handleModalChange,
  ]);

  const getUnreadCount = () => {
    if (!notifications) return 0;
    return notifications.filter(notification => !notification.data?.read).length;
  };


  const handleNavigateToScreen = (screen: string, params?: any) => {
    console.log('Dashboard: handleNavigateToScreen called with:', screen, params);
    console.log('Dashboard: Current selectedReportId:', selectedReportId);
    
    switch (screen) {
      case 'SOS':
        console.log('Dashboard: Navigating to SOS tab with alertId:', params?.alertId);
        setActiveTab(2);
        if (params?.alertId) {
          console.log('Dashboard: Setting selectedSOSAlertId to:', params.alertId);
          setSelectedSOSAlertId(params.alertId);
          // If showDetails is true, we'll let the SOS tab handle showing the modal immediately
          if (params?.showDetails) {
            console.log('Dashboard: showDetails flag is true, SOS tab should show modal immediately');
          }
        }
        break;
      case 'CrimeReportDetail':
        if (params?.reportId) {
          console.log('Dashboard: Setting selectedReportId to:', params.reportId);
          setSelectedReportId(params.reportId);
        }
        break;
      case 'Emergency':
        setActiveTab(2);
        break;
      case 'Settings':
        setActiveTab(5);
        break;
      case 'Community':
        setActiveTab(0);
        break;
      default:
        console.log('Unknown screen:', screen);
        break;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <HomeTab
            onViewReport={setSelectedReportId}
            crimeListRef={crimeListRef}
          />
        );
      case 1:
        return <ContactsTab userId={user?.uid || null} />;
      case 2:
        return (
          <SOSTab
            ref={sosTabRef}
            userId={user?.uid || ''}
            selectedAlertId={selectedSOSAlertId}
            onAlertSelected={setSelectedSOSAlertId}
            onShowInfo={() => handleModalChange({ showSOSInfoModal: true })}
          />
        );
      case 3:
        return (
          <ReportsTab
            onViewReport={(reportId) => handleModalChange({ selectedReportId: reportId })}
            onCreateReport={() => handleModalChange({ showCrimeReportForm: true })}
            selectedStatus={selectedUserReportsStatus}
            onFilterPress={() => handleModalChange({ showUserReportsFilterModal: true })}
          />
        );
      case 4:
        return (
          <NotificationsTab
            userId={user?.uid || null}
            showNotificationMenu={showNotificationMenu}
            onToggleMenu={() => setShowNotificationMenu(!showNotificationMenu)}
            onNavigateToScreen={handleNavigateToScreen}
          />
        );
      case 5:
        return (
          <ProfileTab
            onChangePassword={() => handleModalChange({ showChangePassword: true })}
            onFontSizeSettings={() => handleModalChange({ showFontSizeModal: true })}
            onLanguageSettings={() => handleModalChange({ showLanguageModal: true })}
            onTermsOfService={() => handleModalChange({ showTermsModal: true })}
            onPrivacyPolicy={() => handleModalChange({ showPrivacyModal: true })}
          />
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
          onClose={() => handleModalChange({ showCrimeReportForm: false })}
          onSuccess={() => handleModalChange({ showCrimeReportForm: false })}
        />
      ) : selectedReportId ? (
        <CrimeReportDetail
          reportId={selectedReportId}
          onClose={() => {
            console.log('Dashboard: CrimeReportDetail onClose called');
            console.log('Dashboard: Current selectedReportId:', selectedReportId);
            console.log('Dashboard: Current globalModalState:', globalModalState);
            
            // Force close the modal immediately
            console.log('Dashboard: Force closing modal - setting selectedReportId to null');
            setSelectedReportId(null);
            
            // Also update global state to ensure consistency
            if (onGlobalModalChange) {
              console.log('Dashboard: Updating global state to close modal');
              onGlobalModalChange({
                showCrimeReportForm: false,
                showCrimeReportDetail: false,
                selectedReportId: null,
                showTermsModal: false,
                showPrivacyModal: false,
                showChangePassword: false,
                showFontSizeModal: false,
                showLanguageModal: false,
                showSOSInfoModal: false,
                showUserReportsFilterModal: false,
              });
            }
            
            console.log('Dashboard: Modal should now be closed');
            
            // Force close with timeout as backup
            setTimeout(() => {
              console.log('Dashboard: Force close timeout - ensuring modal is closed');
              setSelectedReportId(null);
            }, 100);
          }}
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
                  <Image
                    source={tab.icon}
                    style={[
                      tab.id === 4 ? styles.notificationIconImage : styles.tabIconImage,
                      activeTab === tab.id && styles.activeTabIconImage,
                    ]}
                  />
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

            {/* Center SOS FAB */}
            <TouchableOpacity
              style={[
                styles.sosFab,
                activeTab === 2 && styles.sosFabActive,
              ]}
              onPress={() => handleTabPress(2)}
              activeOpacity={0.8}
            >
              <Image
                source={require('../../assets/SOS.png')}
                style={styles.sosFabIcon}
              />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Modals */}
      {showChangePassword && (
        <ChangePassword onClose={() => handleModalChange({ showChangePassword: false })} />
      )}

      {showTermsModal && (
        <TermsOfService onClose={() => handleModalChange({ showTermsModal: false })} />
      )}

      {showPrivacyModal && (
        <PrivacyPolicy onClose={() => handleModalChange({ showPrivacyModal: false })} />
      )}

      {/* Font Size Modal */}
      {showFontSizeModal && (
        <Modal
          visible={showFontSizeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFontSizeModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
                  onPress={() => handleModalChange({ showFontSizeModal: false })}
          >
            <View style={styles.fontSizeModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('settings.fontSize')}</Text>
                <TouchableOpacity 
                  onPress={() => handleModalChange({ showFontSizeModal: false })}
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
      )}

      {/* Language Modal */}
      {showLanguageModal && (
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
                  onPress={() => handleModalChange({ showLanguageModal: false })}
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
      )}

      {/* SOS Information Modal */}
      {showSOSInfoModal && (
        <Modal
          visible={showSOSInfoModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowSOSInfoModal(false)}
        >
          <View style={styles.sosInfoModalOverlay}>
            <View style={styles.sosInfoModalCard}>
          <View style={styles.sosInfoContainer}>
            {/* Header */}
            <View style={styles.sosInfoHeader}>
              <Text style={styles.sosInfoHeaderTitle}>{t('emergency.whatIsSosAlert')}</Text>
            </View>

            {/* Content */}
            <ScrollView 
              style={styles.sosInfoScrollView}
              contentContainerStyle={styles.sosInfoContentContainer}
              showsVerticalScrollIndicator={true}
            >
                <View style={styles.sosInfoSection}>
                  <Text style={styles.sosInfoSectionTitle}>{t('emergency.whatIsSosAlert')}</Text>
                  <Text style={styles.sosInfoSectionText}>
                    {t('emergency.whatIsSosAlertDesc')}
                  </Text>
                </View>

                <View style={styles.sosInfoSection}>
                  <Text style={styles.sosInfoSectionTitle}>{t('emergency.howToUse')}</Text>
                  <Text style={styles.sosInfoSectionText}>
                    {t('emergency.howToUseDesc')}
                  </Text>
                  <View style={styles.sosMethodContainer}>
                    <View style={styles.sosMethodItem}>
                      <Text style={styles.sosMethodTitle}>{t('emergency.tapSOSButton')}</Text>
                      <Text style={styles.sosMethodDesc}>{t('emergency.tapSOSButtonDesc')}</Text>
                      <Image 
                        source={require('../../assets/tapsos.png')}
                        style={styles.sosInfoImage}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.sosMethodItem}>
                      <Text style={styles.sosMethodTitle}>{t('emergency.tripleShakeFeature')}</Text>
                      <Text style={styles.sosMethodDesc}>{t('emergency.tripleShakeFeatureDesc')}</Text>
                      <Image 
                        source={require('../../assets/shakesos.png')}
                        style={styles.sosInfoImage}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.sosMethodItem}>
                      <Text style={styles.sosMethodTitle}>{t('emergency.longPressFeature')}</Text>
                      <Text style={styles.sosMethodDesc}>{t('emergency.longPressFeatureDesc')}</Text>
                      <Image 
                        source={require('../../assets/holdsos.png')}
                        style={styles.sosInfoImage}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.sosInfoSection}>
                  <Text style={styles.sosInfoSectionTitle}>{t('emergency.whenToUse')}</Text>
                  <Text style={styles.sosInfoSectionText}>
                    {t('emergency.whenToUseDesc')}
                  </Text>
                </View>

                <View style={styles.sosInfoSection}>
                  <Text style={styles.sosInfoSectionTitle}>{t('emergency.importantNotes')}</Text>
                  <Text style={styles.sosInfoSectionText}>
                    {t('emergency.importantNotesDesc')}
                  </Text>
                </View>

            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.sosInfoActionButtons}>
              <TouchableOpacity 
                style={styles.sosInfoPrimaryButton}
                onPress={() => handleModalChange({ showSOSInfoModal: false })}
              >
                <Text style={styles.sosInfoPrimaryButtonText}>Got It</Text>
              </TouchableOpacity>
            </View>
          </View>
            </View>
          </View>
        </Modal>
      )}

      {/* User Reports Filter Modal */}
      {showUserReportsFilterModal && (
        <Modal
          visible={showUserReportsFilterModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => handleModalChange({ showUserReportsFilterModal: false })}
        >
          <View style={styles.userReportsFilterModalOverlay}>
            <View style={[styles.userReportsFilterModalContainer, { backgroundColor: theme.background }]}>
              <View style={[styles.userReportsFilterModalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.userReportsFilterModalTitle, { color: theme.text }]}>Filter Your Reports</Text>
                <TouchableOpacity 
                  onPress={() => handleModalChange({ showUserReportsFilterModal: false })} 
                  style={styles.userReportsFilterCloseButton}
                >
                  <Text style={[styles.userReportsFilterCloseButtonText, { color: theme.secondaryText }]}>×</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.userReportsFilterOptions}>
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
                      styles.userReportsFilterOption,
                      { borderBottomColor: theme.border },
                      selectedUserReportsStatus === option.key && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      setSelectedUserReportsStatus(option.key);
                      handleModalChange({ showUserReportsFilterModal: false });
                    }}
                  >
                    <Text style={[
                      styles.userReportsFilterOptionText,
                      { color: theme.text },
                      selectedUserReportsStatus === option.key && { color: 'white' }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default Dashboard;

