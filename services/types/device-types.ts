export interface SmartwatchDevice {
  id: string;
  name: string;
  userId: string;
  isPaired: boolean;
  lastSeen: number;
  batteryLevel: number;
  pairedAt?: string;
  pairedUserId?: string;
}

export interface PairingStatus {
  deviceId: string;
  isPaired: boolean;
  pairedAt?: string;
  deviceName?: string;
}

export interface DevicePairingModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface DeviceDiscoveryServiceInterface {
  getUnpairedDevices(): Promise<SmartwatchDevice[]>;
  getUserPairedDevices(userId: string): Promise<SmartwatchDevice[]>;
  pairWithDevice(deviceId: string, userId: string): Promise<boolean>;
  unpairDevice(deviceId: string, userId: string): Promise<boolean>;
  onUnpairedDevicesUpdate(callback: (devices: SmartwatchDevice[]) => void): () => void;
  onPairedDevicesUpdate(userId: string, callback: (devices: SmartwatchDevice[]) => void): () => void;
  cleanup(): void;
}

export interface SOSAlert {
  id: string;
  timestamp: number;
  type: 'manual' | 'proximity' | 'shake';
  userId: string;
  deviceId?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  message: string;
}

export interface DeviceConnectionStatus {
  isConnected: boolean;
  lastSeen: number;
  batteryLevel: number;
  signalStrength?: number;
}
