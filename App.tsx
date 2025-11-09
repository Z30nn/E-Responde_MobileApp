import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Animated, Image, StatusBar, Alert, Modal, BackHandler, ToastAndroid, Platform } from 'react-native';
import { ThemeProvider, useTheme } from './services/themeContext';
import { LanguageProvider, useLanguage } from './services/languageContext';
import { AuthProvider, useAuth } from './services/authContext';
import { NotificationProvider } from './services/notificationContext';
import { VoIPProvider, useVoIP } from './services/voipContext';
import { backgroundService } from './services/backgroundService';
import { gyroscopeService } from './services/gyroscopeService';
import { fcmService } from './services/fcmService';
import messaging from '@react-native-firebase/messaging';
import IncomingCallModal from './components/incoming-call-modal';
import VoiceCallScreen from './components/voice-call-screen';
import Welcome from './Welcome';
import Dashboard from './app/dashboard';
import ErrorBoundary from './components/error-boundary';

// Set up FCM background message handler at app level
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('FCM: 🔔 BACKGROUND MESSAGE RECEIVED:', remoteMessage);
  console.log('FCM: Message ID:', remoteMessage.messageId);
  console.log('FCM: From:', remoteMessage.from);
  console.log('FCM: Data:', remoteMessage.data);
  console.log('FCM: Notification:', remoteMessage.notification);
  
  // For background messages, the system should show the notification automatically
  if (remoteMessage.notification) {
    console.log('FCM: ✅ Background notification received:', remoteMessage.notification);
    console.log('FCM: Title:', remoteMessage.notification.title);
    console.log('FCM: Body:', remoteMessage.notification.body);
    console.log('FCM: System will display notification automatically');
  } else {
    console.log('FCM: ⚠️ Background message has no notification payload');
    console.log('FCM: This might be why notifications are not showing');
  }
  
  return Promise.resolve();
});

// Global error handler to intercept and suppress errors without crashing the app
if ((global as any).ErrorUtils) {
  (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal: any) => {
    // Safely extract error information
    const errorMessage = error?.message || error?.toString?.() || String(error);
    const errorStack = error?.stack || 'No stack trace available';
    
    // Only log in development mode to avoid cluttering production logs
    if (__DEV__) {
      // Suppress the common "Property 'e' doesn't exist" error from react-native-webrtc
      if (errorMessage?.includes("Property 'e' doesn't exist")) {
        console.warn('⚠️ WebRTC Library Error (Non-Critical):', errorMessage);
        // This is a known issue with react-native-webrtc in Hermes engine
        // The error doesn't affect functionality, so we suppress it
        return;
      }
      
      // Log other errors for debugging
      console.error('=== Error Intercepted ===');
      console.error('Message:', errorMessage);
      console.error('Stack:', errorStack);
      console.error('Is Fatal:', isFatal);
      console.error('========================');
    }
    
    // Don't call React Native's original error handler to prevent crashes
  });
}

const SplashScreen = () => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  if (!showSplash) {
    return null;
  }

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: '#2d3480',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeAnim,
        position: 'absolute',
        top: -100,
        left: -50,
        right: -50,
        bottom: -100,
        zIndex: 1000,
      }}>
      <Image
        source={require('./assets/spashwelcome.png')}
        style={{
          width: 300,
          height: 300,
          resizeMode: 'contain',
        }}
      />
    </Animated.View>
  );
};

