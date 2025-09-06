/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  View,
  Alert,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import EyeIcon from './assets/eye.svg';
import EyeOffIcon from './assets/eye-off.svg';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import { FirebaseService } from './services/firebaseService';
import Dashboard from './Dashboard';

const Login = () => {
  const { width } = useWindowDimensions();
  const logoSize = Math.min(width * 0.8, 360);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

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

  const handleLogin = async () => {
    if (!formData.email.trim() || emailError) {
      Alert.alert('Error', emailError || 'Please enter your email');
      return;
    }
    if (!formData.password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      // Login with Firebase
      await FirebaseService.loginCivilian({
        email: formData.email.trim(),
        password: formData.password,
      });

      // Automatically navigate to Dashboard screen
      setShowDashboard(true);
    } catch (error: any) {
      let errorMessage = 'Login failed. Please check your credentials.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.email && !emailError && formData.password;

  return (
    showDashboard ? (
      <Dashboard onLogout={() => setShowDashboard(false)} />
    ) : showForgotPassword ? (
      <ForgotPassword onGoToLogin={() => setShowForgotPassword(false)} />
    ) : showSignUp ? (
      <Register onGoToLogin={() => setShowSignUp(false)} />
    ) : (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#ffffff' }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
      >
        <Image
          source={require('./assets/loginlogo.png')}
          style={{ width: logoSize, height: logoSize, alignSelf: 'center', marginTop: -80 }}
        />
        <View style={{ position: 'relative', marginBottom: 15, alignSelf: 'center', width: '80%', marginTop: -40 }}>
          <TextInput
            style={{
              backgroundColor: 'rgba(30, 58, 138, 0.31)',
              color: '#1E3A8A',
              padding: 15,
              fontSize: 16,
              borderRadius: 8,
              fontWeight: '500',
            }}
            placeholder="Email Address"
            placeholderTextColor="#1E3A8A"
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
        <View style={{ position: 'relative', marginBottom: 65, alignSelf: 'center', width: '80%' }}>
          <TextInput
            style={{
              backgroundColor: 'rgba(30, 58, 138, 0.31)',
              color: '#1E3A8A',
              padding: 15,
              fontSize: 16,
              paddingRight: 50,
              borderRadius: 8,
              fontWeight: '500',
            }}
            placeholder="Password"
            placeholderTextColor="#1E3A8A"
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
          <Text
            style={{ 
              color: '#1E3A8A',
              fontWeight: 'bold',
              textAlign: 'right',
              marginTop: 8,
              fontSize: 14,
            }}
            onPress={() => setShowForgotPassword(true)}
          >
            Forgot Password?
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#aaa' : (isFormValid && !isLoading ? '#1E3A8A' : '#aaa'),
            borderRadius: 15,
            padding: 15,
            alignItems: 'center',
            alignSelf: 'center',
            width: '50%',
            marginTop: 60,
          })}
          onPress={handleLogin}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Log In</Text>
          )}
        </Pressable>
        <Text
          style={{ textAlign: 'center', marginTop: 20, color: '#000000', fontSize: 14 }}
        >
          Don't have an account?{' '}
          <Text
            style={{ color: '#1E3A8A', fontWeight: 'bold' }}
            onPress={() => setShowSignUp(true)}
          >
            Register
          </Text>
        </Text>
      </ScrollView>
    )
  );
};

export default Login; 