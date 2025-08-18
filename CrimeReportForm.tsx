import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FirebaseService } from './services/firebaseService';

interface CrimeReport {
  crimeType: string;
  dateTime: Date;
  description: string;
  multimedia: string[];
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  anonymous: boolean;
  reporterName: string;
  reporterUid: string;
  status: string;
  createdAt: string;
}

const CrimeReportForm = ({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) => {
  const [formData, setFormData] = useState<Partial<CrimeReport>>({
    crimeType: '',
    dateTime: new Date(),
    description: '',
    multimedia: [],
    location: {
      latitude: 0,
      longitude: 0,
      address: 'Getting current location...',
    },
    anonymous: false,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(true);

  const crimeTypes = [
    'Theft',
    'Assault',
    'Vandalism',
    'Fraud',
    'Harassment',
    'Breaking and Entering',
    'Vehicle Theft',
    'Drug-related',
    'Domestic Violence',
    'Other',
  ];

  useEffect(() => {
    getCurrentLocation();
    checkAuthentication();
  }, []);

  const checkAuthentication = () => {
    const { auth } = require('./firebaseConfig');
    if (!auth.currentUser) {
      Alert.alert('Authentication Required', 'You must be logged in to submit a crime report.', [
        {
          text: 'OK',
          onPress: onClose,
        },
      ]);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLocationLoading(true);
      // In a real app, you would use a location service like:
      // import * as Location from 'expo-location';
      // const location = await Location.getCurrentPositionAsync({});
      
      // For now, using mock coordinates (Manila coordinates)
      const mockLocation = {
        latitude: 14.5995,
        longitude: 120.9842,
        address: 'Manila, Philippines',
      };
      
      setFormData(prev => ({
        ...prev,
        location: mockLocation,
      }));
    } catch (error) {
      console.error('Error getting location:', error);
      setFormData(prev => ({
        ...prev,
        location: {
          latitude: 0,
          longitude: 0,
          address: 'Location unavailable',
        },
      }));
    } finally {
      setIsLocationLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const currentTime = formData.dateTime || new Date();
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(currentTime.getHours());
      newDateTime.setMinutes(currentTime.getMinutes());
      setFormData(prev => ({ ...prev, dateTime: newDateTime }));
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const currentDate = formData.dateTime || new Date();
      const newDateTime = new Date(currentDate);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setFormData(prev => ({ ...prev, dateTime: newDateTime }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.crimeType || !formData.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // Get current user info from Firebase Auth
      const { auth } = require('./firebaseConfig');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to submit a crime report. Please log in again.');
        return;
      }

      // Get user profile data
      let userName = 'Unknown User';
      try {
        const userData = await FirebaseService.getCivilianUser(currentUser.uid);
        if (userData) {
          userName = `${userData.firstName} ${userData.lastName}`;
        }
      } catch (error) {
        console.log('Could not fetch user profile, using default name');
      }

      const crimeReport: CrimeReport = {
        crimeType: formData.crimeType!,
        dateTime: formData.dateTime!,
        description: formData.description!,
        multimedia: formData.multimedia || [],
        location: formData.location!,
        anonymous: formData.anonymous!,
        reporterName: formData.anonymous ? 'Anonymous' : userName,
        reporterUid: currentUser.uid,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // Submit to Firebase
      await FirebaseService.submitCrimeReport(crimeReport);

      Alert.alert('Success', 'Crime report submitted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            onSuccess?.();
            onClose();
          },
        },
      ]);
    } catch (error) {
      console.error('Error submitting crime report:', error);
      let errorMessage = 'Failed to submit crime report. Please try again.';
      
      if (error.message?.includes('PERMISSION_DENIED')) {
        errorMessage = 'Permission denied. Please check your login status or contact support.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Report a Crime</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        {/* Crime Type */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Type of Crime *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.crimeType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, crimeType: value }))}
              style={styles.picker}
            >
              <Picker.Item label="Select crime type" value="" />
              {crimeTypes.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Date and Time */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Date and Time *</Text>
          <View style={styles.dateTimeContainer}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeButtonText}>
                📅 {formData.dateTime?.toLocaleDateString() || 'Select Date'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateTimeButtonText}>
                🕐 {formData.dateTime?.toLocaleTimeString() || 'Select Time'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.currentDateTime}>
            Current: {formatDateTime(formData.dateTime || new Date())}
          </Text>
        </View>

        {/* Description */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="Describe what happened in detail..."
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            textAlignVertical="top"
          />
        </View>

        {/* Location */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>
              {isLocationLoading ? 'Getting location...' : formData.location?.address}
            </Text>
            <TouchableOpacity
              style={styles.refreshLocationButton}
              onPress={getCurrentLocation}
              disabled={isLocationLoading}
            >
              <Text style={styles.refreshLocationButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.locationCoords}>
            Coordinates: {formData.location?.latitude.toFixed(6)}, {formData.location?.longitude.toFixed(6)}
          </Text>
        </View>

        {/* Multimedia */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Multimedia Evidence</Text>
          <TouchableOpacity style={styles.multimediaButton}>
            <Text style={styles.multimediaButtonText}>📷 Add Photo/Video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.multimediaButton}>
            <Text style={styles.multimediaButtonText}>🎤 Add Audio</Text>
          </TouchableOpacity>
        </View>

        {/* Anonymous Reporting */}
        <View style={styles.fieldContainer}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Anonymous Reporting</Text>
            <Switch
              value={formData.anonymous}
              onValueChange={(value) => setFormData(prev => ({ ...prev, anonymous: value }))}
              trackColor={{ false: '#767577', true: '#1E3A8A' }}
              thumbColor={formData.anonymous ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.switchDescription}>
            {formData.anonymous 
              ? 'Your identity will be hidden from other users'
              : 'Your name will be included in the report'
            }
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date/Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.dateTime || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={formData.dateTime || new Date()}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6B7280',
  },
  form: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  picker: {
    height: 50,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  dateTimeButtonText: {
    textAlign: 'center',
    color: '#374151',
    fontWeight: '500',
  },
  currentDateTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    fontSize: 16,
    minHeight: 100,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationText: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    color: '#374151',
  },
  refreshLocationButton: {
    padding: 12,
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
  },
  refreshLocationButtonText: {
    color: 'white',
    fontSize: 16,
  },
  locationCoords: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  multimediaButton: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 8,
  },
  multimediaButtonText: {
    textAlign: 'center',
    color: '#374151',
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchDescription: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#1E3A8A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CrimeReportForm;
