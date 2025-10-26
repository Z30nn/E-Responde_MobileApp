import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import { FirebaseService } from '../../services/firebaseService';
import { database } from '../../firebaseConfig';
import { ref, get } from 'firebase/database';

interface PoliceCrimeReportMapProps {
  reportId: string;
  crimeLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  crimeType: string;
  reporterUid: string;
  onClose: () => void;
}

interface PoliceLocation {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  lastUpdated: string;
}

interface CivilianLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

const PoliceCrimeReportMap = ({ 
  reportId, 
  crimeLocation, 
  crimeType, 
  _reporterUid,
  onClose 
}: PoliceCrimeReportMapProps) => {
  const [policeLocations, setPoliceLocations] = useState<PoliceLocation[]>([]);
  const [civilianLocation, setCivilianLocation] = useState<CivilianLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState<{ [key: string]: RouteCoordinate[] }>({});
  const [etaMap, setEtaMap] = useState<{ [key: string]: number }>({});
  const [distanceMap, setDistanceMap] = useState<{ [key: string]: number }>({});
  const [mapRegion] = useState({
    latitude: crimeLocation.latitude,
    longitude: crimeLocation.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  const isSOSReport = crimeType.toLowerCase().includes('sos') || crimeType.toLowerCase().includes('emergency');

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
    const distance = R * c;
    return parseFloat(distance.toFixed(2));
  }, []);

  const fetchRoute = useCallback(async (
    officerId: string,
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ) => {
    try {
      // Use OSRM (Open Source Routing Machine) - Completely FREE, No API Key Required!
      // Note: OSRM uses (longitude, latitude) order
      const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=polyline`;
      
      const response = await fetch(url);
      const result = await response.json();

      if (result.code === 'Ok' && result.routes && result.routes.length > 0) {
        const route = result.routes[0];
        
        // Decode the polyline to get route coordinates
        const points = decodePolyline(route.geometry);
        setRouteCoordinates(prev => ({ ...prev, [officerId]: points }));

        // Get duration (in seconds) and distance (in meters) from OSRM
        const durationInMinutes = Math.ceil(route.duration / 60);
        const distanceInKm = parseFloat((route.distance / 1000).toFixed(2));
        
        setEtaMap(prev => ({ ...prev, [officerId]: durationInMinutes }));
        setDistanceMap(prev => ({ ...prev, [officerId]: distanceInKm }));
        
      } else {
        
        // Fallback to straight line
        setRouteCoordinates(prev => ({
          ...prev,
          [officerId]: [
            { latitude: originLat, longitude: originLng },
            { latitude: destLat, longitude: destLng },
          ]
        }));
        
        const straightLineDistance = calculateDistance(originLat, originLng, destLat, destLng);
        setDistanceMap(prev => ({ ...prev, [officerId]: straightLineDistance }));
        const estimatedMinutes = Math.ceil((straightLineDistance / 40) * 60);
        setEtaMap(prev => ({ ...prev, [officerId]: estimatedMinutes }));
      }
    } catch (error) {
      console.error('Error fetching route for officer', officerId, ':', error);
      
      // Fallback to straight line
      setRouteCoordinates(prev => ({
        ...prev,
        [officerId]: [
          { latitude: originLat, longitude: originLng },
          { latitude: destLat, longitude: destLng },
        ]
      }));
      
      const straightLineDistance = calculateDistance(originLat, originLng, destLat, destLng);
      setDistanceMap(prev => ({ ...prev, [officerId]: straightLineDistance }));
      const estimatedMinutes = Math.ceil((straightLineDistance / 40) * 60);
      setEtaMap(prev => ({ ...prev, [officerId]: estimatedMinutes }));
    }
  }, [decodePolyline, calculateDistance]);

  const loadPoliceLocations = useCallback(async () => {
    try {
      // Get the crime report first to verify it exists
      const crimeReport = await FirebaseService.getCrimeReport(reportId);
      
      if (!crimeReport) {
        setPoliceLocations([]);
        return;
      }
      
      // Find the police officer assigned to this report by checking all police officers' current assignments
      const allPoliceOfficers = await FirebaseService.getAllPoliceLocations();
      
      let assignedOfficer = null;
      for (const officer of allPoliceOfficers) {
        // Check if this officer has this reportId in their current assignment
        const assignmentRef = ref(database, `police/police account/${officer.uid}/currentAssignment`);
        const assignmentSnapshot = await get(assignmentRef);
        
        if (assignmentSnapshot.exists()) {
          const assignment = assignmentSnapshot.val();
          if (assignment.reportId === reportId) {
            assignedOfficer = officer;
            break;
          }
        }
      }
      
      if (!assignedOfficer || !assignedOfficer.currentLocation) {
        setPoliceLocations([]);
        return;
      }
      
      const name = assignedOfficer.firstName && assignedOfficer.lastName 
        ? `${assignedOfficer.firstName} ${assignedOfficer.lastName}` 
        : assignedOfficer.badgeNumber 
          ? `Officer ${assignedOfficer.badgeNumber}` 
          : 'Assigned Officer';
      
      const location: PoliceLocation = {
        id: assignedOfficer.uid,
        latitude: assignedOfficer.currentLocation.latitude,
        longitude: assignedOfficer.currentLocation.longitude,
        name: name,
        lastUpdated: assignedOfficer.currentLocation.lastUpdated,
      };
      
      setPoliceLocations([location]);

      // Fetch route for the assigned officer
      await fetchRoute(
        location.id,
        location.latitude,
        location.longitude,
        crimeLocation.latitude,
        crimeLocation.longitude
      );
    } catch (error) {
      console.error('Error loading police locations:', error);
    }
  }, [reportId, crimeLocation.latitude, crimeLocation.longitude, fetchRoute]);

  const loadCivilianLocation = useCallback(async () => {
    try {
      
      // For SOS reports, we use the crime report location as the civilian's location
      // since SOS captures the user's current location at the time of the alert
      setCivilianLocation({
        latitude: crimeLocation.latitude,
        longitude: crimeLocation.longitude,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error loading civilian location:', error);
    }
  }, [crimeLocation.latitude, crimeLocation.longitude]);

  const loadMapData = useCallback(async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadPoliceLocations(),
        isSOSReport ? loadCivilianLocation() : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Error loading map data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadPoliceLocations, isSOSReport, loadCivilianLocation]);

  useEffect(() => {
    loadMapData();
    // Set up real-time updates for police locations
    const interval = setInterval(loadPoliceLocations, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [loadMapData, loadPoliceLocations]);

  // Find closest police officer
  const getClosestOfficer = () => {
    if (policeLocations.length === 0) return null;
    
    let closest = policeLocations[0];
    let minDistance = distanceMap[closest.id] || calculateDistance(
      closest.latitude,
      closest.longitude,
      crimeLocation.latitude,
      crimeLocation.longitude
    );

    policeLocations.forEach((officer) => {
      const distance = distanceMap[officer.id] || calculateDistance(
        officer.latitude,
        officer.longitude,
        crimeLocation.latitude,
        crimeLocation.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        closest = officer;
      }
    });

    return { officer: closest, distance: minDistance };
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2d3480" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  const closestOfficerInfo = getClosestOfficer();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSOSReport ? 'SOS Alert Location' : 'Crime Location'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
          onMapReady={() => setIsLoading(false)}
        >
          {/* Crime Location Marker */}
          <Marker
            coordinate={{
              latitude: crimeLocation.latitude,
              longitude: crimeLocation.longitude,
            }}
            title={isSOSReport ? "SOS Alert Location" : "Crime Location"}
            description={crimeLocation.address}
          >
            <View style={styles.crimeMarker}>
              <Text style={styles.crimeMarkerText}>{isSOSReport ? "!" : "!"}</Text>
            </View>
          </Marker>

          {/* Circle around SOS location */}
          {isSOSReport && (
            <Circle
              center={{
                latitude: crimeLocation.latitude,
                longitude: crimeLocation.longitude,
              }}
              radius={100} // 100 meters
              fillColor="rgba(239, 68, 68, 0.2)"
              strokeColor="rgba(239, 68, 68, 0.5)"
              strokeWidth={2}
            />
          )}

          {/* Civilian User Location Marker (for SOS reports) */}
          {isSOSReport && civilianLocation && (
            <Marker
              coordinate={{
                latitude: civilianLocation.latitude,
                longitude: civilianLocation.longitude,
              }}
              title="Civilian User Location"
              description="Last known location of the person in distress"
            >
              <View style={styles.civilianMarker}>
                <Text style={styles.civilianMarkerText}>👤</Text>
              </View>
            </Marker>
          )}

          {/* Police Officer Markers */}
          {policeLocations.map((officer) => (
            <Marker
              key={officer.id}
              coordinate={{
                latitude: officer.latitude,
                longitude: officer.longitude,
              }}
              title={officer.name}
              description="Police Officer"
            >
              <View style={styles.policeCarMarker}>
                <Text style={styles.policeCarMarkerText}>P</Text>
              </View>
            </Marker>
          ))}

          {/* Polylines showing routes from police to crime location */}
          {policeLocations.map((officer) => {
            const coords = routeCoordinates[officer.id] || [];
            if (coords.length > 0) {
              return (
                <Polyline
                  key={`route_${officer.id}`}
                  coordinates={coords}
                  strokeColor="#3B82F6"
                  strokeWidth={3}
                />
              );
            }
            return null;
          })}
        </MapView>
      </View>

      {/* Bottom Information Panel */}
      <View style={styles.bottomInfo}>
        {/* Crime Information */}
        <View style={styles.crimeInfo}>
          <Text style={styles.crimeInfoTitle}>
            {isSOSReport ? 'SOS Emergency Alert' : 'Crime Location'}
          </Text>
          <Text style={styles.crimeInfoText}>{crimeLocation.address}</Text>
          <Text style={styles.crimeInfoText}>
            Coordinates: {crimeLocation.latitude.toFixed(6)}, {crimeLocation.longitude.toFixed(6)}
          </Text>
          {isSOSReport && (
            <View style={styles.sosAlert}>
              <Text style={styles.sosAlertText}>IMMEDIATE RESPONSE REQUIRED</Text>
            </View>
          )}
        </View>

        {/* Police Information */}
        <View style={styles.policeInfo}>
          <Text style={styles.policeInfoTitle}>
            {closestOfficerInfo ? 'Nearest Officer' : 'No Officers Available'}
          </Text>
          {closestOfficerInfo ? (
            <View style={styles.policeOfficer}>
              <View>
                <Text style={styles.officerName}>{closestOfficerInfo.officer.name}</Text>
                <Text style={styles.officerStatus}>Available</Text>
              </View>
              <View style={styles.officerRightInfo}>
                <Text style={styles.officerDistance}>
                  {closestOfficerInfo.distance.toFixed(2)} km away
                </Text>
                {etaMap[closestOfficerInfo.officer.id] && (
                  <Text style={styles.officerEta}>
                    ETA: ~{etaMap[closestOfficerInfo.officer.id]} min
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.crimeInfoText}>No officers currently tracking location</Text>
          )}

          {policeLocations.length === 0 && (
            <Text style={styles.noOfficerText}>
              No officer assigned to this report
            </Text>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 20,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  civilianMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F59E0B',
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
  civilianMarkerText: {
    fontSize: 18,
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
  bottomInfo: {
    backgroundColor: '#2A2A2A',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#404040',
    maxHeight: '40%',
  },
  crimeInfo: {
    marginBottom: 16,
  },
  crimeInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  crimeInfoText: {
    fontSize: 14,
    color: '#D0D0D0',
    marginBottom: 4,
  },
  sosAlert: {
    backgroundColor: '#3A1A1A',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  sosAlertText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
    textAlign: 'center',
  },
  policeInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  policeInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  policeOfficer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    marginBottom: 8,
  },
  officerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  officerStatus: {
    fontSize: 12,
    color: '#10B981',
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
    color: '#A0A0A0',
    marginTop: 2,
  },
  noOfficerText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#A0A0A0',
  },
});

export default PoliceCrimeReportMap;
