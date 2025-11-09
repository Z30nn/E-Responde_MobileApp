import { Alert, Platform, PermissionsAndroid, ToastAndroid, Vibration } from 'react-native';
import { EmergencyContactsService } from './emergencyContactsService';
import { FirebaseService } from './firebaseService';
import { auth } from '../firebaseConfig';
import Geolocation from '@react-native-community/geolocation';
import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';

// Use react-native-sensors for OPPO A74 compatibility
let accelerometerSubscription: any = null;
let isSensorAvailable = true; // Assume available for OPPO A74

console.log('GyroscopeService: Using react-native-sensors for accelerometer');

export interface GyroscopeData {
  x: number;
  y: number;
  z: number;
}

export interface ShakeDetectionConfig {
  threshold: number;
  timeout: number;
  requiredShakes: number;
}

export interface GyroscopeCallbacks {
  onNavigateToSOS?: () => void;
  onTriggerSOSCountdown?: () => void; // Trigger the SOS module's existing countdown
  onSOSAlertSent?: (result: { success: boolean; sentTo: number }) => void;
  onError?: (error: string) => void;
  onCancelled?: () => void;
}

class GyroscopeService {
  private isListening = false;
  private lastShakeTime = 0;
  private shakeCount = 0;
  private onShakeCallback: (() => void) | null = null;
  private callbacks: GyroscopeCallbacks = {};
  private isEnabled = true; // Battery optimization setting
  private config: ShakeDetectionConfig = {
    threshold: 15, // Adjust sensitivity
    timeout: 1000, // 1 second between shake detections
    requiredShakes: 3, // Require 3 quick shakes
  };
  private cachedUserType: 'civilian' | 'police' | null = null;
  private userTypeLastChecked = 0;

  constructor() {
    console.log('GyroscopeService: Constructor called - using react-native-sensors');
    // Set update interval for accelerometer
    setUpdateIntervalForType(SensorTypes.accelerometer, 100);
  }

  private async ensureUserType(uid: string, force = false): Promise<'civilian' | 'police' | null> {
    const now = Date.now();
    if (!force && this.cachedUserType !== null && now - this.userTypeLastChecked < 5 * 60 * 1000) {
      return this.cachedUserType;
    }

    try {
      const type = await FirebaseService.getUserType(uid);
      this.cachedUserType = type;
      this.userTypeLastChecked = Date.now();
      return type;
    } catch (error) {
      console.error('GyroscopeService: Failed to determine user type', error);
      this.userTypeLastChecked = Date.now();
      return this.cachedUserType;
    }
  }

