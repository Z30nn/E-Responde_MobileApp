/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {
  Text,
  TextInput,
  ScrollView,
  Image,
  View,
  Alert,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { FirebaseService } from './services/firebaseService';
import { useLanguage } from './services/languageContext';

const ForgotPassword = ({ onGoToLogin }: { onGoToLogin: () => void }) => {
  const { width } = useWindowDimensions();
  const logoSize = Math.min(width * 0.8, 360);
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (value: string) => {
    if (!value) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address.';
    return '';
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  const handleResetPassword = async () => {
    if (!email.trim() || emailError) {
      Alert.alert(t('common.error'), emailError || t('message.invalidEmail'));
      return;
    }

    setIsLoading(true);
    try {
      await FirebaseService.resetPassword(email.trim());
      Alert.alert(
        t('common.success'), 
        t('message.passwordResetSent'),
        [
          {
            text: t('common.ok'),
            onPress: () => onGoToLogin()
          }
        ]
      );
    } catch (error: any) {
      let errorMessage = 'Failed to send password reset email. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#2d3480',
      marginTop: -50,
      marginBottom: -50,
    }}>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          paddingTop: 30,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Form Container */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 25,
          padding: 25,
          marginTop: 50,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 12,
          borderWidth: 1,
          borderColor: 'rgba(71, 94, 61, 0.1)',
        }}>

          {/* Form Title */}
          <Text style={{
            fontSize: 20,
            fontWeight: '900',
            color: '#475e3d',
            textAlign: 'center',
            marginBottom: 20,
            letterSpacing: 0.5,
          }}>
            Reset Password
          </Text>
          {/* Form Fields */}
          <View style={{ gap: 18 }}>
            <TextInput
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                paddingVertical: 12,
                paddingHorizontal: 16,
                fontSize: 14,
                borderRadius: 25,
                color: '#1F2937',
              }}
              placeholder="Email Address"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={handleEmailChange}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailError && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: -10 }}>
                {emailError}
              </Text>
            )}
          </View>

          {/* Reset Password Button */}
          <Pressable
            style={({ pressed }) => ({
              backgroundColor: email && !emailError && !isLoading ? '#4c643b' : '#9CA3AF',
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
            })}
            onPress={handleResetPassword}
            disabled={!email || !!emailError || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={{ 
                color: '#f8f9ed', 
                fontSize: 16, 
                fontWeight: '600',
                letterSpacing: 0.5,
              }}>
                Reset Password
              </Text>
            )}
          </Pressable>

          {/* Footer Text */}
            <Text
              style={{
                textAlign: 'center',
                marginTop: 15,
                color: '#4c643b',
                fontSize: 16,
              }}>
            Remember your password?{' '}
            <Text
              style={{
                color: '#4c643b',
                fontWeight: 'bold',
              }}
              onPress={onGoToLogin}
            >
              Log In
            </Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default ForgotPassword;
