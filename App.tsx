import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Animated, Image } from 'react-native';
import { ThemeProvider } from './services/themeContext';
import { LanguageProvider } from './services/languageContext';
import { AuthProvider, useAuth } from './services/authContext';
import Welcome from './Welcome';
import Dashboard from './Dashboard';

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
        backgroundColor: '#1E3A8A',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeAnim,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
  const { isAuthenticated, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    console.log('AppContent: Auth state changed - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
    
    // Once auth loading is complete, we can proceed
    if (!isLoading) {
      setAuthChecked(true);
    }
  }, [isLoading, isAuthenticated]);

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
    console.log('AppContent: User is authenticated, showing Dashboard');
    return <Dashboard />;
  }

  console.log('AppContent: User not authenticated, showing Welcome');
  return <Welcome />;
};

const App = () => {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default App; 