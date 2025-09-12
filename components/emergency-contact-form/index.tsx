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
import { styles } from './styles';

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

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = t('emergency.nameRequired');
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = t('emergency.phoneRequired');
    } else if (!/^\+63[0-9]{10}$/.test(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = t('emergency.phoneInvalid');
    }

    if (!formData.relationship.trim()) {
      newErrors.relationship = t('emergency.relationshipRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      Alert.alert(t('common.error'), t('emergency.saveError'));
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
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

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text, fontSize: fonts.body }]}>{t('emergency.name')} *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? '#374151' : '#FFFFFF', borderColor: theme.border, color: theme.text }, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder={t('emergency.namePlaceholder')}
              placeholderTextColor={theme.placeholderText}
            />
            {errors.name && <Text style={[styles.errorText, { color: isDarkMode ? '#FCA5A5' : '#DC2626', fontSize: fonts.caption }]}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text, fontSize: fonts.body }]}>{t('emergency.phoneNumber')} *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? '#374151' : '#FFFFFF', borderColor: theme.border, color: theme.text }, errors.phoneNumber && styles.inputError]}
              value={formData.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              placeholder="+63XXXXXXXXXX"
              placeholderTextColor={theme.placeholderText}
              keyboardType="phone-pad"
            />
            {errors.phoneNumber && <Text style={[styles.errorText, { color: isDarkMode ? '#FCA5A5' : '#DC2626', fontSize: fonts.caption }]}>{errors.phoneNumber}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text, fontSize: fonts.body }]}>{t('emergency.relationship')} *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? '#374151' : '#FFFFFF', borderColor: theme.border, color: theme.text }, errors.relationship && styles.inputError]}
              value={formData.relationship}
              onChangeText={(value) => handleInputChange('relationship', value)}
              placeholder={t('emergency.relationshipPlaceholder')}
              placeholderTextColor={theme.placeholderText}
            />
            {errors.relationship && <Text style={[styles.errorText, { color: isDarkMode ? '#FCA5A5' : '#DC2626', fontSize: fonts.caption }]}>{errors.relationship}</Text>}
          </View>

          <View style={styles.switchGroup}>
            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: theme.text, fontSize: fonts.body }]}>{t('emergency.setPrimary')}</Text>
              <Text style={[styles.switchDescription, { color: theme.secondaryText, fontSize: fonts.caption }]}>
                {t('emergency.primaryDesc')}
              </Text>
            </View>
            <Switch
              value={formData.isPrimary}
              onValueChange={(value) => handleInputChange('isPrimary', value)}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={formData.isPrimary ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default EmergencyContactForm;
