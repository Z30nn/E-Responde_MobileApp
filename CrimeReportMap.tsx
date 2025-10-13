import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useTheme, colors } from './services/themeContext';

interface CrimeReportMapProps {
  reportId: string;
  crimeLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  onClose: () => void;
}

interface PoliceLocation {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  badgeNumber?: string;
  lastUpdated: string;
}

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

const CrimeReportMap = ({ reportId, crimeLocation, onClose }: CrimeReportMapProps) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  const [policeLocation, setPoliceLocation] = useState<PoliceLocation | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState({
    latitude: crimeLocation.latitude,
    longitude: crimeLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    loadRespondingOfficer();
    // Set up real-time updates for the responding officer location
    const interval = setInterval(loadRespondingOfficer, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [reportId]);

  const loadRespondingOfficer = async () => {
    try {
      // Get the crime report to find the responding officer
      const { FirebaseService } = await import('./services/firebaseService');
      const report = await FirebaseService.getCrimeReport(reportId);
      
      if (!report || !report.respondingOfficerId) {
        console.log('No responding officer assigned yet');
        setPoliceLocation(null);
        setRouteCoordinates([]);
        setEta(null);
        setDistance(null);
        setIsLoading(false);
        return;
      }

      // Get the responding officer's data
      const officer = await FirebaseService.getPoliceUser(report.respondingOfficerId);
      
      if (!officer || !officer.currentLocation) {
        console.log('Officer location not available');
        setPoliceLocation(null);
        setRouteCoordinates([]);
        setEta(null);
        setDistance(null);
        setIsLoading(false);
        return;
      }

      const officerName = officer.firstName && officer.lastName 
        ? `${officer.firstName} ${officer.lastName}` 
        : officer.badgeNumber 
          ? `Officer ${officer.badgeNumber}` 
          : 'Police Officer';

      const location: PoliceLocation = {
        id: officer.uid,
        latitude: officer.currentLocation.latitude,
        longitude: officer.currentLocation.longitude,
        name: officerName,
        badgeNumber: officer.badgeNumber,
        lastUpdated: officer.currentLocation.lastUpdated,
      };

      setPoliceLocation(location);

      // Fetch route from Google Directions API
      await fetchRoute(
        officer.currentLocation.latitude,
        officer.currentLocation.longitude,
        crimeLocation.latitude,
        crimeLocation.longitude
      );

    } catch (error) {
      console.error('Error loading responding officer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoute = async (
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ) => {
    try {
      // Use OSRM (Open Source Routing Machine) - Completely FREE, No API Key Required!
      // Note: OSRM uses (longitude, latitude) order
      const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=polyline`;
      
      console.log('🚗 Fetching route from OSRM (Free Routing API)...');
      const response = await fetch(url);
      const result = await response.json();

      if (result.code === 'Ok' && result.routes && result.routes.length > 0) {
        const route = result.routes[0];
        
        // Decode the polyline to get route coordinates
        const points = decodePolyline(route.geometry);
        setRouteCoordinates(points);

        // Get duration (in seconds) and distance (in meters) from OSRM
        const durationInMinutes = Math.ceil(route.duration / 60);
        const distanceInKm = parseFloat((route.distance / 1000).toFixed(2));
        
        setEta(durationInMinutes);
        setDistance(distanceInKm);
        
        console.log('✅ Route found! Distance:', distanceInKm, 'km, ETA:', durationInMinutes, 'min');
      } else {
        // Fallback to straight line if routing fails
        console.warn('⚠️ OSRM routing failed, using straight line. Status:', result.code);
        setRouteCoordinates([
          { latitude: originLat, longitude: originLng },
          { latitude: destLat, longitude: destLng },
        ]);
        
        // Calculate straight-line distance and estimate ETA
        const straightLineDistance = calculateDistance(originLat, originLng, destLat, destLng);
        setDistance(straightLineDistance);
        
        // Estimate ETA: assume average speed of 40 km/h in city
        const estimatedMinutes = Math.ceil((straightLineDistance / 40) * 60);
        setEta(estimatedMinutes);
      }
    } catch (error) {
      console.error('❌ Error fetching route from OSRM:', error);
      
      // Fallback to straight line
      setRouteCoordinates([
        { latitude: originLat, longitude: originLng },
        { latitude: destLat, longitude: destLng },
      ]);
      
      const straightLineDistance = calculateDistance(originLat, originLng, destLat, destLng);
      setDistance(straightLineDistance);
      const estimatedMinutes = Math.ceil((straightLineDistance / 40) * 60);
      setEta(estimatedMinutes);
    }
  };

  // Decode Google Maps polyline to coordinates
  const decodePolyline = (encoded: string): RouteCoordinate[] => {
    const poly: RouteCoordinate[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return poly;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceCalc = R * c;
    return parseFloat(distanceCalc.toFixed(2));
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      backgroundColor: theme.menuBackground,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 8,
    },
    backButtonText: {
      fontSize: 16,
      color: theme.primary,
      fontWeight: '600',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.primary,
    },
    headerSpacer: {
      width: 60,
    },
    mapContainer: {
      flex: 1,
    },
    map: {
      flex: 1,
    },
    bottomInfo: {
      backgroundColor: theme.menuBackground,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    crimeInfo: {
      marginBottom: 16,
    },
    crimeInfoTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 8,
    },
    crimeInfoText: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 4,
    },
    policeInfo: {
      marginTop: 16,
    },
    policeInfoTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 12,
    },
    policeOfficer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: theme.background,
      borderRadius: 8,
      marginBottom: 8,
    },
    officerLeftInfo: {
      flex: 1,
    },
    officerName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    officerBadge: {
      fontSize: 12,
      color: theme.secondaryText,
      marginTop: 2,
    },
    officerRightInfo: {
      alignItems: 'flex-end',
    },
    officerDistance: {
      fontSize: 14,
      color: '#3B82F6',
      fontWeight: '600',
    },
    officerEta: {
      fontSize: 12,
      color: theme.secondaryText,
      marginTop: 2,
    },
    noOfficerText: {
      fontSize: 14,
      color: theme.secondaryText,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.secondaryText,
    },
    policeCarMarker: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#3B82F6',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 5,
    },
    policeCarMarkerText: {
      fontSize: 20,
    },
    crimeMarker: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#EF4444',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 5,
    },
    crimeMarkerText: {
      fontSize: 20,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crime Location Map</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
          mapType={isDarkMode ? 'satellite' : 'standard'}
        >
          {/* Crime Location Marker */}
          <Marker
            coordinate={{
              latitude: crimeLocation.latitude,
              longitude: crimeLocation.longitude,
            }}
            title="Crime Location"
            description={crimeLocation.address}
          >
            <View style={styles.crimeMarker}>
              <Text style={styles.crimeMarkerText}>🚨</Text>
            </View>
          </Marker>

          {/* Police Officer Marker - Only if officer is assigned */}
          {policeLocation && (
            <Marker
              coordinate={{
                latitude: policeLocation.latitude,
                longitude: policeLocation.longitude,
              }}
              title={policeLocation.name}
              description="Responding Officer"
            >
              <View style={styles.policeCarMarker}>
                <Text style={styles.policeCarMarkerText}>🚔</Text>
              </View>
            </Marker>
          )}

          {/* Route Polyline - Only if officer is assigned */}
          {policeLocation && routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#3B82F6"
              strokeWidth={3}
            />
          )}
        </MapView>
      </View>

      {/* Bottom Information Panel */}
      <View style={styles.bottomInfo}>
        {/* Crime Information */}
        <View style={styles.crimeInfo}>
          <Text style={styles.crimeInfoTitle}>Crime Location</Text>
          <Text style={styles.crimeInfoText}>📍 {crimeLocation.address}</Text>
          <Text style={styles.crimeInfoText}>
            Coordinates: {crimeLocation.latitude.toFixed(6)}, {crimeLocation.longitude.toFixed(6)}
          </Text>
        </View>

        {/* Police Information */}
        <View style={styles.policeInfo}>
          <Text style={styles.policeInfoTitle}>Responding Officer</Text>
          {policeLocation ? (
            <View style={styles.policeOfficer}>
              <View style={styles.officerLeftInfo}>
                <Text style={styles.officerName}>🚔 {policeLocation.name}</Text>
                {policeLocation.badgeNumber && (
                  <Text style={styles.officerBadge}>Badge: {policeLocation.badgeNumber}</Text>
                )}
              </View>
              <View style={styles.officerRightInfo}>
                {distance && (
                  <Text style={styles.officerDistance}>{distance} km away</Text>
                )}
                {eta && (
                  <Text style={styles.officerEta}>ETA: ~{eta} min</Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.noOfficerText}>No officer dispatched yet</Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default CrimeReportMap;
