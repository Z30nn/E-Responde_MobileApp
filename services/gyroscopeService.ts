// import { DeviceMotion } from 'expo-sensors';

export interface GyroscopeData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface ShakeDetectionConfig {
  threshold: number; // Minimum acceleration to trigger shake
  timeout: number; // Minimum time between shake detections (ms)
  requiredShakes: number; // Number of consecutive shakes required
}

class GyroscopeService {
  private isListening = false;
  private lastShakeTime = 0;
  private shakeCount = 0;
  private onShakeCallback: (() => void) | null = null;
  private config: ShakeDetectionConfig = {
    threshold: 15, // Adjust sensitivity
    timeout: 1000, // 1 second between shake detections
    requiredShakes: 3, // Require 3 quick shakes
  };

  constructor() {
    this.setUpdateInterval(100); // Update every 100ms for responsiveness
  }

  private setUpdateInterval(interval: number) {
    // DeviceMotion.setUpdateInterval(interval);
    console.log('GyroscopeService: Update interval set to', interval);
  }

  public startListening(onShake: () => void) {
    if (this.isListening) {
      console.log('GyroscopeService: Already listening');
      return;
    }

    this.onShakeCallback = onShake;
    this.isListening = true;
    this.lastShakeTime = 0;
    this.shakeCount = 0;

    console.log('GyroscopeService: Starting gyroscope listening (disabled for development)');

    // DeviceMotion.addListener((motionData) => {
    //   this.handleMotionData(motionData);
    // });
  }

  public stopListening() {
    if (!this.isListening) {
      console.log('GyroscopeService: Not currently listening');
      return;
    }

    console.log('GyroscopeService: Stopping gyroscope listening');
    // DeviceMotion.removeAllListeners();
    this.isListening = false;
    this.onShakeCallback = null;
    this.shakeCount = 0;
  }

  private handleMotionData(motionData: any) {
    if (!this.isListening || !this.onShakeCallback) return;

    const { acceleration } = motionData;
    if (!acceleration) return;

    const { x, y, z } = acceleration;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const currentTime = Date.now();

    // Check if this is a significant shake
    if (magnitude > this.config.threshold) {
      // Check if enough time has passed since last shake
      if (currentTime - this.lastShakeTime > 200) { // 200ms between shakes
        this.shakeCount++;
        this.lastShakeTime = currentTime;

        console.log(`GyroscopeService: Shake detected (${this.shakeCount}/${this.config.requiredShakes})`);

        // Check if we've reached the required number of shakes
        if (this.shakeCount >= this.config.requiredShakes) {
          console.log('GyroscopeService: Required shakes detected, triggering SOS');
          this.onShakeCallback();
          this.shakeCount = 0; // Reset counter
        }
      }
    } else {
      // Reset shake count if no shake for too long
      if (currentTime - this.lastShakeTime > this.config.timeout) {
        this.shakeCount = 0;
      }
    }
  }

  public updateConfig(newConfig: Partial<ShakeDetectionConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('GyroscopeService: Config updated', this.config);
  }

  public isActive(): boolean {
    return this.isListening;
  }

  public getConfig(): ShakeDetectionConfig {
    return { ...this.config };
  }
}

export const gyroscopeService = new GyroscopeService();