import React, { FC, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTheme, colors, fontSizes } from '../../services/themeContext';
import { useLanguage } from '../../services/languageContext';
import { useAuth } from '../../services/authContext';
import { deviceDiscoveryService, SmartwatchDevice } from '../../services/deviceDiscoveryService';
import { createStyles } from './styles';

interface DevicePairingModalProps {
  visible: boolean;
  onClose: () => void;
}

const DevicePairingModal: FC<DevicePairingModalProps> = ({ visible, onClose }) => {
  const [unpairedDevices, setUnpairedDevices] = useState<SmartwatchDevice[]>([]);
  const [pairedDevices, setPairedDevices] = useState<SmartwatchDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pairingDeviceId, setPairingDeviceId] = useState<string | null>(null);
  const [unpairingDeviceId, setUnpairingDeviceId] = useState<string | null>(null);

  const { isDarkMode } = useTheme();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes.medium;
  const styles = createStyles(theme, fonts, isDarkMode);

  useEffect(() => {
    if (visible && user) {
      loadDevices();
      setupRealtimeListeners();
    }

    return () => {
      // Cleanup listeners when modal closes
      deviceDiscoveryService.cleanup();
    };
  }, [visible, user]);

  const setupRealtimeListeners = () => {
    if (!user) return;

    // Listen for unpaired devices updates
    const unsubscribeUnpaired = deviceDiscoveryService.onUnpairedDevicesUpdate((devices) => {
      setUnpairedDevices(devices);
    });

    // Listen for paired devices updates
    const unsubscribePaired = deviceDiscoveryService.onPairedDevicesUpdate(user.uid, (devices) => {
      setPairedDevices(devices);
    });

    // Store unsubscribe functions for cleanup
    deviceDiscoveryService['listeners']['unpaired'] = unsubscribeUnpaired;
    deviceDiscoveryService['listeners']['paired'] = unsubscribePaired;
  };

  const loadDevices = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [unpaired, paired] = await Promise.all([
        deviceDiscoveryService.getUnpairedDevices(),
        deviceDiscoveryService.getUserPairedDevices(user.uid)
      ]);
      
      setUnpairedDevices(unpaired);
      setPairedDevices(paired);
    } catch (error: any) {
      console.error('Error loading devices:', error);
      Alert.alert('Error', 'Failed to load devices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDevices();
    setRefreshing(false);
  };

  const handlePairDevice = async (deviceId: string) => {
    if (!user) return;

    setPairingDeviceId(deviceId);
    try {
      await deviceDiscoveryService.pairWithDevice(deviceId, user.uid);
      Alert.alert('Success', 'Device paired successfully!');
    } catch (error: any) {
      console.error('Error pairing device:', error);
      Alert.alert('Error', error.message || 'Failed to pair device. Please try again.');
    } finally {
      setPairingDeviceId(null);
    }
  };

  const handleUnpairDevice = async (deviceId: string) => {
    if (!user) return;

    Alert.alert(
      'Unpair Device',
      'Are you sure you want to unpair this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            setUnpairingDeviceId(deviceId);
            try {
              await deviceDiscoveryService.unpairDevice(deviceId, user.uid);
              Alert.alert('Success', 'Device unpaired successfully!');
            } catch (error: any) {
              console.error('Error unpairing device:', error);
              Alert.alert('Error', error.message || 'Failed to unpair device. Please try again.');
            } finally {
              setUnpairingDeviceId(null);
            }
          }
        }
      ]
    );
  };

  const formatLastSeen = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const renderDeviceItem = (device: SmartwatchDevice, isPaired: boolean) => {
    const isProcessing = pairingDeviceId === device.id || unpairingDeviceId === device.id;
    
    return (
      <View key={device.id} style={styles.deviceItem}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceId}>ID: {device.id}</Text>
          <View style={styles.deviceDetails}>
            <Text style={styles.deviceDetail}>
              Battery: {device.batteryLevel}%
            </Text>
            <Text style={styles.deviceDetail}>
              Last seen: {formatLastSeen(device.lastSeen)}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            isPaired ? styles.unpairButton : styles.pairButton,
            isProcessing && styles.processingButton
          ]}
          onPress={() => isPaired ? handleUnpairDevice(device.id) : handlePairDevice(device.id)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <Text style={[
              styles.actionButtonText,
              isPaired ? styles.unpairButtonText : styles.pairButtonText
            ]}>
              {isPaired ? 'Unpair' : 'Pair'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Device Connections</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.text}
            />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.loadingText}>Loading devices...</Text>
            </View>
          ) : (
            <>
              {/* Paired Devices Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Paired Devices ({pairedDevices.length})</Text>
                {pairedDevices.length > 0 ? (
                  pairedDevices.map(device => renderDeviceItem(device, true))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No paired devices</Text>
                  </View>
                )}
              </View>

              {/* Available Devices Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Available Devices ({unpairedDevices.length})</Text>
                {unpairedDevices.length > 0 ? (
                  unpairedDevices.map(device => renderDeviceItem(device, false))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No available devices</Text>
                    <Text style={styles.emptyStateSubtext}>
                      Make sure your smartwatch is connected and logged in
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default DevicePairingModal;
