import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Animated,
  InteractionManager,
} from 'react-native';
import { auth } from '../../../../firebaseConfig';
import { useTheme, colors, fontSizes } from '../../../../services/themeContext';
import { useLanguage } from '../../../../services/languageContext';
import { FirebaseService, CivilianUser } from '../../../../services/firebaseService';
import { EmergencyContactsService } from '../../../../services/emergencyContactsService';
import { EmergencyContact } from '../../../../services/types/emergency-types';
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

interface SOSLocation {
  latitude: number;
  longitude: number;
  address: string;
}

const CONTACT_CACHE_TTL = 30 * 1000;
const PROFILE_CACHE_TTL = 5 * 60 * 1000;
const LOCATION_TIMEOUT = 10000;
const FALLBACK_LOCATION: SOSLocation = {
  latitude: 0,
  longitude: 0,
  address: 'Location not available',
};

const SOSTab = forwardRef<SOSTabRef, SOSTabProps>(({ userId, selectedAlertId, onAlertSelected, onShowInfo }, ref) => {
  const [sosLoading, setSosLoading] = useState(false);
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const sosCountdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeOperationRef = useRef(0);
  const locationPromiseRef = useRef<Promise<SOSLocation> | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [userType, setUserType] = useState<'police' | 'civilian' | null>(null);
  const [hasPrimaryContacts, setHasPrimaryContacts] = useState<boolean | null>(null);
  const primaryContactsRef = useRef<EmergencyContact[]>([]);
  const lastContactsFetchRef = useRef(0);
  const reporterProfileRef = useRef<CivilianUser | null>(null);
  const lastProfileFetchRef = useRef(0);
  const lastUserTypeCheckRef = useRef(0);
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

  useEffect(() => {
    let isMounted = true;

    const preload = async () => {
      if (!userId) {
        return;
      }

      try {
        const [typeResult, primaryContacts, profile] = await Promise.all([
          FirebaseService.getUserType(userId).catch((error) => {
            console.error('SOSTab: Failed to get user type during preload', error);
            return null;
          }),
          EmergencyContactsService.getPrimaryEmergencyContacts(userId).catch((error) => {
            console.error('SOSTab: Failed to preload primary contacts', error);
            return [] as EmergencyContact[];
          }),
          FirebaseService.getCivilianUser(userId).catch((error) => {
            console.error('SOSTab: Failed to preload reporter profile', error);
            return null;
          }),
        ]);

        if (!isMounted) {
          return;
        }

        setUserType(typeResult);
        lastUserTypeCheckRef.current = Date.now();
        primaryContactsRef.current = primaryContacts;
        lastContactsFetchRef.current = Date.now();
        setHasPrimaryContacts(primaryContacts.length > 0);

        if (profile) {
          reporterProfileRef.current = profile;
          lastProfileFetchRef.current = Date.now();
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error('SOSTab: Unexpected error while preloading SOS dependencies', error);
      }
    };

    preload();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const cleanupCountdownInterval = useCallback(() => {
    if (sosCountdownIntervalRef.current) {
      clearInterval(sosCountdownIntervalRef.current);
      sosCountdownIntervalRef.current = null;
    }
  }, []);

  const resetOperationState = useCallback(
    (options?: { keepOperationId?: boolean }) => {
      cleanupCountdownInterval();
      setSosCountdown(null);
      setSosLoading(false);
      setStatusMessage(null);
      locationPromiseRef.current = null;
      if (!options?.keepOperationId) {
        activeOperationRef.current += 1;
      }
    },
    [cleanupCountdownInterval]
  );

  const ensureUserType = useCallback(async (): Promise<'police' | 'civilian' | null> => {
    const now = Date.now();
    if (userType !== null && now - lastUserTypeCheckRef.current < PROFILE_CACHE_TTL) {
      return userType;
    }

    try {
      const typeResult = await FirebaseService.getUserType(userId);
      setUserType(typeResult);
      lastUserTypeCheckRef.current = Date.now();
      return typeResult;
    } catch (error) {
      console.error('SOSTab: Failed to verify user type', error);
      return userType;
    }
  }, [userId, userType]);

  const ensurePrimaryContacts = useCallback(async (): Promise<EmergencyContact[]> => {
    const now = Date.now();
    if (now - lastContactsFetchRef.current < CONTACT_CACHE_TTL && lastContactsFetchRef.current !== 0) {
      return primaryContactsRef.current;
    }

    try {
      const contacts = await EmergencyContactsService.getPrimaryEmergencyContacts(userId);
      primaryContactsRef.current = contacts;
      lastContactsFetchRef.current = Date.now();
      setHasPrimaryContacts(contacts.length > 0);
      return contacts;
    } catch (error) {
      console.error('SOSTab: Failed to load primary contacts', error);
      throw error;
    }
  }, [userId]);

  const ensureReporterProfile = useCallback(async (): Promise<CivilianUser | null> => {
    const now = Date.now();
    if (reporterProfileRef.current && now - lastProfileFetchRef.current < PROFILE_CACHE_TTL) {
      return reporterProfileRef.current;
    }

    try {
      const profile = await FirebaseService.getCivilianUser(userId);
      reporterProfileRef.current = profile;
      lastProfileFetchRef.current = Date.now();
      return profile;
    } catch (error) {
      console.error('SOSTab: Failed to load reporter profile', error);
      lastProfileFetchRef.current = Date.now();
      return reporterProfileRef.current;
    }
  }, [userId]);

  const fetchLocation = useCallback(async (): Promise<SOSLocation> => {
    try {
      const location = await Promise.race([
        new Promise<SOSLocation>((resolve, reject) => {
          Geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              let address = 'Location not available';

              try {
                const response = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                  {
                    headers: {
                      'User-Agent': 'E-Responde-MobileApp/1.0',
                      Accept: 'application/json',
                    },
                  }
                );

                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                if (data && data.display_name) {
                  address = data.display_name;
                } else {
                  address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                }
              } catch (geocodeError) {
                console.log('SOSTab: Reverse geocoding failed, using coordinates', geocodeError);
                address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
              }

              resolve({
                latitude,
                longitude,
                address,
              });
            },
            (error) => reject(error),
            {
              enableHighAccuracy: false,
              timeout: LOCATION_TIMEOUT,
              maximumAge: 30000,
            }
          );
        }),
        new Promise<SOSLocation>((_, reject) =>
          setTimeout(() => reject(new Error('Location timeout')), LOCATION_TIMEOUT)
        ),
      ]);

      return location;
    } catch (error) {
      console.log('SOSTab: Unable to capture location, using fallback', error);
      return { ...FALLBACK_LOCATION };
    }
  }, []);

  const beginLocationPrefetch = useCallback(
    (operationId: number) => {
      if (locationPromiseRef.current && activeOperationRef.current === operationId) {
        return;
      }
      locationPromiseRef.current = fetchLocation();
    },
    [fetchLocation]
  );

  const executeSOS = useCallback(
    async (operationId: number) => {
      try {
        if (activeOperationRef.current !== operationId) {
          return;
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
          resetOperationState();
          Alert.alert(t('common.error') || 'Error', 'You must be logged in to send SOS alerts.', [
            { text: t('common.ok') || 'OK' },
          ]);
          return;
        }

        setSosLoading(true);
        setStatusMessage('Sending SOS alert...');

        await new Promise<void>((resolve) =>
          InteractionManager.runAfterInteractions(() => resolve())
        );

        const [contacts, profile] = await Promise.all([
          ensurePrimaryContacts(),
          ensureReporterProfile(),
        ]);

        if (activeOperationRef.current !== operationId) {
          return;
        }

        if (!contacts || contacts.length === 0) {
          resetOperationState();
          Alert.alert(
            t('emergency.noPrimaryContacts') || 'No Primary Contacts',
            t('emergency.noPrimaryContactsDesc') ||
              'You need at least one primary emergency contact to send SOS alerts. Please add emergency contacts first.',
            [{ text: t('common.ok') || 'OK' }]
          );
          return;
        }

        const locationPromise = locationPromiseRef.current ?? fetchLocation();
        const location = await locationPromise;
        locationPromiseRef.current = null;

        if (activeOperationRef.current !== operationId) {
          return;
        }

        const reporterName = profile
          ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || 'Unknown User'
          : currentUser.displayName || currentUser.email || 'Unknown User';

        const sosReport = {
          crimeType: 'Emergency SOS',
          dateTime: new Date(),
          description: 'SOS Alert triggered - Immediate assistance required',
          multimedia: [],
          location,
          anonymous: false,
          reporterName,
          reporterUid: currentUser.uid,
          status: 'pending',
          createdAt: new Date().toISOString(),
          severity: 'Immediate' as const,
        };

        void FirebaseService.submitCrimeReport(sosReport).catch((reportError) => {
          console.error('Error creating SOS report:', reportError);
        });

        const sosResult = await EmergencyContactsService.sendSOSAlert(
          userId,
          'Emergency SOS triggered - Immediate assistance required',
          {
            userType,
            primaryContacts: contacts,
            userProfile: profile,
            location,
          }
        );

        if (activeOperationRef.current !== operationId) {
          return;
        }

        resetOperationState();

        if (sosResult.success) {
          Alert.alert(
            t('emergency.sosSent') || 'SOS Alert Sent',
            `SOS alert has been sent to ${sosResult.sentTo} emergency contact(s) with your current location.`,
            [{ text: t('common.ok') || 'OK' }]
          );
        } else {
          const errorMessage =
            sosResult.errors[0] || t('emergency.sosError') || 'Failed to send SOS alert.';
          Alert.alert(t('common.error') || 'Error', errorMessage, [
            { text: t('common.ok') || 'OK' },
          ]);
        }
      } catch (error: any) {
        if (activeOperationRef.current !== operationId) {
          return;
        }

        console.error('Error executing SOS alert:', error);
        resetOperationState();
        const errorMessage =
          error?.message || t('emergency.sosError') || 'Failed to send SOS alert.';
        Alert.alert(t('common.error') || 'Error', errorMessage, [{ text: t('common.ok') || 'OK' }]);
      }
    },
    [
      ensurePrimaryContacts,
      ensureReporterProfile,
      fetchLocation,
      resetOperationState,
      t,
      userId,
      userType,
    ]
  );

  const startCountdown = useCallback(
    (operationId: number) => {
      cleanupCountdownInterval();
      let remaining = 5;
      setSosCountdown(remaining);

      sosCountdownIntervalRef.current = setInterval(() => {
        if (activeOperationRef.current !== operationId) {
          cleanupCountdownInterval();
          return;
        }

        remaining -= 1;

        if (remaining <= 0) {
          cleanupCountdownInterval();
          setSosCountdown(null);
          void executeSOS(operationId);
        } else {
          setSosCountdown(remaining);
        }
      }, 1000);
    },
    [cleanupCountdownInterval, executeSOS]
  );
  // Request location permission for SOS alerts
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const alreadyGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (alreadyGranted) {
          return true;
        }

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
  }, []);

  const handleSOSPress = useCallback(async () => {
    if (sosCountdown !== null) {
      console.log('SOS countdown cancelled by user');
      resetOperationState();
      return;
    }

    const typeResult = await ensureUserType();
    if (typeResult === 'police') {
      Alert.alert(
        'Access Denied',
        'SOS functionality is not available for police officers. This feature is only available for civilians.',
        [{ text: 'OK' }]
      );
      return;
    }

    const hasLocationPermission = await requestLocationPermission();
    if (!hasLocationPermission) {
      Alert.alert(
        'Location Permission Required',
        'Location access is needed to send accurate SOS alerts. Please enable location permissions in your device settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    let primaryContacts: EmergencyContact[] = [];
    try {
      primaryContacts = await ensurePrimaryContacts();
    } catch (error) {
      console.error('SOSTab: Unable to verify primary contacts before starting countdown', error);
      Alert.alert(
        t('common.error') || 'Error',
        t('emergency.sosError') || 'Failed to send SOS alert.',
        [{ text: t('common.ok') || 'OK' }]
      );
      return;
    }

    if (!primaryContacts || primaryContacts.length === 0) {
      setHasPrimaryContacts(false);
      Alert.alert(
        t('emergency.noPrimaryContacts') || 'No Primary Contacts',
        t('emergency.noPrimaryContactsDesc') ||
          'You need at least one primary emergency contact to send SOS alerts. Please add emergency contacts first.',
        [{ text: t('common.ok') || 'OK' }]
      );
      return;
    }

    setHasPrimaryContacts(true);
    cleanupCountdownInterval();
    locationPromiseRef.current = null;

    const operationId = activeOperationRef.current + 1;
    activeOperationRef.current = operationId;

    setStatusMessage(t('emergency.tapToCancel') || 'Tap again to cancel the SOS.');
    beginLocationPrefetch(operationId);
    startCountdown(operationId);
  }, [
    sosCountdown,
    resetOperationState,
    ensureUserType,
    requestLocationPermission,
    ensurePrimaryContacts,
    t,
    cleanupCountdownInterval,
    beginLocationPrefetch,
    startCountdown,
  ]);

  useEffect(
    () => () => {
      cleanupCountdownInterval();
      locationPromiseRef.current = null;
    },
    [cleanupCountdownInterval]
  );

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

      {statusMessage && (
        <Text style={styles.statusMessage}>{statusMessage}</Text>
      )}

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

