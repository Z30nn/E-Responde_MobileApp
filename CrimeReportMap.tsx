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
  status: 'dispatched' | 'en_route' | 'arrived';
  lastUpdated: string;
}

const CrimeReportMap = ({ reportId, crimeLocation, onClose }: CrimeReportMapProps) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  const [policeLocations, setPoliceLocations] = useState<PoliceLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState({
    latitude: crimeLocation.latitude,
    longitude: crimeLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    loadPoliceLocations();
    // Set up real-time updates for police locations
    const interval = setInterval(loadPoliceLocations, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [reportId]);

  const loadPoliceLocations = async () => {
    try {
      // In a real app, this would fetch from your backend/Firebase
      // For now, we'll simulate police locations
      const mockPoliceLocations: PoliceLocation[] = [
        {
          id: 'police_1',
          latitude: crimeLocation.latitude + 0.005,
          longitude: crimeLocation.longitude + 0.005,
          name: 'Officer Johnson',
          status: 'en_route',
          lastUpdated: new Date().toISOString(),
        },
        {
          id: 'police_2',
          latitude: crimeLocation.latitude - 0.003,
          longitude: crimeLocation.longitude + 0.008,
          name: 'Officer Smith',
          status: 'dispatched',
          lastUpdated: new Date().toISOString(),
        },
      ];
      
      setPoliceLocations(mockPoliceLocations);
    } catch (error) {
      console.error('Error loading police locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPoliceMarkerColor = (status: string) => {
    switch (status) {
      case 'dispatched':
        return '#F59E0B'; // Orange
      case 'en_route':
        return '#3B82F6'; // Blue
      case 'arrived':
        return '#10B981'; // Green
      default:
        return '#6B7280'; // Gray
    }
  };

  const getPoliceStatusText = (status: string) => {
    switch (status) {
      case 'dispatched':
        return 'Dispatched';
      case 'en_route':
        return 'En Route';
      case 'arrived':
        return 'Arrived';
      default:
        return 'Unknown';
    }
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
    const distance = R * c;
    return distance;
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
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.background,
      borderRadius: 8,
      marginBottom: 8,
    },
    officerName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    officerStatus: {
      fontSize: 12,
      color: theme.secondaryText,
    },
    officerDistance: {
      fontSize: 12,
      color: theme.secondaryText,
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
          mapType={isDarkMode ? 'dark' : 'standard'}
        >
          {/* Crime Location Marker */}
          <Marker
            coordinate={{
              latitude: crimeLocation.latitude,
              longitude: crimeLocation.longitude,
            }}
            title="Crime Location"
            description={crimeLocation.address}
            pinColor="red"
          />

          {/* Police Officer Markers */}
          {policeLocations.map((officer) => (
            <Marker
              key={officer.id}
              coordinate={{
                latitude: officer.latitude,
                longitude: officer.longitude,
              }}
              title={officer.name}
              description={`Status: ${getPoliceStatusText(officer.status)}`}
              pinColor={getPoliceMarkerColor(officer.status)}
            />
          ))}

          {/* Polylines showing routes from police to crime location */}
          {policeLocations.map((officer) => (
            <Polyline
              key={`route_${officer.id}`}
              coordinates={[
                {
                  latitude: officer.latitude,
                  longitude: officer.longitude,
                },
                {
                  latitude: crimeLocation.latitude,
                  longitude: crimeLocation.longitude,
                },
              ]}
              strokeColor={getPoliceMarkerColor(officer.status)}
              strokeWidth={2}
              lineDashPattern={[5, 5]}
            />
          ))}
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
          <Text style={styles.policeInfoTitle}>Responding Officers</Text>
          {policeLocations.length > 0 ? (
            policeLocations.map((officer) => {
              const distance = calculateDistance(
                officer.latitude,
                officer.longitude,
                crimeLocation.latitude,
                crimeLocation.longitude
              );
              return (
                <View key={officer.id} style={styles.policeOfficer}>
                  <View>
                    <Text style={styles.officerName}>{officer.name}</Text>
                    <Text style={styles.officerStatus}>
                      Status: {getPoliceStatusText(officer.status)}
                    </Text>
                  </View>
                  <Text style={styles.officerDistance}>
                    {distance.toFixed(1)} km away
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.crimeInfoText}>No officers dispatched yet</Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default CrimeReportMap;
