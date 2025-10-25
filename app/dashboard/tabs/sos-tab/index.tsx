import React, { FC, useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Animated,
} from 'react-native';
import { auth } from '../../../../firebaseConfig';
import { useTheme, colors, fontSizes } from '../../../../services/themeContext';
import { useLanguage } from '../../../../services/languageContext';
import { FirebaseService } from '../../../../services/firebaseService';
import { EmergencyContactsService } from '../../../../services/emergencyContactsService';
import GeocodingService from '../../../../services/geocodingService';
import SOSAlertsHistory from '../../../../components/sos-alerts-history';
import Geolocation from '@react-native-community/geolocation';
import { createStyles } from './styles';

interface SOSTabProps {
  userId: string;
  selectedAlertId: string | null;
  onAlertSelected: (alertId: string | null) => void;
  onShowInfo: () => void;
}

export interface SOSTabRef {
  handleSOSPress: () => void;
}

const SOSTab = forwardRef<SOSTabRef, SOSTabProps>(({ userId, selectedAlertId, onAlertSelected, onShowInfo }, ref) => {
  const [sosLoading, setSosLoading] = useState(false);
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [sosCountdownInterval, setSosCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  const { isDarkMode, fontSize } = useTheme();
  const { t } = useLanguage();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const styles = createStyles(theme, fonts, isDarkMode);

  // Animated values for ripple effect
  const rippleAnim1 = useRef(new Animated.Value(0)).current;
  const rippleAnim2 = useRef(new Animated.Value(0)).current;
  const rippleAnim3 = useRef(new Animated.Value(0)).current;

  // Ripple animation effect
  useEffect(() => {
    const createRippleAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = createRippleAnimation(rippleAnim1, 0);
    const animation2 = createRippleAnimation(rippleAnim2, 833);
    const animation3 = createRippleAnimation(rippleAnim3, 1666);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [rippleAnim1, rippleAnim2, rippleAnim3]);

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
      // Check if current user is a police officer - prevent SOS for police
      if (userId) {
        try {
          const userType = await FirebaseService.getUserType(userId);
          if (userType === 'police') {
            console.log('SOSTab: Police user detected - SOS functionality disabled for police officers');
            Alert.alert(
              'Access Denied',
              'SOS functionality is not available for police officers. This feature is only available for civilians.',
              [{ text: 'OK' }]
            );
            return;
          }
        } catch (error) {
          console.error('Error checking user type:', error);
        }
      }

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
      const contacts = await EmergencyContactsService.getUserEmergencyContacts(userId);
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
              // First, capture location coordinates quickly
              const locationPromise = new Promise<{latitude: number, longitude: number}>((resolve, reject) => {
                console.log('SOS Report: Starting location capture...');

                Geolocation.getCurrentPosition(
                  (position: any) => {
                    console.log('SOS Report: Position received:', position);
                    const { latitude, longitude } = position.coords;
                    console.log('SOS Report: Coordinates - Lat:', latitude, 'Lng:', longitude);
                    resolve({ latitude, longitude });
                  },
                  (error: any) => {
                    console.log('SOS Report: Location error:', error);
                    console.log('SOS Report: Error code:', error.code);
                    console.log('SOS Report: Error message:', error.message);
                    reject(error);
                  },
                  {
                    enableHighAccuracy: false,
                    timeout: 8000, // Reduced timeout for faster capture
                    maximumAge: 30000
                  }
                );
              });

              console.log('SOS Report: Waiting for location with 8 second timeout...');
              const coordinates = await Promise.race([
                locationPromise,
                new Promise<{latitude: number, longitude: number}>((_, reject) =>
                  setTimeout(() => {
                    console.log('SOS Report: Location timeout after 8 seconds');
                    reject(new Error('Location timeout'));
                  }, 8000)
                )
              ]);

              console.log('SOS Report: Location captured successfully:', coordinates);

              // Now do reverse geocoding with improved service
              console.log('SOS Report: Starting reverse geocoding...');
              const geocodingResult = await GeocodingService.reverseGeocode(
                coordinates.latitude, 
                coordinates.longitude
              );
              
              const address = geocodingResult.address;
              console.log('SOS Report: Geocoding result:', {
                address,
                success: geocodingResult.success,
                source: geocodingResult.source,
                error: geocodingResult.error
              });

              // Create final location object
              sosLocation = {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
                address: address
              };

              console.log('SOS Report: Final location data:', sosLocation);

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
            }
          }

          // Send SOS alert to emergency contacts
          const result = await EmergencyContactsService.sendSOSAlert(
            userId,
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
          setSosLoading(false);
          setSosCountdown(null);
          if (sosCountdownInterval) {
            clearInterval(sosCountdownInterval);
            setSosCountdownInterval(null);
          }
        }
      };
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
  }, [userId, t, sosCountdown, sosCountdownInterval]);

  // Expose handleSOSPress function to parent component
  useImperativeHandle(ref, () => ({
    handleSOSPress: handleSOSPress
  }));

  return (
    <View style={styles.contentContainer}>
      <Text style={styles.sosTitle}>SOS</Text>
      <TouchableOpacity
        style={styles.infoButton}
        onPress={onShowInfo}
        activeOpacity={0.8}
      >
        <Text style={styles.infoButtonText}>i</Text>
      </TouchableOpacity>

      {/* SOS Button */}
      <View style={styles.sosButtonContainer}>
        {/* Static Outer Circles */}
        <View style={styles.sosOuterCircle2} />
        <View style={styles.sosOuterCircle} />

        {/* Animated Ripple Circles */}
        <Animated.View
          style={[
            styles.rippleCircle,
            {
              opacity: rippleAnim1.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 0],
              }),
              transform: [
                {
                  scale: rippleAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.4],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.rippleCircle,
            {
              opacity: rippleAnim2.interpolate({
                inputRange: [0, 1],
                outputRange: [0.35, 0],
              }),
              transform: [
                {
                  scale: rippleAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.4],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.rippleCircle,
            {
              opacity: rippleAnim3.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 0],
              }),
              transform: [
                {
                  scale: rippleAnim3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.4],
                  }),
                },
              ],
            },
          ]}
        />

        {/* Main SOS Button */}
        <TouchableOpacity
          style={styles.sosButton}
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
              <Text style={styles.sosButtonSubText2}>
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

      {/* SOS Alerts History */}
      <View style={styles.sosHistoryContainer}>
        <SOSAlertsHistory
          userId={userId}
          selectedAlertId={selectedAlertId}
          onAlertSelected={onAlertSelected}
        />
      </View>
    </View>
  );
});

SOSTab.displayName = 'SOSTab';

export default SOSTab;