const AppContent = () => {
  const { isAuthenticated, isLoading, user, userType } = useAuth();
  const { setCurrentUserId: setThemeUserId } = useTheme();
  const { setCurrentUserId: setLanguageUserId } = useLanguage();
  const { incomingCall, activeCall, setActiveCall, dismissIncomingCall } = useVoIP();
  const [showSplash, setShowSplash] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [PoliceDashboard, setPoliceDashboard] = useState<any>(null);
  const [currentActiveTab, setCurrentActiveTab] = useState<number>(0);
  const sosTabRef = useRef<any>(null);
  const [isCallScreenVisible, setIsCallScreenVisible] = useState(false);
  const lastBackPressRef = useRef<number>(0);
  const [globalModalState, setGlobalModalState] = useState({
    showCrimeReportForm: false,
    showCrimeReportDetail: false,
    selectedReportId: null as string | null,
    showTermsModal: false,
    showPrivacyModal: false,
    showChangePassword: false,
    showFontSizeModal: false,
    showLanguageModal: false,
    showSOSInfoModal: false,
    showUserReportsFilterModal: false,
  });

  // Dynamically import police dashboard
  useEffect(() => {
    if (userType === 'police') {
      import('./app/police-dashboard').then(module => {
        setPoliceDashboard(() => module.default);
      }).catch(error => {
        console.error('Error loading police dashboard:', error);
      });
    }
  }, [userType]);

  useEffect(() => {
    console.log('AppContent: Auth state changed - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'userType:', userType);
    
    // Update theme and language providers with current user ID
    if (user) {
      setThemeUserId(user.uid);
      setLanguageUserId(user.uid);
    } else {
      setThemeUserId(null);
      setLanguageUserId(null);
    }
    
    // Once auth loading is complete, we can proceed
    if (!isLoading) {
      setAuthChecked(true);
    }
  }, [isLoading, isAuthenticated, user, userType, setThemeUserId, setLanguageUserId]);

  useEffect(() => {
    // Show splash for 0.3 seconds, but only if auth hasn't been checked yet
    if (authChecked) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 300);

      return () => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [authChecked]);

  // Initialize FCM service for authenticated users
  useEffect(() => {
    if (isAuthenticated && user && authChecked) {
      console.log('App: Initializing FCM service for user:', user.uid);
      
      try {
        // Create navigation callback for FCM notifications
        const handleFCMNavigation = (type: string, data: any) => {
          console.log('App: FCM navigation callback triggered:', type, data);
          
          switch (type) {
            case 'sos_alert':
              console.log('App: FCM navigating to SOS alert');
              setCurrentActiveTab(2); // Switch to SOS tab
              // You can add additional logic here to highlight specific SOS alert
              break;
            case 'crime_report':
              console.log('App: FCM navigating to crime report');
              setCurrentActiveTab(3); // Switch to Reports tab
              if (data?.reportId) {
                setGlobalModalState(prev => ({
                  ...prev,
                  selectedReportId: data.reportId,
                  showCrimeReportDetail: true,
                  showCrimeReportForm: false,
                  showTermsModal: false,
                  showPrivacyModal: false,
                  showChangePassword: false,
                  showFontSizeModal: false,
                  showLanguageModal: false,
                  showSOSInfoModal: false,
                  showUserReportsFilterModal: false
                }));
              }
              break;
            case 'notifications':
              console.log('App: FCM navigating to notifications');
              setCurrentActiveTab(4); // Switch to Notifications tab
              break;
            default:
              console.log('App: FCM navigating to notifications (default)');
              setCurrentActiveTab(4); // Switch to Notifications tab
              break;
          }
        };
        
        fcmService.setupNotificationListeners(user.uid, handleFCMNavigation);
      } catch (error) {
        console.error('App: Error initializing FCM service:', error);
      }
    }
    
    return () => {
      if (isAuthenticated && user) {
        console.log('App: Cleaning up FCM service');
        fcmService.cleanup();
      }
    };
  }, [isAuthenticated, user, authChecked]);

  // Global gyroscope initialization for authenticated civilian users
  useEffect(() => {
    if (isAuthenticated && userType === 'civilian' && user && authChecked) {
      console.log('App: Initializing global gyroscope service for civilian user');
      
      try {
        if (!gyroscopeService.isGyroscopeAvailable()) {
          console.log('App: Gyroscope not available, skipping initialization');
          return undefined;
        }

        const handleGyroscopeSOS = () => {
          console.log('App: Global gyroscope SOS triggered');
          setCurrentActiveTab(2); // Switch to SOS tab
        };

        const gyroscopeCallbacks = {
          onNavigateToSOS: () => {
            console.log('App: Navigating to SOS from global gyroscope');
            // Close any open modals first
            setGlobalModalState({
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
            setCurrentActiveTab(2);
          },
          onTriggerSOSCountdown: () => {
            console.log('App: Triggering SOS countdown from global gyroscope');
            // Close any open modals first
            setGlobalModalState({
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
            // Trigger the SOS tab's handleSOSPress function after a brief delay
            setTimeout(() => {
              if (sosTabRef.current && sosTabRef.current.handleSOSPress) {
                sosTabRef.current.handleSOSPress();
              }
            }, 500);
          },
          onSOSAlertSent: (result: { success: boolean; sentTo: number }) => {
            console.log('App: SOS alert sent from global gyroscope:', result);
            if (result.success) {
              Alert.alert(
                'SOS Alert Sent',
                `SOS alert has been sent to ${result.sentTo} emergency contact(s) with your current location.`,
                [{ text: 'OK' }]
              );
            }
          },
          onCancelled: () => {
            console.log('App: SOS alert cancelled from global gyroscope');
          },
          onError: (error: string) => {
            console.error('App: Global gyroscope error:', error);
            Alert.alert('Gyroscope Error', error);
          }
        };

        // Always start listening - the service will respect the enabled/disabled state internally
        // The service will check user type and prevent police users from using SOS
        gyroscopeService.startListening(handleGyroscopeSOS, gyroscopeCallbacks);
        
        return () => {
          console.log('App: Cleaning up global gyroscope service');
          gyroscopeService.stopListening();
        };
      } catch (error) {
        console.error('App: Error initializing global gyroscope:', error);
      }
    }
    return undefined;
  }, [isAuthenticated, userType, user, authChecked]);

  // Handle incoming call acceptance
  const handleAcceptCall = () => {
    if (incomingCall) {
      setActiveCall(incomingCall);
      setIsCallScreenVisible(true);
      dismissIncomingCall();
    }
  };

  // Handle incoming call rejection
  const handleRejectCall = () => {
    setActiveCall(null);
    setIsCallScreenVisible(false);
    dismissIncomingCall();
  };

  // Handle call end
  const handleEndCall = () => {
    setIsCallScreenVisible(false);
    setActiveCall(null);
  };

  // Show/hide call screen based on active call
  useEffect(() => {
    if (activeCall && !isCallScreenVisible) {
      setIsCallScreenVisible(true);
    }
    if (!activeCall && isCallScreenVisible) {
      setIsCallScreenVisible(false);
    }
  }, [activeCall, isCallScreenVisible]);
  
  // Ensure gyroscope is stopped for police users
  useEffect(() => {
    if (isAuthenticated && userType === 'police' && user && authChecked) {
      console.log('App: Stopping gyroscope service for police user');
      try {
        gyroscopeService.stopListening();
      } catch (error) {
        console.error('App: Error stopping gyroscope for police user:', error);
      }
    }
  }, [isAuthenticated, userType, user, authChecked]);

  // Back button handler for exit confirmation (only when no modals are open)
  // This handler runs AFTER Dashboard's handler (handlers are called in reverse order)
  // If Dashboard returns true (modal closed), this handler won't need to do anything
  // If Dashboard returns false (no modals), this handler shows exit confirmation
  useEffect(() => {
    // Only add exit confirmation handler if user is authenticated
    if (!isAuthenticated || !authChecked) {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // If call screen is visible, close it first
      if (isCallScreenVisible && activeCall) {
        handleEndCall();
        return true;
      }

      // If incoming call is visible, dismiss it
      if (incomingCall && !isCallScreenVisible) {
        handleRejectCall();
        return true;
      }

      // Check time since last back press for exit confirmation
      const now = Date.now();
      const timeSinceLastPress = now - lastBackPressRef.current;

      if (timeSinceLastPress < 2000 && lastBackPressRef.current > 0) {
        // Less than 2 seconds since last press, exit the app
        BackHandler.exitApp();
        return true;
      } else {
        // First press or more than 2 seconds, show exit message
        lastBackPressRef.current = now;
        if (Platform.OS === 'android') {
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        }
        // Prevent default back behavior (app exit)
        return true;
      }
    });

    return () => backHandler.remove();
  }, [isAuthenticated, authChecked, isCallScreenVisible, activeCall, incomingCall]);

  // Show splash screen while auth is loading or for 0.3 seconds after auth is determined
  if (showSplash || isLoading) {
    return <SplashScreen />;
  }

  const renderMainContent = () => {
    if (isAuthenticated) {
      if (userType === 'police') {
        console.log('AppContent: Police user authenticated, showing Police Dashboard');
        return PoliceDashboard ? <PoliceDashboard /> : <ActivityIndicator size="large" color="#4c643b" />;
      } else {
        console.log('AppContent: Civilian user authenticated, showing Dashboard');
        return (
          <Dashboard 
            globalActiveTab={currentActiveTab}
            onGlobalTabChange={setCurrentActiveTab}
            globalSosTabRef={sosTabRef}
            globalModalState={globalModalState}
            onGlobalModalChange={setGlobalModalState}
          />
        );
      }
    }

    console.log('AppContent: User not authenticated, showing Welcome');
    return <Welcome />;
  };

  return (
    <>
      {renderMainContent()}
      
      {/* Global Incoming Call Modal */}
      {incomingCall && !isCallScreenVisible && (
        <IncomingCallModal
          visible={true}
          callData={incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Global Call Screen */}
      {isCallScreenVisible && activeCall && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="fullScreen"
          statusBarTranslucent={true}
          hardwareAccelerated={true}
        >
          <VoiceCallScreen
            callData={activeCall}
            isOutgoing={activeCall.caller.userId === user?.uid}
            onEndCall={handleEndCall}
          />
        </Modal>
      )}
    </>
  );
};

const App = () => {
  useEffect(() => {
    // Initialize background service
    backgroundService.start();
    
    // Request notification permissions immediately on app startup
    const requestNotificationPermissions = async () => {
      try {
        console.log('App: Requesting notification permissions on startup...');
        const hasPermission = await fcmService.requestUserPermission();
        if (hasPermission) {
          console.log('App: ✅ Notification permissions granted on startup');
        } else {
          console.log('App: ❌ Notification permissions denied on startup');
        }
      } catch (error) {
        console.error('App: Error requesting notification permissions on startup:', error);
      }
    };
    
    // Request permissions immediately
    requestNotificationPermissions();
    
    // Cleanup on unmount
    return () => {
      backgroundService.stop();
    };
  }, []);

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <VoIPProvider>
              <NotificationProvider>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
                <AppContent />
              </NotificationProvider>
            </VoIPProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
};

export default App; 