  public async startListening(onShake: () => void, callbacks?: GyroscopeCallbacks) {
    try {
      if (this.isListening) {
        console.log('GyroscopeService: Already listening');
        return;
      }

      // Check if current user is a police officer - prevent SOS for police
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userType = await this.ensureUserType(currentUser.uid, true);
        if (userType === 'police') {
          console.log('GyroscopeService: Police user detected - SOS functionality disabled for police officers');
          this.isListening = false;
          return;
        }
      } else {
        this.cachedUserType = null;
      }

      // Always store the callbacks and callback function, even if disabled
      this.onShakeCallback = onShake;
      this.callbacks = callbacks || {};
      this.lastShakeTime = 0;
      this.shakeCount = 0;

      if (!this.isEnabled) {
        console.log('GyroscopeService: Gyroscope is disabled in settings - not starting accelerometer');
        this.isListening = false;
        return;
      }

      this.isListening = true;
      console.log('GyroscopeService: Starting accelerometer listening');

      // Subscribe to accelerometer data
      accelerometerSubscription = accelerometer.subscribe(({ x, y, z }) => {
        this.handleMotionData({ x, y, z });
      });

      console.log('GyroscopeService: Accelerometer listening started successfully');
    } catch (error) {
      console.error('GyroscopeService: Error starting accelerometer:', error);
      this.isListening = false;
      if (this.callbacks.onError) {
        this.callbacks.onError('Failed to start accelerometer: ' + String(error));
      }
    }
  }

  public stopListening() {
    if (!this.isListening) {
      console.log('GyroscopeService: Not currently listening');
      return;
    }

    console.log('GyroscopeService: Stopping accelerometer listening');

    try {
      if (accelerometerSubscription) {
        accelerometerSubscription.unsubscribe();
        accelerometerSubscription = null;
      }
    } catch (error) {
      console.error('GyroscopeService: Error stopping accelerometer:', error);
    }

    this.isListening = false;
    // Don't clear onShakeCallback and callbacks so we can restart later
    this.shakeCount = 0;
  }

  private async handleMotionData(data: { x: number; y: number; z: number }) {
    if (!this.isListening || !this.onShakeCallback) return;

    // Double-check: Verify user is not a police officer before triggering SOS
    if (this.cachedUserType === 'police') {
      return;
    }

    const currentUser = auth.currentUser;
    if (currentUser && this.cachedUserType === null && Date.now() - this.userTypeLastChecked > 5 * 60 * 1000) {
      this.ensureUserType(currentUser.uid, true).catch((error) => {
        console.error('GyroscopeService: Error refreshing user type in motion handler', error);
      });
    }

    const { x, y, z } = data;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const currentTime = Date.now();

    // Check if this is a significant shake
    if (magnitude > this.config.threshold) {
      // Check if enough time has passed since last shake
      if (currentTime - this.lastShakeTime > 200) { // 200ms between shakes
        this.shakeCount++;
        this.lastShakeTime = currentTime;

        console.log(`GyroscopeService: Shake ${this.shakeCount}/${this.config.requiredShakes} detected - magnitude: ${magnitude.toFixed(2)}`);

        // Check if we've reached the required number of shakes
        if (this.shakeCount >= this.config.requiredShakes) {
          console.log('GyroscopeService: Triple shake detected, triggering SOS');
          this.shakeCount = 0; // Reset counter
          this.startSOSCountdown();
        }
      }
    } else {
      // Reset shake count if no shake for too long
      if (currentTime - this.lastShakeTime > this.config.timeout) {
        if (this.shakeCount > 0) {
          console.log('GyroscopeService: Shake timeout, resetting count');
          this.shakeCount = 0;
        }
      }
    }
  }

  private startSOSCountdown() {
    console.log('GyroscopeService: Triple shake detected - triggering SOS alert directly');
    
    // Vibrate to give user feedback that triple shake was detected
    Vibration.vibrate([0, 200, 100, 200]); // Short-short-long vibration pattern
    
    // Navigate to SOS screen first
    if (this.callbacks.onNavigateToSOS) {
      this.callbacks.onNavigateToSOS();
    }

    // Show toast notification
    if (Platform.OS === 'android') {
      ToastAndroid.show('Triple shake detected! Triggering SOS alert...', ToastAndroid.LONG);
    }

    // Trigger the SOS alert directly with 5-second countdown
    this.triggerSOSAlertWithCountdown();
  }

  private async triggerSOSAlertWithCountdown() {
    try {
      console.log('GyroscopeService: Triggering SOS alert using SOS module logic');

      // Check if user is logged in
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('GyroscopeService: No user logged in');
        if (this.callbacks.onError) {
          this.callbacks.onError('You must be logged in to send SOS alerts');
        }
        return;
      }

      // Check if user has emergency contacts
      const emergencyContacts = await EmergencyContactsService.getUserEmergencyContacts(currentUser.uid);
      const primaryContacts = emergencyContacts.filter(contact => contact.isPrimary);
      
      if (primaryContacts.length === 0) {
        console.warn('GyroscopeService: No primary emergency contacts');
        Alert.alert(
          'No Emergency Contacts',
          'Please add emergency contacts in your profile to use the shake-to-SOS feature.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Instead of creating our own countdown, trigger the SOS module's handleSOSPress
      // This will use the same logic as the SOS tab with the 5-second countdown and cancellation
      if (this.callbacks.onTriggerSOSCountdown) {
        console.log('GyroscopeService: Triggering SOS module countdown');
        this.callbacks.onTriggerSOSCountdown();
      } else {
        console.error('GyroscopeService: onTriggerSOSCountdown callback not available');
        if (this.callbacks.onError) {
          this.callbacks.onError('SOS module integration not available');
        }
      }

    } catch (error) {
      console.error('GyroscopeService: Error in triggerSOSAlertWithCountdown:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Failed to trigger SOS alert: ' + String(error));
      }
    }
  }

  private async sendSOSAlert() {
    try {
      console.log('GyroscopeService: Sending SOS alert');

      // Show toast
      if (Platform.OS === 'android') {
        ToastAndroid.show('Sending SOS Alert...', ToastAndroid.LONG);
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Use the same approach as the SOS tab - let EmergencyContactsService handle everything
      const result = await EmergencyContactsService.sendSOSAlert(
        currentUser.uid,
        'Emergency SOS triggered by shake detection'
      );

      console.log('GyroscopeService: SOS alert sent to contacts:', result);

      // Notify callback
      if (this.callbacks.onSOSAlertSent) {
        this.callbacks.onSOSAlertSent(result);
      }

      // Show success message
      Alert.alert(
        'SOS Alert Sent',
        `Your SOS alert has been sent to ${result.sentTo} emergency contact(s) with your current location.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('GyroscopeService: Error in sendSOSAlert:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Failed to send SOS alert: ' + String(error));
      }
    }
  }

  private async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return true; // iOS handles permissions differently
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission Required',
          message: 'E-Responde needs access to your location for SOS alerts',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('GyroscopeService: Error requesting location permission:', error);
      return false;
    }
  }

  public updateConfig(newConfig: Partial<ShakeDetectionConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('GyroscopeService: Config updated', this.config);
  }

  public isActive(): boolean {
    return this.isListening;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log('GyroscopeService: Shake-to-SOS', enabled ? 'enabled' : 'disabled');
    console.log('GyroscopeService: Current state - isListening:', this.isListening, 'hasCallback:', !!this.onShakeCallback);
    
    if (!enabled && this.isListening) {
      // Stop the accelerometer subscription when disabled
      console.log('GyroscopeService: Stopping listening (disabled)');
      this.stopListening();
    } else if (enabled && this.onShakeCallback) {
      // Start or restart listening when enabled
      console.log('GyroscopeService: Starting/restarting listening after enabling');
      this.startListening(this.onShakeCallback, this.callbacks);
    } else if (enabled && !this.onShakeCallback) {
      console.log('GyroscopeService: Cannot restart - no callback available');
    }
  }

  public isGyroscopeEnabled(): boolean {
    return this.isEnabled;
  }

  public isGyroscopeAvailable(): boolean {
    // For OPPO A74 and modern devices, accelerometer is available
    return isSensorAvailable;
  }


  public getSensorStatus(): { deviceMotion: boolean; available: boolean; module: string } {
    return {
      deviceMotion: true,
      available: isSensorAvailable,
      module: 'react-native-sensors (accelerometer)'
    };
  }
}

export const gyroscopeService = new GyroscopeService();
