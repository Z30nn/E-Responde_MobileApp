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
  TouchableOpacity,
  Image,
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
            backgroundColor: isDarkMode ? '#2A2A2A' : '#ffffff',
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
           {/* Form Title */}
           <Text style={{
             fontSize: 20,
             fontWeight: '900',
             color: isDarkMode ? '#f8f9ed' : '#475e3d',
             textAlign: 'center',
             marginBottom: 20,
             letterSpacing: 0.5,
           }}>
             Change Password
           </Text>

           {/* Form Fields */}
           <View style={{ gap: 18 }}>
             {/* Current Password */}
             <View style={{ position: 'relative' }}>
               <TextInput
                 style={{
                   backgroundColor: isDarkMode ? '#3A3A3A' : '#ffffff',
                   borderWidth: 1,
                   borderColor: isDarkMode ? '#555555' : '#E5E7EB',
                   paddingVertical: 12,
                   paddingHorizontal: 16,
                   paddingRight: 50,
                   fontSize: 14,
                   borderRadius: 25,
                   color: isDarkMode ? '#f8f9ed' : '#1F2937',
                 }}
                 placeholder="Current Password"
                 placeholderTextColor={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
                 value={formData.currentPassword}
                 onChangeText={value => handleInputChange('currentPassword', value)}
                 secureTextEntry={!showCurrentPassword}
               />
               <TouchableOpacity
                 style={{
                   position: 'absolute',
                   right: 5,
                   top: -5,
                   padding: 5,
                 }}
                 onPress={() => setShowCurrentPassword(!showCurrentPassword)}
               >
                 <Image 
                   source={!showCurrentPassword ? require('./assets/eyeoff.png') : require('./assets/eyeon.png')}
                   style={{ 
                     width: 50, 
                     height: 50,
                     tintColor: '#193a3c'
                   }}
                 />
               </TouchableOpacity>
             </View>

             {/* New Password */}
             <View style={{ position: 'relative' }}>
               <TextInput
                 style={{
                   backgroundColor: isDarkMode ? '#3A3A3A' : '#ffffff',
                   borderWidth: 1,
                   borderColor: isDarkMode ? '#555555' : '#E5E7EB',
                   paddingVertical: 12,
                   paddingHorizontal: 16,
                   paddingRight: 50,
                   fontSize: 14,
                   borderRadius: 25,
                   color: isDarkMode ? '#f8f9ed' : '#1F2937',
                 }}
                 placeholder="New Password"
                 placeholderTextColor={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
                 value={formData.newPassword}
                 onChangeText={value => handleInputChange('newPassword', value)}
                 secureTextEntry={!showNewPassword}
               />
               <TouchableOpacity
                 style={{
                   position: 'absolute',
                   right: 5,
                   top: -5,
                   padding: 5,
                 }}
                 onPress={() => setShowNewPassword(!showNewPassword)}
               >
                 <Image 
                   source={!showNewPassword ? require('./assets/eyeoff.png') : require('./assets/eyeon.png')}
                   style={{ 
                     width: 50, 
                     height: 50,
                     tintColor: '#193a3c'
                   }}
                 />
               </TouchableOpacity>
             </View>

             {/* Confirm Password */}
             <View style={{ position: 'relative' }}>
               <TextInput
                 style={{
                   backgroundColor: isDarkMode ? '#3A3A3A' : '#ffffff',
                   borderWidth: 1,
                   borderColor: isDarkMode ? '#555555' : '#E5E7EB',
                   paddingVertical: 12,
                   paddingHorizontal: 16,
                   paddingRight: 50,
                   fontSize: 14,
                   borderRadius: 25,
                   color: isDarkMode ? '#f8f9ed' : '#1F2937',
                 }}
                 placeholder="Confirm Password"
                 placeholderTextColor={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
                 value={formData.confirmPassword}
                 onChangeText={value => handleInputChange('confirmPassword', value)}
                 secureTextEntry={!showConfirmPassword}
               />
               <TouchableOpacity
                 style={{
                   position: 'absolute',
                   right: 5,
                   top: -5,
                   padding: 5,
                 }}
                 onPress={() => setShowConfirmPassword(!showConfirmPassword)}
               >
                 <Image 
                   source={!showConfirmPassword ? require('./assets/eyeoff.png') : require('./assets/eyeon.png')}
                   style={{ 
                     width: 50, 
                     height: 50,
                     tintColor: '#193a3c'
                   }}
                 />
               </TouchableOpacity>
               {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                 <Text style={{ 
                   color: '#FF6B6B', 
                   marginTop: 8, 
                   fontSize: 13, 
                   fontWeight: 'bold', 
                   textAlign: 'center' 
                 }}>
                   Passwords do not match
                 </Text>
               )}
             </View>
             {/* Change Password Button */}
             <TouchableOpacity
               style={{
                 backgroundColor: isFormValid && !isLoading ? (isDarkMode ? '#4c643b' : '#4c643b') : '#9CA3AF',
                 borderRadius: 25,
                 paddingVertical: 14,
                 paddingHorizontal: 28,
                 alignItems: 'center',
                 marginTop: 15,
                 shadowColor: '#000',
                 shadowOffset: {
                   width: 0,
                   height: 2,
                 },
                 shadowOpacity: 0.25,
                 shadowRadius: 3.84,
                 elevation: 5,
               }}
               onPress={handleChangePassword}
               disabled={!isFormValid || isLoading}
             >
               {isLoading ? (
                 <ActivityIndicator color="white" size="small" />
               ) : (
                 <Text style={{ 
                   color: isDarkMode ? '#f8f9ed' : '#f8f9ed', 
                   fontSize: 16, 
                   fontWeight: '600',
                   letterSpacing: 0.5,
                 }}>
                   Change Password
                 </Text>
               )}
             </TouchableOpacity>

             {/* Cancel Button */}
             <TouchableOpacity
               style={{
                 backgroundColor: isDarkMode ? '#555555' : '#6B7280',
                 borderRadius: 25,
                 paddingVertical: 14,
                 paddingHorizontal: 28,
                 alignItems: 'center',
                 marginTop: 10,
                 shadowColor: '#000',
                 shadowOffset: {
                   width: 0,
                   height: 2,
                 },
                 shadowOpacity: 0.25,
                 shadowRadius: 3.84,
                 elevation: 5,
               }}
               onPress={onClose}
               disabled={isLoading}
             >
               <Text style={{ 
                 color: 'white', 
                 fontSize: 16, 
                 fontWeight: '600',
                 letterSpacing: 0.5,
               }}>
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
