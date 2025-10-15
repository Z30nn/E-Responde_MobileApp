import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Animated, Image, StatusBar, Alert } from 'react-native';
import { ThemeProvider, useTheme } from './services/themeContext';
import { LanguageProvider, useLanguage } from './services/languageContext';
import { AuthProvider, useAuth } from './services/authContext';
import { NotificationProvider } from './services/notificationContext';
import { backgroundService } from './services/backgroundService';
import { gyroscopeService } from './services/gyroscopeService';
import Welcome from './Welcome';
import Dashboard from './app/dashboard';

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
  const [showSplash, setShowSplash] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [PoliceDashboard, setPoliceDashboard] = useState<any>(null);
  const [currentActiveTab, setCurrentActiveTab] = useState<number>(0);
  const sosTabRef = useRef<any>(null);
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

      return () => clearTimeout(timer);
    }
  }, [authChecked]);

  // Global gyroscope initialization for authenticated civilian users
  useEffect(() => {
    if (isAuthenticated && userType === 'civilian' && user && authChecked) {
      console.log('App: Initializing global gyroscope service for civilian user');
      
      try {
        if (!gyroscopeService.isGyroscopeAvailable()) {
          console.log('App: Gyroscope not available, skipping initialization');
          return;
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
  }, [isAuthenticated, userType, user, authChecked]);

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

  // Show splash screen while auth is loading or for 0.3 seconds after auth is determined
  if (showSplash || isLoading) {
    return <SplashScreen />;
  }

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

const App = () => {
  useEffect(() => {
    // Initialize background service
    backgroundService.start();
    
    // Cleanup on unmount
    return () => {
      backgroundService.stop();
    };
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default App; 