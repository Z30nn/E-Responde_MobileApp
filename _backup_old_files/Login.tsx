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
import Register from './Register';
import ForgotPassword from '../ForgotPassword';
import { useAuth } from '../services/authContext';
import EmailVerification from '../components/email-verification';

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
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const { login } = useAuth();

  const validateEmail = (email: string) => {
    if (!email) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
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
    if (emailError) {
      Alert.alert('Error', emailError);
      return;
    }
    if (!formData.password) {
      Alert.alert('Error', 'Password is required');
      return;
    }

    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
    } catch (error: any) {
      let errorMessage = 'Login failed. Please try again.';
      console.error('Login error details:', error);
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection';
      } else if (error.code === 'auth/email-not-verified') {
        // Handle unverified email
        setUserEmail(formData.email);
        setShowEmailVerification(true);
        return;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.email && !emailError && formData.password;

  const handleVerificationComplete = () => {
    setShowEmailVerification(false);
    // User can now proceed to login normally
  };

  const handleGoToLogin = () => {
    setShowEmailVerification(false);
  };

  return (
    showForgotPassword ? (
      <ForgotPassword onGoToLogin={() => setShowForgotPassword(false)} />
    ) : showSignUp ? (
      <Register onGoToLogin={() => setShowSignUp(false)} />
    ) : showEmailVerification ? (
      <EmailVerification
        userEmail={userEmail}
        onVerificationComplete={handleVerificationComplete}
        onGoToLogin={handleGoToLogin}
      />
    ) : (
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
              Sign In
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
                value={formData.email}
                onChangeText={value => handleInputChange('email', value)}
                onFocus={() => handleFocus('email')}
                onBlur={handleBlur}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={{ position: 'relative' }}>
                <TextInput
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    paddingRight: 50,
                    fontSize: 14,
                    borderRadius: 25,
                    color: '#1F2937',
                  }}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={formData.password}
                  onChangeText={value => handleInputChange('password', value)}
                  onFocus={() => handleFocus('password')}
                  onBlur={handleBlur}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    right: 5,
                    top: -5,
                    padding: 5,
                  }}
                  onPress={() => setShowPassword(!showPassword)}>
                  <Image 
                    source={!showPassword ? require('./assets/eyeoff.png') : require('./assets/eyeon.png')}
                    style={{ 
                      width: 50, 
                      height: 50,
                      tintColor: '#193a3c'
                    }}
                  />
                </TouchableOpacity>
              </View>

              <Text
                style={{ 
                  color: '#475e3d',
                  fontWeight: '600',
                  textAlign: 'right',
                  marginTop: -5,
                  fontSize: 14,
                }}
                onPress={() => setShowForgotPassword(true)}
              >
                Forgot Password?
              </Text>

              {/* Login Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: isFormValid && !isLoading ? '#4c643b' : '#9CA3AF',
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
                onPress={handleLogin}
                disabled={!isFormValid || isLoading}
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
                    Sign In
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Text */}
          <Text
            style={{ 
              textAlign: 'center', 
              marginTop: 15, 
              color: '#f8f9ed', 
              fontSize: 16 
            }}
          >
            Don't have an account?{' '}
            <Text
              style={{ color: '#f8f9ed', fontWeight: 'bold' }}
              onPress={() => setShowSignUp(true)}
            >
              Register
            </Text>
          </Text>
        </ScrollView>
      </View>
    )
  );
};

export default Login;