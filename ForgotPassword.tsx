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
    <ScrollView
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
    >
      <Image
        source={require('./assets/loginlogo.png')}
        style={{ width: logoSize, height: logoSize, alignSelf: 'center', marginTop: -80 }}
      />
      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 40,
          marginTop: -60,
          color: '#1E3A8A',
        }}>
        {t('auth.resetPassword')}
      </Text>
      <Text
        style={{
          fontSize: 16,
          textAlign: 'center',
          marginBottom: 30,
          color: '#000000',
          paddingHorizontal: 20,
          marginTop: -10,
        }}>
        {t('auth.forgotPasswordDesc')}
      </Text>
      <View style={{ position: 'relative', marginBottom: 15, alignSelf: 'center', width: '80%', marginTop: -40 }}>
        <TextInput
          style={{
            backgroundColor: 'rgba(30, 58, 138, 0.31)',
            color: '#1E3A8A',
            padding: 15,
            fontSize: 16,
            borderRadius: 8,
            marginTop: 30,
            fontWeight: '500',
          }}
          placeholder={t('auth.email')}
          placeholderTextColor="#1E3A8A"
          value={email}
          onChangeText={handleEmailChange}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {focusedField === 'email' && emailError && (
          <View style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 60,
            backgroundColor: 'rgba(0,0,0,0.85)',
            padding: 8,
            borderRadius: 6,
            zIndex: 10,
          }}>
            <Text style={{ color: 'white', fontSize: 13, textAlign: 'center' }}>{emailError}</Text>
          </View>
        )}
      </View>
      <Pressable
        style={({ pressed }) => ({
          backgroundColor: pressed ? '#aaa' : (email && !emailError && !isLoading ? '#1E3A8A' : '#aaa'),
          borderRadius: 15,
          padding: 15,
          alignItems: 'center',
          alignSelf: 'center',
          width: '50%',
          marginTop: 60,
        })}
        onPress={handleResetPassword}
        disabled={!email || !!emailError || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>{t('auth.resetPassword')}</Text>
        )}
      </Pressable>
      <Text
        style={{ textAlign: 'center', marginTop: 20, color: '#000000', fontSize: 14 }}
      >
        {t('auth.rememberPassword')}{' '}
        <Text
          style={{ color: '#1E3A8A', fontWeight: 'bold' }}
          onPress={onGoToLogin}
        >
          {t('auth.login')}
        </Text>
      </Text>
    </ScrollView>
  );
};

export default ForgotPassword;
