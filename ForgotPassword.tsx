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
} from 'react-native';

const ForgotPassword = ({ onGoToLogin }: { onGoToLogin: () => void }) => {
  const { width } = useWindowDimensions();
  const logoSize = Math.min(width * 0.8, 360);
  const [email, setEmail] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (value: string) => {
    if (!value) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address.';
    return '';
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  const handleResetPassword = () => {
    if (!email.trim() || emailError) {
      Alert.alert('Error', emailError || 'Please enter your email');
      return;
    }
    // TODO: Implement actual password reset logic
    Alert.alert('Success', 'If an account exists with this email, you will receive password reset instructions.');
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
          color: '#333',
        }}>
        Reset Password
      </Text>
      <Text
        style={{
          fontSize: 16,
          textAlign: 'center',
          marginBottom: 30,
          color: '#666',
          paddingHorizontal: 20,
          marginTop: -10,
        }}>
        Enter your email address and we'll send you instructions to reset your password.
      </Text>
      <View style={{ position: 'relative', marginBottom: 15, alignSelf: 'center', width: '80%', marginTop: -40 }}>
        <TextInput
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: '#FFFFFF',
            padding: 15,
            fontSize: 16,
            borderRadius: 8,
            marginTop: 30,
          }}
          placeholder="Email Address"
          placeholderTextColor="#DDDDDD"
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
          backgroundColor: pressed ? '#808080' : '#000000',
          borderRadius: 15,
          padding: 15,
          alignItems: 'center',
          alignSelf: 'center',
          width: '50%',
          marginTop: 60,
        })}
        onPress={handleResetPassword}
        disabled={!email || !!emailError}
      >
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Reset Password</Text>
      </Pressable>
      <Text
        style={{ textAlign: 'center', marginTop: 20, color: '#666', fontSize: 14 }}
      >
        Remember your password?{' '}
        <Text
          style={{ color: '#1E3A8A', fontWeight: 'bold' }}
          onPress={onGoToLogin}
        >
          Log In
        </Text>
      </Text>
    </ScrollView>
  );
};

export default ForgotPassword;
