import React, { FC, useState } from 'react';
import {
  Text,
  TextInput,
  View,
  Alert,
  Pressable,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Image,
} from 'react-native';
import { FirebaseService } from '../../services/firebaseService';
import { useTheme, colors } from '../../services/themeContext';
import { useLanguage } from '../../services/languageContext';
import { createStyles } from './styles';

interface ChangePasswordProps {
  onClose: () => void;
}

const ChangePassword: FC<ChangePasswordProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isDarkMode } = useTheme();
  const { t } = useLanguage();
  const theme = isDarkMode ? colors.dark : colors.light;
  const styles = createStyles(theme, isDarkMode);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleChangePassword = async () => {
    if (!formData.currentPassword) {
      Alert.alert(t('common.error'), t('message.invalidCredentials'));
      return;
    }
    if (!formData.newPassword) {
      Alert.alert(t('common.error'), t('message.invalidCredentials'));
      return;
    }
    if (formData.newPassword.length < 6) {
      Alert.alert(t('common.error'), t('message.weakPassword'));
      return;
    }
    if (!formData.confirmPassword) {
      Alert.alert(t('common.error'), t('message.invalidCredentials'));
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert(t('common.error'), t('message.passwordMismatch'));
      return;
    }
    if (formData.currentPassword === formData.newPassword) {
      Alert.alert(t('common.error'), t('message.oldPasswordReuse'));
      return;
    }

    setIsLoading(true);
    try {
      await FirebaseService.updateUserPassword(formData.currentPassword, formData.newPassword);
      Alert.alert(
        t('common.success'),
        t('message.passwordChanged'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
              });
              onClose();
            }
          }
        ]
      );
    } catch (error: any) {
      let errorMessage = 'Failed to update password. Please try again.';

      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'New password is too weak.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please log out and log back in before changing your password.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    formData.currentPassword &&
    formData.newPassword &&
    formData.confirmPassword &&
    formData.newPassword.length >= 6 &&
    formData.newPassword === formData.confirmPassword &&
    formData.currentPassword !== formData.newPassword;

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={onClose}
        disabled={isLoading}
      >
        <Pressable
          style={styles.formContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.formTitle}>
            Change Password
          </Text>

          <View style={styles.formFields}>
            {/* Current Password */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                placeholder="Current Password"
                placeholderTextColor="#9CA3AF"
                value={formData.currentPassword}
                onChangeText={value => handleInputChange('currentPassword', value)}
                secureTextEntry={!showCurrentPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Image
                  source={!showCurrentPassword ? require('../../assets/eyeoff.png') : require('../../assets/eyeon.png')}
                  style={styles.eyeIcon}
                />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#9CA3AF"
                value={formData.newPassword}
                onChangeText={value => handleInputChange('newPassword', value)}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Image
                  source={!showNewPassword ? require('../../assets/eyeoff.png') : require('../../assets/eyeon.png')}
                  style={styles.eyeIcon}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#9CA3AF"
                value={formData.confirmPassword}
                onChangeText={value => handleInputChange('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Image
                  source={!showConfirmPassword ? require('../../assets/eyeoff.png') : require('../../assets/eyeon.png')}
                  style={styles.eyeIcon}
                />
              </TouchableOpacity>
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <Text style={styles.errorText}>
                  Passwords do not match
                </Text>
              )}
            </View>

            {/* Change Password Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isFormValid || isLoading) && styles.submitButtonDisabled
              ]}
              onPress={handleChangePassword}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Change Password
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ChangePassword;

