/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Image,
  Animated,
} from 'react-native';
import Welcome from './Welcome';

const Splash = () => {
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      // Start fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200, // 0.2 second fade out
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }, 300); // Show for 0.3 seconds before starting fade

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  if (!showSplash) {
    return <Welcome />;
  }

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: '#1E3A8A',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeAnim,
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

export default Splash;
