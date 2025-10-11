import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useAuth } from '../../services/authContext';
import { FirebaseService } from '../../services/firebaseService';
import PoliceCrimeList from '../../components/police-crime-list';
import CrimeReportDetail from '../../CrimeReportDetail';

const PoliceDashboard = () => {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Request location permissions
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Start location tracking when permissions granted
  useEffect(() => {
    if (locationEnabled && user) {
      startLocationTracking();
    }
  }, [locationEnabled, user]);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'E-Responde needs access to your location to show your position on the map for civilians.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission granted');
          setLocationEnabled(true);
        } else {
          console.log('Location permission denied');
          Alert.alert(
            'Location Permission Required',
            'Please enable location access in settings to share your location with civilians.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // iOS - request permission through Geolocation
        Geolocation.requestAuthorization();
        setLocationEnabled(true);
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const startLocationTracking = () => {
    // Get initial position
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Initial police location:', latitude, longitude);
        setCurrentLocation({ latitude, longitude });
        updateLocationInFirebase(latitude, longitude);
      },
      (error) => {
        console.error('Error getting initial location:', error);
        Alert.alert('Location Error', 'Unable to get your current location. Please check your GPS settings.');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );

    // Watch position for continuous updates
    const watchId = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Police location updated:', latitude, longitude);
        setCurrentLocation({ latitude, longitude });
        updateLocationInFirebase(latitude, longitude);
      },
      (error) => {
        console.error('Error watching location:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 50, // Update every 50 meters
        interval: 30000, // Update every 30 seconds
        fastestInterval: 15000, // Fastest update every 15 seconds
      }
    );

    // Cleanup on unmount
    return () => {
      Geolocation.clearWatch(watchId);
    };
  };

  const updateLocationInFirebase = async (latitude: number, longitude: number) => {
    if (!user) return;

    try {
      await FirebaseService.updatePoliceLocation(user.uid, latitude, longitude);
      console.log('Police location updated in Firebase:', latitude, longitude);
    } catch (error) {
      console.error('Error updating police location:', error);
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
        onBack={handleBackToList}
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
            source={require('../../assets/logo.png')}
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
              📍 Location Tracking: 
            </Text>
            {locationEnabled && currentLocation ? (
              <View>
                <Text style={styles.locationEnabled}>✅ Active</Text>
                <Text style={styles.locationCoords}>
                  {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </Text>
              </View>
            ) : (
              <Text style={styles.locationDisabled}>❌ Disabled</Text>
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
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#2d3480',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  locationStatus: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
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
    color: '#6B7280',
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
});

export default PoliceDashboard;

