import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Animated, Image, StatusBar } from 'react-native';
import { ThemeProvider, useTheme } from './services/themeContext';
import { LanguageProvider, useLanguage } from './services/languageContext';
import { AuthProvider, useAuth } from './services/authContext';
import { NotificationProvider } from './services/notificationContext';
import { backgroundService } from './services/backgroundService';
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
      return <Dashboard />;
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