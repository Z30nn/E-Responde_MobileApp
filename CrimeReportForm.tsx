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
import DateTimePicker from '@react-native-community/datetimepicker';
import { FirebaseService, CrimeReport } from './services/firebaseService';
import { useTheme, colors, fontSizes } from './services/themeContext';
import { useLanguage } from './services/languageContext';


const CrimeReportForm = ({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) => {
  const { isDarkMode, fontSize } = useTheme();
  const { t } = useLanguage();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
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
  const [showCrimeTypeDropdown, setShowCrimeTypeDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const crimeTypes = [
    t('crime.crimeTypes.theft'),
    t('crime.crimeTypes.assault'),
    t('crime.crimeTypes.vandalism'),
    t('crime.crimeTypes.fraud'),
    t('crime.crimeTypes.harassment'),
    t('crime.crimeTypes.breakingEntering'),
    t('crime.crimeTypes.vehicleTheft'),
    t('crime.crimeTypes.drugRelated'),
    t('crime.crimeTypes.domesticViolence'),
    t('crime.crimeTypes.other'),
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

  const handleFileUpload = async () => {
    setIsUploading(true);
    try {
      // TODO: Implement actual file upload functionality
      // This would typically use a library like react-native-image-picker
      // or expo-image-picker for selecting and uploading files
      Alert.alert('File Upload', 'File upload functionality will be implemented here');
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
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
    } catch (error: any) {
      console.error('Error submitting crime report:', error);
      let errorMessage = 'Failed to submit crime report. Please try again.';
      
      if (error.code === 'auth/permission-denied' || error.message?.includes('PERMISSION_DENIED')) {
        errorMessage = 'Permission denied. Please check your login status or contact support.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message) {
        // Use the error message if available
        errorMessage = error.message;
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.menuBackground,
    },
    headerTitle: {
      fontSize: fonts.title,
      fontWeight: 'bold',
      color: theme.primary,
    },
    closeButton: {
      padding: 8,
    },
    closeButtonText: {
      fontSize: fonts.subtitle,
      color: theme.secondaryText,
    },
    form: {
      padding: 20,
    },
    fieldContainer: {
      marginBottom: 24,
    },
    label: {
      fontSize: fonts.label,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : theme.border,
      borderRadius: 8,
      backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.2)' : theme.menuBackground,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 50,
    },
    pickerText: {
      fontSize: fonts.body,
      flex: 1,
    },
    dropdownArrow: {
      fontSize: fonts.caption,
      marginLeft: 8,
    },
    dateTimeContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    dateTimeButton: {
      flex: 1,
      backgroundColor: theme.menuBackground,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    dateTimeButtonText: {
      textAlign: 'center',
      color: theme.text,
      fontWeight: '500',
    },
    currentDateTime: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      marginTop: 8,
      fontStyle: 'italic',
    },
    textArea: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      backgroundColor: theme.menuBackground,
      fontSize: fonts.body,
      minHeight: 100,
      color: theme.text,
    },
    locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    locationText: {
      flex: 1,
      backgroundColor: theme.menuBackground,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text,
    },
    refreshLocationButton: {
      padding: 12,
      backgroundColor: theme.primary,
      borderRadius: 8,
    },
    refreshLocationButtonText: {
      color: theme.background,
      fontSize: fonts.button,
    },
    locationCoords: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      marginTop: 8,
      fontFamily: 'monospace',
    },
    multimediaButton: {
      backgroundColor: theme.menuBackground,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 8,
    },
    multimediaButtonDisabled: {
      opacity: 0.6,
    },
    multimediaButtonText: {
      textAlign: 'center',
      color: theme.text,
      fontWeight: '500',
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    switchDescription: {
      fontSize: fonts.caption,
      color: theme.secondaryText,
      fontStyle: 'italic',
    },
    submitButton: {
      backgroundColor: '#1E8A32',
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 20,
      width: '60%',
      alignSelf: 'center',
    },
    submitButtonDisabled: {
      backgroundColor: '#9CA3AF',
    },
    submitButtonText: {
      color: 'white',
      fontSize: fonts.button,
      fontWeight: '600',
    },
    // Dropdown Container and List Styles
    dropdownContainer: {
      position: 'relative',
      zIndex: 1,
    },
    dropdownList: {
      position: 'absolute',
      top: 50, // Position below the picker container
      left: 0,
      right: 0,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : theme.border,
      borderTopWidth: 0,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      zIndex: 1000,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    dropdownOverlay: {
      position: 'absolute',
      top: 0,
      left: -1000,
      right: -1000,
      bottom: -1000,
      zIndex: 999,
    },
    dropdownItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    selectedDropdownItem: {
      backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.3)' : 'rgba(30, 58, 138, 0.1)',
    },
    dropdownItemText: {
      fontSize: fonts.body,
      color: theme.text,
    },
    selectedDropdownItemText: {
      color: theme.primary,
      fontWeight: '600',
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('crime.reportCrime')}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        {/* Crime Type */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t('crime.crimeType')} *</Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              style={styles.pickerContainer}
              onPress={() => setShowCrimeTypeDropdown(!showCrimeTypeDropdown)}
            >
              <Text style={[
                styles.pickerText,
                { color: formData.crimeType ? theme.text : theme.placeholder }
              ]}>
                {formData.crimeType || t('crime.selectCrimeType')}
              </Text>
              <Text style={[styles.dropdownArrow, { color: theme.text }]}>
                {showCrimeTypeDropdown ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            
            {/* Dropdown List */}
            {showCrimeTypeDropdown && (
              <>
                <TouchableOpacity 
                  style={styles.dropdownOverlay}
                  activeOpacity={1}
                  onPress={() => setShowCrimeTypeDropdown(false)}
                />
                <View style={styles.dropdownList}>
                  {crimeTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.dropdownItem,
                        formData.crimeType === type && styles.selectedDropdownItem
                      ]}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, crimeType: type }));
                        setShowCrimeTypeDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        formData.crimeType === type && styles.selectedDropdownItemText
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>

        {/* Date and Time */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t('crime.dateTime')} *</Text>
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
          <Text style={styles.label}>{t('crime.description')} *</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder={t('crime.descriptionPlaceholder')}
            placeholderTextColor={theme.secondaryText}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            textAlignVertical="top"
          />
        </View>

        {/* Location */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t('crime.location')}</Text>
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
          <Text style={styles.label}>{t('crime.multimediaEvidence')}</Text>
          <TouchableOpacity 
            style={[styles.multimediaButton, isUploading && styles.multimediaButtonDisabled]}
            onPress={handleFileUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color={theme.text} size="small" />
            ) : (
              <Text style={styles.multimediaButtonText}>📁 {t('crime.addPhotoVideo')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.multimediaButton, isUploading && styles.multimediaButtonDisabled]}
            onPress={handleFileUpload}
            disabled={isUploading}
          >
            <Text style={styles.multimediaButtonText}>🎤 {t('crime.addAudio')}</Text>
          </TouchableOpacity>
        </View>

        {/* Anonymous Reporting */}
        <View style={styles.fieldContainer}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>{t('crime.anonymous')}</Text>
            <Switch
              value={formData.anonymous}
              onValueChange={(value) => setFormData(prev => ({ ...prev, anonymous: value }))}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={formData.anonymous ? theme.background : '#f4f3f4'}
            />
          </View>
          <Text style={styles.switchDescription}>
            {t('crime.anonymousDesc')}
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
            <Text style={styles.submitButtonText}>{t('crime.submitReport')}</Text>
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
          themeVariant={isDarkMode ? 'dark' : 'light'}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={formData.dateTime || new Date()}
          mode="time"
          display="default"
          onChange={handleTimeChange}
          themeVariant={isDarkMode ? 'dark' : 'light'}
        />
      )}

    </ScrollView>
  );
};

export default CrimeReportForm;