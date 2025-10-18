import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useAuth } from '../../services/authContext';
import { FirebaseService } from '../../services/firebaseService';
import { gyroscopeService } from '../../services/gyroscopeService';
import { apis } from '../../services/apis';
import PoliceCrimeList from '../../components/police-crime-list';
import CrimeReportDetail from '../../CrimeReportDetail';

const PoliceDashboard = () => {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Request location permissions
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Ensure gyroscope service is stopped for police officers
  useEffect(() => {
    console.log('PoliceDashboard: Ensuring gyroscope service is stopped for police officer');
    try {
      gyroscopeService.stopListening();
    } catch (error) {
      console.error('PoliceDashboard: Error stopping gyroscope service:', error);
    }
  }, []);

  // Helper function to get address from coordinates
  const getAddressFromCoordinates = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const address = await apis.location.reverseGeocode(latitude, longitude);
      return address;
    } catch (error) {
      console.error('Error getting address from coordinates:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  // Start location tracking when permissions granted
  useEffect(() => {
    if (locationEnabled && user) {
      startLocationTracking();
    }
  }, [locationEnabled, user]);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        // First check if permission is already granted
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (hasPermission) {
          console.log('Location permission already granted');
          setLocationEnabled(true);
          return;
        }
        
        // Request permission
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'E-Responde needs access to your location to show your position on the map for civilians.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );
        
        console.log('Permission request result:', granted);
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission granted');
          setLocationEnabled(true);
        } else {
          console.log('Location permission denied');
          Alert.alert(
            'Location Permission Required',
            'Location access is needed to share your position with civilians viewing crime reports.\n\nTo enable:\n1. Go to Settings > Apps > E-Responde\n2. Tap Permissions\n3. Enable Location',
            [
              { text: 'Try Again', onPress: () => requestLocationPermission() },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }
      } else {
        // iOS - request permission and check status
        Geolocation.requestAuthorization();
        
        // Give it a moment for the permission dialog to appear
        setTimeout(() => {
          // Check current authorization status with a simple test
          Geolocation.getCurrentPosition(
            () => {
              console.log('iOS location permission granted');
              setLocationEnabled(true);
            },
            (error) => {
              console.log('iOS location permission denied or error:', error);
              if (error.code === 1) { // PERMISSION_DENIED
                Alert.alert(
                  'Location Permission Required',
                  'Please enable location access to share your position with civilians.\n\nTo enable:\n1. Open Settings app\n2. Go to Privacy & Security\n3. Tap Location Services\n4. Find E-Responde\n5. Select "While Using App" or "Always"',
                  [
                    { text: 'Try Again', onPress: () => requestLocationPermission() },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              } else {
                // Other errors (GPS off, etc.)
                Alert.alert(
                  'Location Error',
                  'Unable to access your location. Please check:\n\n1. Location Services is enabled\n2. GPS is turned on\n3. You have a clear view of the sky\n4. Try moving to a different location',
                  [
                    { text: 'Try Again', onPress: () => requestLocationPermission() },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          );
        }, 1000);
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert(
        'Permission Error',
        'Unable to request location permission. Please check your device settings and try again.',
        [
          { text: 'Try Again', onPress: () => requestLocationPermission() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const startLocationTracking = () => {
    console.log('Starting location tracking for police officer');
    
    // First, try with high accuracy and shorter timeout
    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Initial police location (high accuracy):', latitude, longitude);
        
        // Get address from coordinates
        const address = await getAddressFromCoordinates(latitude, longitude);
        setCurrentLocation({ latitude, longitude, address });
        setLocationError(null);
        updateLocationInFirebase(latitude, longitude);
      },
      (error) => {
        console.log('High accuracy failed, trying with lower accuracy...', error);
        
        // If high accuracy fails, try with lower accuracy and longer timeout
        Geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            console.log('Initial police location (lower accuracy):', latitude, longitude);
            
            // Get address from coordinates
            const address = await getAddressFromCoordinates(latitude, longitude);
            setCurrentLocation({ latitude, longitude, address });
            setLocationError(null);
            updateLocationInFirebase(latitude, longitude);
          },
          (fallbackError) => {
            console.error('Both location attempts failed:', fallbackError);
            handleLocationError(fallbackError);
          },
          { 
            enableHighAccuracy: false, 
            timeout: 30000, 
            maximumAge: 60000 
          }
        );
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 5000 
      }
    );

    // Watch position for continuous updates
    const watchId = Geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Police location updated:', latitude, longitude);
        
        // Get address from coordinates
        const address = await getAddressFromCoordinates(latitude, longitude);
        setCurrentLocation({ latitude, longitude, address });
        updateLocationInFirebase(latitude, longitude);
      },
      (error) => {
        console.error('Error watching location:', error);
        // Don't show alerts for watch errors as they can be frequent
        // Just log them for debugging
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 50, // Update every 50 meters
        interval: 30000, // Update every 30 seconds
        fastestInterval: 15000, // Fastest update every 15 seconds
      }
    );

    // Store watchId for cleanup
    return () => {
      if (watchId) {
        console.log('Clearing location watch');
        Geolocation.clearWatch(watchId);
      }
    };
  };

  const handleLocationError = (error: any) => {
    console.error('Location error details:', error);
    let errorMessage = 'Unable to get your current location.';
    let suggestions: string[] = [];
    
    switch (error?.code) {
      case 1: // PERMISSION_DENIED
        errorMessage = 'Location permission denied.';
        setLocationError('Permission denied');
        suggestions = [
          '1. Go to Settings > Apps > E-Responde > Permissions',
          '2. Enable Location permission',
          '3. Or go to Settings > Privacy > Location Services',
          '4. Make sure Location Services is ON'
        ];
        break;
      case 2: // POSITION_UNAVAILABLE
        errorMessage = 'Location is currently unavailable.';
        setLocationError('GPS unavailable');
        suggestions = [
          '1. Check if GPS is enabled',
          '2. Try going outside or near a window',
          '3. Make sure you have a clear view of the sky',
          '4. Restart your device if GPS seems stuck'
        ];
        break;
      case 3: // TIMEOUT
        errorMessage = 'Location request timed out.';
        setLocationError('Timeout');
        suggestions = [
          '1. Try again in a moment',
          '2. Move to a location with better GPS signal',
          '3. Check if you\'re indoors (GPS works better outdoors)',
          '4. Make sure location services are enabled'
        ];
        break;
      default:
        errorMessage = 'Unable to get your current location.';
        setLocationError('Unknown error');
        suggestions = [
          '1. Check your GPS settings',
          '2. Make sure location permission is granted',
          '3. Try moving to a different location',
          '4. Restart the app and try again'
        ];
    }
    
    Alert.alert(
      'Location Error', 
      `${errorMessage}\n\nSuggestions:\n${suggestions.join('\n')}`,
      [
        { text: 'Retry', onPress: () => {
          setLocationError(null);
          startLocationTracking();
        }},
        { text: 'Check Settings', onPress: () => {
          Alert.alert(
            'Location Settings',
            'To enable location access:\n\nAndroid:\nSettings > Apps > E-Responde > Permissions > Location\n\nOr\n\nSettings > Privacy > Location Services',
            [{ text: 'OK' }]
          );
        }},
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const updateLocationInFirebase = async (latitude: number, longitude: number) => {
    if (!user) {
      console.log('No user found, skipping location update');
      return;
    }

    try {
      await FirebaseService.updatePoliceLocation(user.uid, latitude, longitude);
      console.log('Police location updated in Firebase:', latitude, longitude);
    } catch (error) {
      console.error('Error updating police location:', error);
      // Don't show alerts for Firebase errors as they can be frequent
      // The location tracking will continue to work locally
    }
  };

  const handleLogout = async () => {
    try {
      // Clear location before logout
      if (user) {
        try {
          // Optionally clear location on logout
          // await FirebaseService.updatePoliceLocation(user.uid, 0, 0);
        } catch (error) {
          console.error('Error clearing location:', error);
        }
      }
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleViewReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setActiveTab('detail');
  };

  const handleBackToList = () => {
    setSelectedReportId(null);
    setActiveTab('list');
  };

  if (selectedReportId && activeTab === 'detail') {
    return (
      <CrimeReportDetail
        reportId={selectedReportId}
        onClose={handleBackToList}
        isPoliceView={true}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/policeapp.png')}
            style={styles.logo}
          />
          <View>
            <Text style={styles.headerTitle}>Police Portal</Text>
            <Text style={styles.headerSubtitle}>Crime Reports Dashboard</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Image
            source={require('../../assets/logout.png')}
            style={styles.logoutIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>Welcome, Officer</Text>
          <Text style={styles.emailText}>{user?.email}</Text>
          <Text style={styles.infoText}>
            View and monitor crime reports in your jurisdiction
          </Text>
          
          {/* Location Status */}
          <View style={styles.locationStatus}>
            <Text style={styles.locationLabel}>
              Location Tracking: 
            </Text>
            {locationEnabled && currentLocation ? (
              <View>
                <Text style={styles.locationEnabled}>Active</Text>
                <Text style={styles.locationAddress}>
                  {currentLocation.address}
                </Text>
                <Text style={styles.locationCoords}>
                  {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </Text>
                <Text style={styles.locationInfo}>
                  Auto-updates every 30 seconds
                </Text>
              </View>
            ) : (
              <View>
                <Text style={styles.locationDisabled}>Disabled</Text>
                {locationError ? (
                  <Text style={styles.locationError}>
                    Error: {locationError}
                  </Text>
                ) : (
                  <Text style={styles.locationHelp}>
                    Location tracking will start automatically
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Crime Reports List */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>All Crime Reports</Text>
          <PoliceCrimeList onViewReport={handleViewReport} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    backgroundColor: '#000000',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 12,
    borderRadius: 25,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E5E7EB',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  logoutIcon: {
    width: 28,
    height: 28,
    tintColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#333333',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#D0D0D0',
    lineHeight: 20,
  },
  locationStatus: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: 8,
  },
  locationAddress: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 18,
  },
  locationEnabled: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  locationDisabled: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  locationCoords: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 2,
  },
  locationInfo: {
    fontSize: 11,
    color: '#808080',
    marginTop: 2,
    fontStyle: 'italic',
  },
  locationHelp: {
    fontSize: 11,
    color: '#FFA500',
    marginTop: 2,
    fontStyle: 'italic',
  },
  locationError: {
    fontSize: 11,
    color: '#FF6B6B',
    marginTop: 2,
    fontStyle: 'italic',
  },
  listContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
});

export default PoliceDashboard;

