import React, { useState, useEffect, useCallback, FC } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useTheme, colors } from '../../services/themeContext';
import { styles } from './styles';
import { CrimeReportMapProps, PoliceLocation, RouteCoordinate } from './types';

const CrimeReportMap: FC<CrimeReportMapProps> = ({ reportId, crimeLocation, onClose }) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  const [policeLocation, setPoliceLocation] = useState<PoliceLocation | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapRegion] = useState({
    latitude: crimeLocation.latitude,
    longitude: crimeLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // Decode Google Maps polyline to coordinates
  const decodePolyline = useCallback((encoded: string): RouteCoordinate[] => {
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
  }, []);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
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
  }, []);

  const fetchRoute = useCallback(async (
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ) => {
    try {
      console.log('🚗 Fetching route from OSRM...', {
        from: `${originLat}, ${originLng}`,
        to: `${destLat}, ${destLng}`
      });
      
      // Use OSRM (Open Source Routing Machine) - Completely FREE, No API Key Required!
      // Note: OSRM uses (longitude, latitude) order
      const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=polyline`;
      
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
        
        console.log('📏 Using straight line distance:', straightLineDistance, 'km, ETA:', estimatedMinutes, 'min');
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
  }, [decodePolyline, calculateDistance]);

  const loadRespondingOfficer = useCallback(async () => {
    try {
      // Get the crime report to find the responding officer
      const { FirebaseService } = await import('../../services/firebaseService');
      const report = await FirebaseService.getCrimeReport(reportId);
      
      if (!report) {
        setPoliceLocation(null);
        setRouteCoordinates([]);
        setEta(null);
        setDistance(null);
        setIsLoading(false);
        return;
      }

      if (!report.respondingOfficerId) {
        setPoliceLocation(null);
        setRouteCoordinates([]);
        setEta(null);
        setDistance(null);
        setIsLoading(false);
        return;
      }

      // Get the responding officer's data
      const officer = await FirebaseService.getPoliceUser(report.respondingOfficerId);
      
      if (!officer) {
        setPoliceLocation(null);
        setRouteCoordinates([]);
        setEta(null);
        setDistance(null);
        setIsLoading(false);
        return;
      }

      if (!officer.currentLocation) {
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

      // Fetch route from OSRM API
      await fetchRoute(
        officer.currentLocation.latitude,
        officer.currentLocation.longitude,
        crimeLocation.latitude,
        crimeLocation.longitude
      );

    } catch (error) {
      console.error('Error loading responding officer:', error);
      setPoliceLocation(null);
      setRouteCoordinates([]);
      setEta(null);
      setDistance(null);
    } finally {
      setIsLoading(false);
    }
  }, [reportId, crimeLocation.latitude, crimeLocation.longitude, fetchRoute]);

  useEffect(() => {
    loadRespondingOfficer();
    // Set up real-time updates for the responding officer location
    const interval = setInterval(loadRespondingOfficer, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [reportId, loadRespondingOfficer]);


  if (isLoading) {
    return (
      <View style={styles(theme).loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles(theme).loadingText}>Loading map...</Text>
      </View>
    );
  }




  return (
    <View style={styles(theme).container}>
      {/* Header */}
      <View style={styles(theme).header}>
        <TouchableOpacity onPress={onClose} style={styles(theme).backButton}>
          <Text style={styles(theme).backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles(theme).headerTitle}>Crime Location Map</Text>
        <View style={styles(theme).headerSpacer} />
      </View>

      {/* Map */}
      <View style={styles(theme).mapContainer}>
        <MapView
          style={styles(theme).map}
          initialRegion={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
          mapType={isDarkMode ? 'satellite' : 'standard'}
          onMapReady={() => setIsLoading(false)}
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
            <View style={styles(theme).crimeMarker}>
              <Text style={styles(theme).crimeMarkerText}>🚨</Text>
            </View>
          </Marker>

          {/* Police Officer Marker */}
          {policeLocation && (
            <Marker
              coordinate={{
                latitude: policeLocation.latitude,
                longitude: policeLocation.longitude,
              }}
              title={policeLocation.name}
              description="Responding Officer"
            >
              <View style={styles(theme).policeCarMarker}>
                <Text style={styles(theme).policeCarMarkerText}>🚔</Text>
              </View>
            </Marker>
          )}

          {/* Route Polyline */}
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
      <View style={styles(theme).bottomInfo}>
        {/* Crime Information - Always show */}
        <View style={styles(theme).crimeInfo}>
          <Text style={styles(theme).crimeInfoTitle}>Crime Location</Text>
          <Text style={styles(theme).crimeInfoText}>📍 {crimeLocation.address}</Text>
          <Text style={styles(theme).crimeInfoText}>
            Coordinates: {crimeLocation.latitude.toFixed(6)}, {crimeLocation.longitude.toFixed(6)}
          </Text>
        </View>

        {/* Police Information */}
        <View style={styles(theme).policeInfo}>
          <Text style={styles(theme).policeInfoTitle}>Responding Officer</Text>
          {policeLocation ? (
            <View style={styles(theme).policeOfficer}>
              <View style={styles(theme).officerLeftInfo}>
                <Text style={styles(theme).officerName}>🚔 {policeLocation.name}</Text>
                {policeLocation.badgeNumber && (
                  <Text style={styles(theme).officerBadge}>Badge: {policeLocation.badgeNumber}</Text>
                )}
              </View>
              <View style={styles(theme).officerRightInfo}>
                {distance && (
                  <Text style={styles(theme).officerDistance}>{distance} km away</Text>
                )}
                {eta && (
                  <Text style={styles(theme).officerEta}>ETA: ~{eta} min</Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles(theme).noOfficerText}>No officer dispatched yet</Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default CrimeReportMap;
