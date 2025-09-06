/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {
  Text,
  TextInput,
  ScrollView,
  View,
  Alert,
  Pressable,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import EyeIcon from './assets/eye.svg';
import EyeOffIcon from './assets/eye-off.svg';
import { FirebaseService } from './services/firebaseService';
import { useTheme, colors } from './services/themeContext';
import { useLanguage } from './services/languageContext';

const ChangePassword = ({ onClose }: { onClose: () => void }) => {
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
        style={{
          flex: 1,
          backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
        onPress={onClose}
        disabled={isLoading}
      >
        <Pressable
          style={{
            backgroundColor: theme.background,
            borderRadius: 20,
            width: '100%',
            maxWidth: 350,
            padding: 30,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 10,
            },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 30,
            color: theme.primary,
          }}>
            {t('auth.changePassword')}
          </Text>

          {/* Current Password */}
          <View style={{ position: 'relative', marginBottom: 20 }}>
            <TextInput
              style={{
                backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.2)' : 'rgba(30, 58, 138, 0.31)',
                color: theme.primary,
                padding: 15,
                fontSize: 16,
                paddingRight: 50,
                borderRadius: 8,
                fontWeight: '500',
                borderWidth: 1,
                borderColor: isDarkMode ? 'rgba(30, 58, 138, 0.3)' : 'transparent',
              }}
              placeholder={t('auth.currentPassword')}
              placeholderTextColor={theme.primary}
              value={formData.currentPassword}
              onChangeText={value => handleInputChange('currentPassword', value)}
              secureTextEntry={!showCurrentPassword}
            />
            <Pressable
              style={{ position: 'absolute', right: 15, top: 15, padding: 5 }}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? (
                <EyeOffIcon width={24} height={24} />
              ) : (
                <EyeIcon width={24} height={24} />
              )}
            </Pressable>
          </View>

          {/* New Password */}
          <View style={{ position: 'relative', marginBottom: 20 }}>
            <TextInput
              style={{
                backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.2)' : 'rgba(30, 58, 138, 0.31)',
                color: theme.primary,
                padding: 15,
                fontSize: 16,
                paddingRight: 50,
                borderRadius: 8,
                fontWeight: '500',
                borderWidth: 1,
                borderColor: isDarkMode ? 'rgba(30, 58, 138, 0.3)' : 'transparent',
              }}
              placeholder={t('auth.newPassword')}
              placeholderTextColor={theme.primary}
              value={formData.newPassword}
              onChangeText={value => handleInputChange('newPassword', value)}
              secureTextEntry={!showNewPassword}
            />
            <Pressable
              style={{ position: 'absolute', right: 15, top: 15, padding: 5 }}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? (
                <EyeOffIcon width={24} height={24} />
              ) : (
                <EyeIcon width={24} height={24} />
              )}
            </Pressable>
          </View>

          {/* Confirm Password */}
          <View style={{ position: 'relative', marginBottom: 30 }}>
            <TextInput
              style={{
                backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.2)' : 'rgba(30, 58, 138, 0.31)',
                color: theme.primary,
                padding: 15,
                fontSize: 16,
                paddingRight: 50,
                borderRadius: 8,
                fontWeight: '500',
                borderWidth: 1,
                borderColor: isDarkMode ? 'rgba(30, 58, 138, 0.3)' : 'transparent',
              }}
              placeholder={t('auth.confirmPassword')}
              placeholderTextColor={theme.primary}
              value={formData.confirmPassword}
              onChangeText={value => handleInputChange('confirmPassword', value)}
              secureTextEntry={!showConfirmPassword}
            />
            <Pressable
              style={{ position: 'absolute', right: 15, top: 15, padding: 5 }}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOffIcon width={24} height={24} />
              ) : (
                <EyeIcon width={24} height={24} />
              )}
            </Pressable>
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <Text style={{ 
                color: '#FF0000', 
                marginTop: 8, 
                fontSize: 13, 
                fontWeight: 'bold', 
                textAlign: 'center' 
              }}>
                Passwords do not match
              </Text>
            )}
          </View>

          {/* Buttons */}
          <View style={{ gap: 15 }}>
            <Pressable
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#aaa' : (isFormValid && !isLoading ? theme.primary : '#aaa'),
                borderRadius: 15,
                padding: 18,
                alignItems: 'center',
                width: '100%',
              })}
              onPress={handleChangePassword}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{t('auth.changePassword')}</Text>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#aaa' : (isDarkMode ? '#444444' : '#666666'),
                borderRadius: 15,
                padding: 18,
                alignItems: 'center',
                width: '100%',
              })}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{t('common.cancel')}</Text>
            </Pressable>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ChangePassword;
