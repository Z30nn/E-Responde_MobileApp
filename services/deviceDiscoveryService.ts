import { ref, get, set, update, onValue, off } from 'firebase/database';
import { database } from '../firebaseConfig';
import { auth } from '../firebaseConfig';
import Geolocation from '@react-native-community/geolocation';
import { FirebaseService } from './firebaseService';

export interface SmartwatchDevice {
  id: string;
  name: string;
  userId: string;
  isPaired: boolean;
  lastSeen: number;
  batteryLevel: number;
}

export interface PairingStatus {
  deviceId: string;
  isPaired: boolean;
  pairedAt?: string;
}

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export class DeviceDiscoveryService {
  private static instance: DeviceDiscoveryService;
  private listeners: { [key: string]: () => void } = {};
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private isMonitoring = false;
  private lastSOSTrigger = 0; // Timestamp of last SOS trigger to prevent spam

  static getInstance(): DeviceDiscoveryService {
    if (!DeviceDiscoveryService.instance) {
      DeviceDiscoveryService.instance = new DeviceDiscoveryService();
    }
    return DeviceDiscoveryService.instance;
  }

  // Get all unpaired smartwatch devices
  async getUnpairedDevices(): Promise<SmartwatchDevice[]> {
    try {
      console.log('DeviceDiscoveryService: Fetching unpaired devices');
      const devicesRef = ref(database, 'devices');
      const snapshot = await get(devicesRef);
      
      if (snapshot.exists()) {
        const devices: SmartwatchDevice[] = [];
        snapshot.forEach((childSnapshot) => {
          const device = childSnapshot.val() as SmartwatchDevice;
          if (!device.isPaired) {
            devices.push(device);
          }
        });
        
        console.log(`DeviceDiscoveryService: Found ${devices.length} unpaired devices`);
        return devices;
      }
      
      console.log('DeviceDiscoveryService: No devices found');
      return [];
    } catch (error) {
      console.error('DeviceDiscoveryService: Error fetching unpaired devices:', error);
      throw error;
    }
  }

  // Get user's paired devices
  async getUserPairedDevices(userId: string): Promise<SmartwatchDevice[]> {
    try {
      console.log('DeviceDiscoveryService: Fetching paired devices for user:', userId);
      
      // Get user's paired device IDs
      const userPairingsRef = ref(database, `user_pairings/${userId}/paired_devices`);
      const pairingsSnapshot = await get(userPairingsRef);
      
      if (!pairingsSnapshot.exists()) {
        console.log('DeviceDiscoveryService: No paired devices found for user');
        return [];
      }
      
      const pairedDeviceIds = Object.keys(pairingsSnapshot.val());
      console.log('DeviceDiscoveryService: Found paired device IDs:', pairedDeviceIds);
      
      // Get device details for each paired device
      const devices: SmartwatchDevice[] = [];
      for (const deviceId of pairedDeviceIds) {
        const deviceRef = ref(database, `devices/${deviceId}`);
        const deviceSnapshot = await get(deviceRef);
        
        if (deviceSnapshot.exists()) {
          const device = deviceSnapshot.val() as SmartwatchDevice;
          devices.push(device);
        }
      }
      
      console.log(`DeviceDiscoveryService: Found ${devices.length} paired devices`);
      return devices;
    } catch (error) {
      console.error('DeviceDiscoveryService: Error fetching paired devices:', error);
      throw error;
    }
  }

  // Pair with a smartwatch device
  async pairWithDevice(deviceId: string, userId: string): Promise<boolean> {
    try {
      console.log('DeviceDiscoveryService: Pairing device:', deviceId, 'with user:', userId);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to pair devices');
      }
      
      // Check if device exists and is not already paired
      const deviceRef = ref(database, `devices/${deviceId}`);
      const deviceSnapshot = await get(deviceRef);
      
      if (!deviceSnapshot.exists()) {
        throw new Error('Device not found');
      }
      
      const device = deviceSnapshot.val() as SmartwatchDevice;
      if (device.isPaired) {
        throw new Error('Device is already paired');
      }
      
      // Update device pairing status
      await update(deviceRef, {
        isPaired: true,
        pairedAt: new Date().toISOString(),
        pairedUserId: userId
      });
      
      // Add device to user's paired devices
      const userPairingRef = ref(database, `user_pairings/${userId}/paired_devices/${deviceId}`);
      await set(userPairingRef, {
        pairedAt: new Date().toISOString(),
        deviceName: device.name
      });
      
      console.log('DeviceDiscoveryService: Successfully paired device:', deviceId);
      return true;
    } catch (error) {
      console.error('DeviceDiscoveryService: Error pairing device:', error);
      throw error;
    }
  }

  // Unpair a smartwatch device
  async unpairDevice(deviceId: string, userId: string): Promise<boolean> {
    try {
      console.log('DeviceDiscoveryService: Unpairing device:', deviceId, 'from user:', userId);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to unpair devices');
      }
      
      // Check if device exists and is paired to this user
      const deviceRef = ref(database, `devices/${deviceId}`);
      const deviceSnapshot = await get(deviceRef);
      
      if (!deviceSnapshot.exists()) {
        throw new Error('Device not found');
      }
      
      const device = deviceSnapshot.val() as SmartwatchDevice;
      if (!device.isPaired || device.userId !== userId) {
        throw new Error('Device is not paired to this user');
      }
      
      // Update device pairing status
      await update(deviceRef, {
        isPaired: false,
        pairedAt: null,
        pairedUserId: null
      });
      
      // Remove device from user's paired devices
      const userPairingRef = ref(database, `user_pairings/${userId}/paired_devices/${deviceId}`);
      await set(userPairingRef, null);
      
      console.log('DeviceDiscoveryService: Successfully unpaired device:', deviceId);
      return true;
    } catch (error) {
      console.error('DeviceDiscoveryService: Error unpairing device:', error);
      throw error;
    }
  }

  // Listen for real-time updates on unpaired devices
  onUnpairedDevicesUpdate(callback: (devices: SmartwatchDevice[]) => void): () => void {
    const devicesRef = ref(database, 'devices');
    
    const listener = onValue(devicesRef, (snapshot) => {
      if (snapshot.exists()) {
        const devices: SmartwatchDevice[] = [];
        snapshot.forEach((childSnapshot) => {
          const device = childSnapshot.val() as SmartwatchDevice;
          if (!device.isPaired) {
            devices.push(device);
          }
        });
        callback(devices);
      } else {
        callback([]);
      }
    });
    
    const unsubscribe = () => {
      off(devicesRef, 'value', listener);
    };
    
    return unsubscribe;
  }

  // Listen for real-time updates on user's paired devices
  onPairedDevicesUpdate(userId: string, callback: (devices: SmartwatchDevice[]) => void): () => void {
    const userPairingsRef = ref(database, `user_pairings/${userId}/paired_devices`);
    
    const listener = onValue(userPairingsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const pairedDeviceIds = Object.keys(snapshot.val());
        const devices: SmartwatchDevice[] = [];
        
        // Get device details for each paired device
        for (const deviceId of pairedDeviceIds) {
          const deviceRef = ref(database, `devices/${deviceId}`);
          const deviceSnapshot = await get(deviceRef);
          
          if (deviceSnapshot.exists()) {
            const device = deviceSnapshot.val() as SmartwatchDevice;
            devices.push(device);
          }
        }
        
        callback(devices);
      } else {
        callback([]);
      }
    });
    
    const unsubscribe = () => {
      off(userPairingsRef, 'value', listener);
    };
    
    return unsubscribe;
  }

  // Calculate distance between two coordinates in meters (Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Update device location in Firebase
  async updateDeviceLocation(deviceId: string, location: DeviceLocation): Promise<void> {
    try {
      const deviceLocationRef = ref(database, `device_locations/${deviceId}`);
      await set(deviceLocationRef, location);
      console.log('DeviceDiscoveryService: Updated location for device:', deviceId);
    } catch (error) {
      console.error('DeviceDiscoveryService: Error updating device location:', error);
      throw error;
    }
  }

  // Get device location from Firebase
  async getDeviceLocation(deviceId: string): Promise<DeviceLocation | null> {
    try {
      const deviceLocationRef = ref(database, `device_locations/${deviceId}`);
      const snapshot = await get(deviceLocationRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as DeviceLocation;
      }
      return null;
    } catch (error) {
      console.error('DeviceDiscoveryService: Error getting device location:', error);
      throw error;
    }
  }

  // Trigger SOS report for theft
  private async triggerTheftSOS(userId: string, deviceId: string, phoneLocation: DeviceLocation): Promise<void> {
    try {
      console.log('DeviceDiscoveryService: Triggering theft SOS for device:', deviceId);
      
      // Prevent spam - only trigger once per minute
      const now = Date.now();
      if (now - this.lastSOSTrigger < 60000) {
        console.log('DeviceDiscoveryService: SOS trigger blocked - too soon since last trigger');
        return;
      }
      this.lastSOSTrigger = now;

      // Get user details for the report
      const userRef = ref(database, `civilian/civilian account/${userId}`);
      const userSnapshot = await get(userRef);
      
      let reporterName = 'Smartwatch User';
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        reporterName = userData.name || userData.email || 'Smartwatch User';
      }

      // Get address from coordinates
      let address = `${phoneLocation.latitude.toFixed(6)}, ${phoneLocation.longitude.toFixed(6)}`;
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${phoneLocation.latitude}&lon=${phoneLocation.longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'E-Responde-MobileApp/1.0',
              'Accept': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.display_name) {
            address = data.display_name;
          }
        }
      } catch (geocodeError) {
        console.log('DeviceDiscoveryService: Geocoding failed, using coordinates');
      }

      // Create theft report
      const theftReport = {
        crimeType: 'Theft',
        dateTime: new Date(),
        description: `Smartphone taken away - Smartwatch detected phone 5+ meters away from paired device`,
        multimedia: [],
        location: {
          latitude: phoneLocation.latitude,
          longitude: phoneLocation.longitude,
          address: address
        },
        barangay: 'Barangay 41', // Default or can be extracted from address
        anonymous: false,
        reporterName: reporterName,
        reporterUid: userId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        severity: 'Immediate' as const,
      };

      // Submit the crime report
      await FirebaseService.submitCrimeReport(theftReport);
      console.log('DeviceDiscoveryService: Theft SOS report submitted successfully');

      // Update device location in database for tracking
      await this.updateDeviceLocation(deviceId, phoneLocation);
    } catch (error) {
      console.error('DeviceDiscoveryService: Error triggering theft SOS:', error);
      // Don't throw - we don't want monitoring to stop if SOS fails
    }
  }

  // Start monitoring distance between smartphone and smartwatch
  startDistanceMonitoring(userId: string, deviceId: string): void {
    if (this.isMonitoring) {
      console.log('DeviceDiscoveryService: Distance monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log('DeviceDiscoveryService: Starting distance monitoring for device:', deviceId);

    // Check distance every 10 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        // Get current location of this device (smartphone)
        Geolocation.getCurrentPosition(
          async (position) => {
            const phoneLocation: DeviceLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: Date.now()
            };

            // Update phone location in database
            await this.updateDeviceLocation('phone', phoneLocation);

            // Get smartwatch location from database
            const watchLocation = await this.getDeviceLocation(deviceId);

            if (watchLocation) {
              // Calculate distance in meters
              const distance = this.calculateDistance(
                phoneLocation.latitude,
                phoneLocation.longitude,
                watchLocation.latitude,
                watchLocation.longitude
              );

              console.log(`DeviceDiscoveryService: Distance between devices: ${distance.toFixed(2)} meters`);

              // If devices are more than 5 meters apart, trigger SOS
              if (distance > 5) {
                console.log('DeviceDiscoveryService: Devices are more than 5 meters apart - triggering theft SOS');
                await this.triggerTheftSOS(userId, deviceId, phoneLocation);
              }
            } else {
              console.log('DeviceDiscoveryService: Watch location not found in database');
            }
          },
          (error) => {
            console.error('DeviceDiscoveryService: Error getting location:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 10000
          }
        );
      } catch (error) {
        console.error('DeviceDiscoveryService: Error in monitoring cycle:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  // Stop monitoring distance
  stopDistanceMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.isMonitoring = false;
      console.log('DeviceDiscoveryService: Distance monitoring stopped');
    }
  }

  // Clean up all listeners
  cleanup(): void {
    Object.values(this.listeners).forEach(unsubscribe => unsubscribe());
    this.listeners = {};
    this.stopDistanceMonitoring();
  }
}

export const deviceDiscoveryService = DeviceDiscoveryService.getInstance();
