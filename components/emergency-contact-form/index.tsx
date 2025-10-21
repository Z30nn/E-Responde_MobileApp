import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { EmergencyContact, CreateEmergencyContactData, UpdateEmergencyContactData } from '../../services/types/emergency-types';
import { useTheme, colors, fontSizes } from '../../services/themeContext';
import { useLanguage } from '../../services/languageContext';
import { createStyles } from './styles';

interface EmergencyContactFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (contactData: CreateEmergencyContactData | UpdateEmergencyContactData) => Promise<void>;
  editingContact?: EmergencyContact | null;
  isLoading?: boolean;
}

const EmergencyContactForm: React.FC<EmergencyContactFormProps> = ({
  visible,
  onClose,
  onSave,
  editingContact,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    relationship: '',
    isPrimary: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { isDarkMode, fontSize } = useTheme();
  const { language, t } = useLanguage();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const styles = createStyles(theme);

  useEffect(() => {
    if (editingContact) {
      setFormData({
        name: editingContact.name,
        phoneNumber: editingContact.phoneNumber,
        relationship: editingContact.relationship,
        isPrimary: editingContact.isPrimary,
      });
    } else {
      setFormData({
        name: '',
        phoneNumber: '',
        relationship: '',
        isPrimary: false,
      });
    }
    setErrors({});
  }, [editingContact, visible]);


  const checkIfPhoneNumberIsRegistered = async (phoneNumber: string): Promise<boolean> => {
    try {
      const { ref, get } = require('firebase/database');
      const { database } = require('../../firebaseConfig');
      
      const usersRef = ref(database, 'civilian/civilian account');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        for (const [userId, userData] of Object.entries(users)) {
          if (userData.contactNumber === phoneNumber) {
            return true; // Phone number is registered
          }
        }
      }
      return false; // Phone number is not registered
    } catch (error) {
      console.error('Error checking if phone number is registered:', error);
      return false;
    }
  };

  const validateForm = async () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = t('emergency.nameRequired');
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = t('emergency.phoneRequired');
    } else if (!/^\+63[0-9]{10}$/.test(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = 'Phone number must be in format +63XXXXXXXXXX (exactly 10 digits after +63)';
    }

    if (!formData.relationship.trim()) {
      newErrors.relationship = t('emergency.relationshipRequired');
    }

    // If this is a primary contact, check if the phone number is registered
    if (formData.isPrimary && formData.phoneNumber.trim() && /^\+63[0-9]{10}$/.test(formData.phoneNumber.trim())) {
      const isRegistered = await checkIfPhoneNumberIsRegistered(formData.phoneNumber.trim());
      if (!isRegistered) {
        newErrors.phoneNumber = 'Primary contact cannot be added, because the Phone number is not registered in E-Responde';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      Alert.alert(t('common.error'), t('emergency.saveError'));
    }
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, '');
    
    // If it starts with 63, add + prefix
    if (cleaned.startsWith('63')) {
      return '+' + cleaned;
    }
    // If it doesn't start with 63, add +63 prefix
    if (cleaned.length > 0 && !cleaned.startsWith('63')) {
      return '+63' + cleaned;
    }
    // If empty, return empty
    if (cleaned.length === 0) {
      return '';
    }
    // If it starts with 0, replace with +63
    if (cleaned.startsWith('0')) {
      return '+63' + cleaned.substring(1);
    }
    
    return '+' + cleaned;
  };

  const handleInputChange = async (field: string, value: string | boolean) => {
    if (field === 'phoneNumber' && typeof value === 'string') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, [field]: formatted }));
      
      // If primary contact is enabled, validate the phone number
      if (formData.isPrimary && formatted.trim() && /^\+63[0-9]{10}$/.test(formatted.trim())) {
        const isRegistered = await checkIfPhoneNumberIsRegistered(formatted.trim());
        if (!isRegistered) {
          setErrors(prev => ({ 
            ...prev, 
            phoneNumber: 'Primary contact cannot be added, because the Phone number is not registered in E-Responde' 
          }));
        } else {
          setErrors(prev => ({ ...prev, phoneNumber: '' }));
        }
      } else {
        // Clear error when user starts typing
        if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: '' }));
        }
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
      
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };


  const handlePrimaryToggle = async (value: boolean) => {
    setFormData(prev => ({ ...prev, isPrimary: value }));
    
    // If enabling primary contact, validate phone number registration
    if (value && formData.phoneNumber.trim() && /^\+63[0-9]{10}$/.test(formData.phoneNumber.trim())) {
      try {
        const isRegistered = await checkIfPhoneNumberIsRegistered(formData.phoneNumber.trim());
        if (!isRegistered) {
          setErrors(prev => ({ 
            ...prev, 
            phoneNumber: 'Primary contact cannot be added, because the Phone number is not registered in E-Responde' 
          }));
        } else {
          setErrors(prev => ({ 
            ...prev, 
            phoneNumber: '' 
          }));
        }
      } catch (error) {
        console.error('Error checking phone number registration:', error);
      }
    } else if (!value) {
      // If turning off primary contact, clear phone number errors
      setErrors(prev => ({ ...prev, phoneNumber: '' }));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.menuBackground, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={[styles.cancelButtonText, { color: theme.primary, fontSize: fonts.body }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text, fontSize: fonts.title }]}>
            {editingContact ? t('emergency.editContact') : t('emergency.addContact')}
          </Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, { backgroundColor: theme.primary }, isLoading && styles.saveButtonDisabled]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.saveButtonText, { fontSize: fonts.body }]}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={true}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text, fontSize: fonts.body }]}>{t('emergency.name')} *</Text>
            <TextInput
              style={[
                styles.input,
                errors.name && styles.inputError,
                { borderRadius: 25, fontSize: fonts.input }
              ]}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Name"
              placeholderTextColor={theme.placeholder}
            />
            {errors.name && <Text style={[styles.errorText, { fontSize: fonts.caption }]}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text, fontSize: fonts.body }]}>{t('emergency.phoneNumber')} *</Text>
            <TextInput
              style={[
                styles.input,
                errors.phoneNumber && styles.inputError,
                { borderRadius: 25, fontSize: fonts.input }
              ]}
              value={formData.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              placeholder="Phone Number"
              placeholderTextColor={theme.placeholder}
              keyboardType="phone-pad"
            />
            <Text style={[styles.helperText, { color: theme.secondaryText, fontSize: fonts.caption }]}>
              Philippine mobile number format: +63 followed by 10 digits (e.g., +639123456789)
            </Text>
            {errors.phoneNumber && <Text style={[styles.errorText, { fontSize: fonts.caption }]}>{errors.phoneNumber}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text, fontSize: fonts.body }]}>{t('emergency.relationship')} *</Text>
            <TextInput
              style={[
                styles.input,
                errors.relationship && styles.inputError,
                { borderRadius: 25, fontSize: fonts.input }
              ]}
              value={formData.relationship}
              onChangeText={(value) => handleInputChange('relationship', value)}
              placeholder="Relationship"
              placeholderTextColor={theme.placeholder}
            />
            {errors.relationship && <Text style={[styles.errorText, { fontSize: fonts.caption }]}>{errors.relationship}</Text>}
          </View>

          <View style={styles.switchGroup}>
            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: theme.text, fontSize: fonts.body }]}>{t('emergency.setPrimary')}</Text>
              <Text style={[styles.switchDescription, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                {t('emergency.primaryDesc')} (Maximum 3 primary contacts)
              </Text>
            </View>
            <Switch
              value={formData.isPrimary}
              onValueChange={handlePrimaryToggle}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={formData.isPrimary ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </ScrollView>
      </View>
      </View>
    </Modal>
  );
};

export default EmergencyContactForm;
