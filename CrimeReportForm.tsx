import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
  Modal,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FirebaseService, CrimeReport } from './services/firebaseService';
import { useTheme, colors, fontSizes } from './services/themeContext';
import { useLanguage } from './services/languageContext';
import { useNotification } from './services/notificationContext';
import Geolocation from '@react-native-community/geolocation';
import {launchCamera, launchImageLibrary, ImagePickerResponse, MediaType} from 'react-native-image-picker';


const CrimeReportForm = ({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) => {
  const { isDarkMode, fontSize } = useTheme();
  const { t } = useLanguage();
  const { sendNotification } = useNotification();
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
    severity: 'Low',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCrimeTypeDropdown, setShowCrimeTypeDropdown] = useState(false);
  const [showSeverityDropdown, setShowSeverityDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
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

  const severityOptions = [
    { value: 'Immediate', label: 'Immediate', color: '#FF0000' },
    { value: 'High', label: 'High', color: '#FF6B35' },
    { value: 'Moderate', label: 'Moderate', color: '#FFA500' },
    { value: 'Low', label: 'Low', color: '#32CD32' },
  ];

  const checkAuthentication = useCallback(() => {
    const { auth } = require('./firebaseConfig');
    if (!auth.currentUser) {
      Alert.alert('Authentication Required', 'You must be logged in to submit a crime report.', [
        {
          text: 'OK',
          onPress: onClose,
        },
      ]);
    }
  }, [onClose]);

  useEffect(() => {
    getCurrentLocation();
    checkAuthentication();
  }, [checkAuthentication]);

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      // Using a free reverse geocoding service (Nominatim)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'E-Responde-MobileApp/1.0',
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('Geocoding response:', text.substring(0, 200)); // Log first 200 chars for debugging
      
      const data = JSON.parse(text);
      
      if (data && data.display_name) {
        // Format the address nicely
        const address = data.display_name;
        return address;
      }
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  const forwardGeocode = async (address: string): Promise<{latitude: number, longitude: number} | null> => {
    try {
      // Using a free forward geocoding service (Nominatim)
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
        {
          headers: {
            'User-Agent': 'E-Responde-MobileApp/1.0',
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('Forward geocoding response:', text.substring(0, 200)); // Log first 200 chars for debugging
      
      const data = JSON.parse(text);
      
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Forward geocoding error:', error);
      return null;
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLocationLoading(true);
      
      // Get current position using React Native Geolocation
      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Use reverse geocoding to get the actual address
          const address = await reverseGeocode(latitude, longitude);
          
          setFormData(prev => ({
            ...prev,
            location: {
              latitude,
              longitude,
              address: address,
            },
          }));
          setIsLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          
          let errorMessage = 'Unable to get your current location.';
          
          // Provide specific error messages based on error code
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              errorMessage = 'Location permission denied. Please enable location access in settings.';
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage = 'Location is currently unavailable. Please try again or enter address manually.';
              break;
            case 3: // TIMEOUT
              errorMessage = 'Location request timed out. Please try again or enter address manually.';
              break;
            default:
              errorMessage = 'Unable to get your current location. You can manually enter an address instead.';
          }
          
          Alert.alert(
            'Location Error',
            errorMessage,
            [
              { text: 'Enter Address', onPress: () => setShowAddressModal(true) },
              { text: 'Try Again', onPress: () => getCurrentLocation() },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          setFormData(prev => ({
            ...prev,
            location: {
              latitude: 0,
              longitude: 0,
              address: 'Location unavailable',
            },
          }));
          setIsLocationLoading(false);
        },
        {
          enableHighAccuracy: false, // Changed to false for faster response
          timeout: 10000, // Reduced timeout to 10 seconds
          maximumAge: 30000, // Accept cached location up to 30 seconds old
        }
      );
    } catch (error) {
      console.error('Error getting location:', error);
      setIsLocationLoading(false);
    }
  };

  const handleManualAddressSubmit = async () => {
    if (!manualAddress.trim()) {
      Alert.alert('Error', 'Please enter a valid address');
      return;
    }

    try {
      setIsLocationLoading(true);
      
      // Use forward geocoding to get coordinates from address
      const coordinates = await forwardGeocode(manualAddress);
      
      if (coordinates) {
        setFormData(prev => ({
          ...prev,
          location: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            address: manualAddress,
          },
        }));
        setShowAddressModal(false);
        setManualAddress('');
      } else {
        Alert.alert('Error', 'Could not find coordinates for the entered address. Please try a different address.');
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      Alert.alert('Error', 'Could not process the entered address. Please try again.');
    } finally {
      setIsLocationLoading(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      setIsUploading(true);
      
      // Show action sheet for file selection
      Alert.alert(
        'Select File Type',
        'Choose how you want to select your file',
        [
          {
            text: 'Camera',
            onPress: () => openCamera(),
          },
          {
            text: 'Photo Library',
            onPress: () => openImagePicker(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error opening file picker:', error);
      Alert.alert('Error', 'Failed to open file picker. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to camera to take photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        console.log('Camera permission result:', granted);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Camera permission error:', err);
        return false;
      }
    }
    return true;
  };

  const openCamera = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const options = {
        mediaType: 'photo' as MediaType,
        quality: 0.8 as any,
        maxWidth: 1000,
        maxHeight: 1000,
        storageOptions: {
          skipBackup: true,
        },
      };

      launchCamera(options, (response: ImagePickerResponse) => {
        if (response.didCancel) {
          console.log('Camera cancelled');
        } else if ((response as any).error) {
          console.log('Camera error:', (response as any).error);
          Alert.alert('Error', 'Failed to open camera. Please check permissions.');
        } else if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          const fileInfo = {
            uri: asset.uri,
            name: `photo_${Date.now()}.${asset.type?.split('/')[1] || 'jpg'}`,
            type: asset.type || 'image/jpeg',
            size: asset.fileSize || 0,
          };
          setUploadedFiles(prev => [...prev, fileInfo]);
          setFormData(prev => ({
            ...prev,
            multimedia: [...(prev.multimedia || []), asset.uri].filter((uri): uri is string => uri !== undefined),
          }));
        } else if ((response as any).uri) {
          // Fallback for older API versions
          const fileInfo = {
            uri: (response as any).uri,
            name: `photo_${Date.now()}.jpg`,
            type: 'image/jpeg',
            size: (response as any).fileSize || 0,
          };
          setUploadedFiles(prev => [...prev, fileInfo]);
          setFormData(prev => ({
            ...prev,
            multimedia: [...(prev.multimedia || []), (response as any).uri].filter((uri): uri is string => uri !== undefined),
          }));
        }
      });
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        // For Android 13+ (API 33+), we need different permissions
        const androidVersion = Platform.Version;
        let permission;
        
        if (androidVersion >= 33) {
          permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
        } else {
          permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        }
        
        const granted = await PermissionsAndroid.request(permission, {
          title: 'Storage Permission',
          message: 'This app needs access to storage to select images.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });
        console.log('Storage permission result:', granted);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Storage permission error:', err);
        return false;
      }
    }
    return true;
  };

  const openImagePicker = async () => {
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Storage permission is required to select images.');
        return;
      }

      const options = {
        mediaType: 'photo' as MediaType,
        quality: 0.8 as any,
        maxWidth: 1000,
        maxHeight: 1000,
        storageOptions: {
          skipBackup: true,
        },
      };

      launchImageLibrary(options, (response: ImagePickerResponse) => {
        if (response.didCancel) {
          console.log('Image picker cancelled');
        } else if ((response as any).error) {
          console.log('Image picker error:', (response as any).error);
          Alert.alert('Error', 'Failed to open photo library. Please check permissions.');
        } else if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          const fileInfo = {
            uri: asset.uri,
            name: `media_${Date.now()}.${asset.type?.split('/')[1] || 'jpg'}`,
            type: asset.type || 'image/jpeg',
            size: asset.fileSize || 0,
          };
          setUploadedFiles(prev => [...prev, fileInfo]);
          setFormData(prev => ({
            ...prev,
            multimedia: [...(prev.multimedia || []), asset.uri].filter((uri): uri is string => uri !== undefined),
          }));
        } else if ((response as any).uri) {
          // Fallback for older API versions
          const fileInfo = {
            uri: (response as any).uri,
            name: `media_${Date.now()}.jpg`,
            type: 'image/jpeg',
            size: (response as any).fileSize || 0,
          };
          setUploadedFiles(prev => [...prev, fileInfo]);
          setFormData(prev => ({
            ...prev,
            multimedia: [...(prev.multimedia || []), (response as any).uri].filter((uri): uri is string => uri !== undefined),
          }));
        }
      });
    } catch (error) {
      console.error('Error opening image picker:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };


  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      multimedia: prev.multimedia?.filter((_, i) => i !== index) || [],
    }));
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

    // Check if location is valid
    if (!formData.location || formData.location.latitude === 0 || formData.location.longitude === 0 || 
        formData.location.address === 'Getting current location...' || formData.location.address === 'Location unavailable') {
      Alert.alert('Location Required', 'Please provide a valid location for your report. You can use your current location or enter an address manually.');
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
        severity: formData.severity || 'Low',
      };

      // Submit to Firebase and get the report ID
      const reportId = await FirebaseService.submitCrimeReport(crimeReport);

      // Send confirmation notification to the user
      console.log('CrimeReportForm: Sending confirmation notification for report:', reportId);
      const notificationSent = await sendNotification(
        'crime_report_submitted',
        'Crime Report Submitted',
        'Your crime report has been submitted successfully and is under review. Tap to view details.',
        { reportId, crimeType: crimeReport.crimeType }
      );
      console.log('CrimeReportForm: Notification sent result:', notificationSent);

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
      marginTop: 40,
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
    requiredIndicator: {
      color: '#EF4444',
      fontWeight: 'bold',
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
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 5,
      width: '70%',
      alignSelf: 'center',
      minHeight: 56,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    submitButtonDisabled: {
      backgroundColor: '#9CA3AF',
    },
    submitButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '700',
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
    crimeTypeDropdownList: {
      position: 'absolute',
      top: 120, // Position it to overlay above severity field
      left: 20, // Match the form padding
      right: 20, // Match the form padding
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : theme.border,
      borderRadius: 8,
      zIndex: 4000, // Much higher z-index to ensure it appears above everything
      elevation: 20,
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
    manualAddressButton: {
      backgroundColor: theme.menuBackground,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      marginTop: 8,
    },
    manualAddressButtonText: {
      textAlign: 'center',
      color: theme.primary,
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.menuBackground,
      borderRadius: 12,
      padding: 20,
      width: '90%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    addressInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      backgroundColor: theme.background,
      fontSize: 16,
      minHeight: 80,
      color: theme.text,
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    modalCancelButton: {
      flex: 1,
      backgroundColor: theme.border,
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      minHeight: 56,
      justifyContent: 'center',
    },
    modalCancelButtonText: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '700',
    },
    modalSubmitButton: {
      flex: 1,
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      minHeight: 56,
      justifyContent: 'center',
    },
    modalSubmitButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '700',
    },
    uploadedFilesContainer: {
      marginTop: 12,
      padding: 12,
      backgroundColor: theme.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    uploadedFilesTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    uploadedFileItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.menuBackground,
      borderRadius: 6,
      marginBottom: 6,
    },
    uploadedFileName: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
    },
    removeFileButton: {
      padding: 4,
      marginLeft: 8,
    },
    removeFileButtonText: {
      color: '#EF4444',
      fontSize: 16,
      fontWeight: 'bold',
    },
    severityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    severityIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    severityDropdownList: {
      position: 'absolute',
      top: 50,
      left: 0,
      right: 0,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : theme.border,
      borderTopWidth: 0,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      zIndex: 2000, // Higher z-index than crime type dropdown
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
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
            
          </View>
        </View>

        {/* Severity */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Severity *</Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              style={styles.pickerContainer}
              onPress={() => setShowSeverityDropdown(!showSeverityDropdown)}
            >
              <Text style={[
                styles.pickerText,
                { color: formData.severity ? theme.text : theme.placeholder }
              ]}>
                {formData.severity || 'Select Severity'}
              </Text>
              <Text style={[styles.dropdownArrow, { color: theme.text }]}>
                {showSeverityDropdown ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            
            {showSeverityDropdown && (
              <>
                <TouchableOpacity 
                  style={styles.dropdownOverlay}
                  onPress={() => setShowSeverityDropdown(false)}
                />
                <View style={styles.severityDropdownList}>
                  {severityOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.dropdownItem,
                        formData.severity === option.value && styles.selectedDropdownItem
                      ]}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, severity: option.value as any }));
                        setShowSeverityDropdown(false);
                      }}
                    >
                      <View style={styles.severityItem}>
                        <View style={[styles.severityIndicator, { backgroundColor: option.color }]} />
                        <Text style={[
                          styles.dropdownItemText,
                          formData.severity === option.value && styles.selectedDropdownItemText
                        ]}>
                          {option.label}
                        </Text>
                      </View>
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
          <Text style={styles.label}>{t('crime.location')} <Text style={styles.requiredIndicator}>*</Text></Text>
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
          <TouchableOpacity
            style={styles.manualAddressButton}
            onPress={() => setShowAddressModal(true)}
          >
            <Text style={styles.manualAddressButtonText}>📍 Enter Address Manually</Text>
          </TouchableOpacity>
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
          
          {/* Show uploaded files */}
          {uploadedFiles.length > 0 && (
            <View style={styles.uploadedFilesContainer}>
              <Text style={styles.uploadedFilesTitle}>Uploaded Files:</Text>
              {uploadedFiles.map((file, index) => (
                <View key={index} style={styles.uploadedFileItem}>
                  <Text style={styles.uploadedFileName}>
                    {file.type === 'image' ? '🖼️' : '🎥'} {file.name}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeFileButton}
                    onPress={() => removeFile(index)}
                  >
                    <Text style={styles.removeFileButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
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

      {/* Crime Type Dropdown - Positioned outside form to overlay above severity */}
      {showCrimeTypeDropdown && (
        <>
          <TouchableOpacity 
            style={[styles.dropdownOverlay, { zIndex: 2999, elevation: 14 }]}
            onPress={() => setShowCrimeTypeDropdown(false)}
          />
          <View style={styles.crimeTypeDropdownList}>
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

      {/* Manual Address Modal */}
      <Modal
        visible={showAddressModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Address Manually</Text>
            <TextInput
              style={styles.addressInput}
              placeholder="Enter the exact address where the crime occurred..."
              placeholderTextColor={theme.secondaryText}
              value={manualAddress}
              onChangeText={setManualAddress}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddressModal(false);
                  setManualAddress('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleManualAddressSubmit}
                disabled={isLocationLoading}
              >
                {isLocationLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Use Address</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default CrimeReportForm;