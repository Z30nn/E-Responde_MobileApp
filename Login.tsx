/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  View,
} from 'react-native';
import EyeIcon from './assets/eye.svg';
import EyeOffIcon from './assets/eye-off.svg';
import Register from './Register';

const Login = () => {
  const [showRegister, setShowRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string) => {
    if (!email) return 'Email is required.';
    if (!/^[^\s@]+@[^ 0-9]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    return '';
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'email') setEmailError(validateEmail(value));
  };

  const handleFocus = (field: string) => {
    setFocusedField(field);
  };
  const handleBlur = () => {
    setFocusedField(null);
  };

  const handleLogin = () => {
    if (!formData.email.trim() || emailError) {
      alert(emailError || 'Please enter your email');
      return;
    }
    if (!formData.password) {
      alert('Please enter your password');
      return;
    }
    // TODO: Implement actual login logic
    alert('Login successful!');
  };

  const isFormValid = formData.email && !emailError && formData.password;

  return (
    showRegister ? (
      <Register onGoToLogin={() => setShowRegister(false)} />
    ) : (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#ffffff' }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
      >
        <Image
          source={require('./assets/logo.jpg')}
          style={{ width: 100, height: 100, alignSelf: 'center' }}
        />
        <Text
          style={{
            fontSize: 24,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 30,
            color: '#333',
          }}
        >
          E-Responde
        </Text>
        <View style={{ position: 'relative', marginBottom: 15 }}>
          <TextInput
            style={{
              borderBottomWidth: 1,
              borderBottomColor: focusedField === 'email' ? '#000000' : '#D3D3D3',
              padding: 15,
              fontSize: 16,
            }}
            placeholder="Email Address"
            value={formData.email}
            onChangeText={value => handleInputChange('email', value)}
            onFocus={() => handleFocus('email')}
            onBlur={handleBlur}
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
        <View style={{ position: 'relative', marginBottom: 25 }}>
          <TextInput
            style={{
              borderBottomWidth: 1,
              borderBottomColor: focusedField === 'password' ? '#000000' : '#D3D3D3',
              padding: 15,
              fontSize: 16,
              paddingRight: 50,
            }}
            placeholder="Password"
            value={formData.password}
            onChangeText={value => handleInputChange('password', value)}
            onFocus={() => handleFocus('password')}
            onBlur={handleBlur}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={{ position: 'absolute', right: 15, top: 15, padding: 5 }}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOffIcon width={24} height={24} />
            ) : (
              <EyeIcon width={24} height={24} />
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: isFormValid ? '#007AFF' : '#aaa',
            borderRadius: 8,
            padding: 15,
            alignItems: 'center',
          }}
          onPress={handleLogin}
          disabled={!isFormValid}
        >
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Log In</Text>
        </TouchableOpacity>
        <Text
          style={{ textAlign: 'center', marginTop: 20, color: '#666', fontSize: 14 }}
        >
          Don't have an account?{' '}
          <Text
            style={{ color: '#007AFF', fontWeight: 'bold' }}
            onPress={() => setShowRegister(true)}
          >
            Register
          </Text>
        </Text>
      </ScrollView>
    )
  );
};

export default Login; 