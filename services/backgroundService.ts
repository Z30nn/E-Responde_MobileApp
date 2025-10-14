import { AppState, AppStateStatus } from 'react-native';
import { gyroscopeService } from './gyroscopeService';
import { DeviceMotion } from 'expo-sensors';

export interface BackgroundServiceConfig {
  enableBackgroundGyroscope: boolean;
  backgroundCheckInterval: number;
}

class BackgroundService {
  private isRunning = false;
  private appState: AppStateStatus = 'active';
  private backgroundTimer: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private config: BackgroundServiceConfig = {
    enableBackgroundGyroscope: true,
    backgroundCheckInterval: 1000, // Check every second in background
  };

  constructor() {
    this.setupAppStateListener();
  }

  private setupAppStateListener() {
    // Use the new addEventListener API for newer React Native versions
    if (AppState.addEventListener) {
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    } else {
      // Fallback for older versions
      AppState.addEventListener('change', this.handleAppStateChange);
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    console.log('BackgroundService: App state changed from', this.appState, 'to', nextAppState);
    
    if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      this.onAppForeground();
    } else if (this.appState === 'active' && nextAppState.match(/inactive|background/)) {
      // App has gone to the background
      this.onAppBackground();
    }
    
    this.appState = nextAppState;
  };

  private onAppForeground() {
    console.log('BackgroundService: App came to foreground');
    this.stopBackgroundMonitoring();
    // Gyroscope will be handled by the main app components
  }

  private onAppBackground() {
    console.log('BackgroundService: App went to background');
    if (this.config.enableBackgroundGyroscope) {
      this.startBackgroundMonitoring();
    }
  }

  private startBackgroundMonitoring() {
    if (this.isRunning) return;

    console.log('BackgroundService: Starting background monitoring');
    this.isRunning = true;

    // Start gyroscope monitoring in background
    gyroscopeService.startListening(
      () => {
        console.log('BackgroundService: SOS triggered from background');
        // The SOS will be handled by the gyroscope service callback
      },
      {
        onNavigateToSOS: () => {
          console.log('BackgroundService: Navigating to SOS screen from background');
          // Navigation will be handled by the main app when it comes to foreground
        },
        onSOSAlertSent: (result) => {
          console.log('BackgroundService: SOS alert sent from background:', result);
        },
        onError: (error) => {
          console.error('BackgroundService: Gyroscope error:', error);
        }
      }
    );

    // Set up periodic background checks
    this.backgroundTimer = setInterval(() => {
      this.performBackgroundCheck();
    }, this.config.backgroundCheckInterval);
  }

  private stopBackgroundMonitoring() {
    if (!this.isRunning) return;

    console.log('BackgroundService: Stopping background monitoring');
    this.isRunning = false;

    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }

    // Note: We don't stop gyroscope service here as it might be used by foreground components
  }

  private performBackgroundCheck() {
    // Additional background monitoring logic can be added here
    // For now, the gyroscope service handles the main functionality
  }

  public start() {
    console.log('BackgroundService: Starting background service');
    this.setupAppStateListener();
  }

  public stop() {
    console.log('BackgroundService: Stopping background service');
    this.stopBackgroundMonitoring();
    
    // Remove event listener properly
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    } else if (AppState.removeEventListener) {
      AppState.removeEventListener('change', this.handleAppStateChange);
    }
  }

  public updateConfig(newConfig: Partial<BackgroundServiceConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('BackgroundService: Config updated', this.config);
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  public getConfig(): BackgroundServiceConfig {
    return { ...this.config };
  }
}

export const backgroundService = new BackgroundService();
