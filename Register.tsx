/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect} from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  View,
  ActivityIndicator,
} from 'react-native';
import { FirebaseService } from './services/firebaseService';

const Register = ({ onGoToLogin }: { onGoToLogin?: () => void }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [contactNumberError, setContactNumberError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setEmailError(validateEmail(formData.email));
    setContactNumberError(validateContactNumber(formData.contactNumber));
    setPasswordErrors(getPasswordErrors(formData.password));
  }, [formData.email, formData.contactNumber, formData.password]);

  const validateEmail = (email: string) => {
    if (!email) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    return '';
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, '');
    
    // If it starts with 63, add + prefix
    if (cleaned.startsWith('63')) {
      return '+' + cleaned;
    }
    // If it doesn't start with 63, add +63 prefix
    if (cleaned.length > 0 && !cleaned.startsWith('63')) {
      return '+63' + cleaned;
    }
    // If empty, return empty
    if (cleaned.length === 0) {
      return '';
    }
    // If it starts with 0, replace with +63
    if (cleaned.startsWith('0')) {
      return '+63' + cleaned.substring(1);
    }
    
    return '+' + cleaned;
  };

  const validateContactNumber = (contactNumber: string) => {
    if (!contactNumber) return 'Contact number is required.';
    const trimmedNumber = contactNumber.trim();
    // Philippine phone number: +63 followed by 10 digits (total 13 characters)
    if (!/^\+63[0-9]{10}$/.test(trimmedNumber)) {
      return 'Please enter a valid Philippine phone number (+63 followed by 10 digits).';
    }
    return '';
  };

  const getPasswordErrors = (password: string) => {
    const errors = [];
    if (password.length < 8 || password.length > 20) errors.push('8-20 characters');
    if (!/[A-Z]/.test(password)) errors.push('1 uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('1 lowercase letter');
    if (!/\d/.test(password)) errors.push('1 number');
    if (!/[^A-Za-z\d]/.test(password)) errors.push('1 special character');
    return errors;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFocus = (field: string) => {
    setFocusedField(field);
  };

  const handleBlur = () => {
    setFocusedField(null);
  };

  const handleRegister = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      Alert.alert('Error', 'Please enter your first and last name');
      return;
    }
    if (emailError) {
      Alert.alert('Error', emailError);
      return;
    }
    if (contactNumberError) {
      Alert.alert('Error', contactNumberError);
      return;
    }
    if (passwordErrors.length > 0) {
      Alert.alert('Error', 'Password must have: ' + passwordErrors.join(', '));
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      // Check if user already exists
      const userExists = await FirebaseService.checkCivilianUser(formData.email);
      if (userExists) {
        Alert.alert('Error', 'An account with this email already exists');
        return;
      }

      // Register user with Firebase
      await FirebaseService.registerCivilian({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        contactNumber: formData.contactNumber.trim(),
        password: formData.password,
      });

      Alert.alert('Success', 'Registration successful!', [
        {
          text: 'OK',
          onPress: () => {
            setFormData({
              firstName: '',
              lastName: '',
              email: '',
              contactNumber: '',
              password: '',
              confirmPassword: '',
            });
            if (onGoToLogin) onGoToLogin();
          },
        },
      ]);
    } catch (error: any) {
      let errorMessage = 'Registration failed. Please try again.';
      console.error('Registration error details:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password authentication is not enabled. Please contact support.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    !emailError &&
    !contactNumberError &&
    !passwordErrors.length &&
    formData.password === formData.confirmPassword;

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
          padding: 20,
          paddingTop: 0,
          paddingBottom: 50,
        }}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={false}
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
            Create an Account
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
              placeholderTextColor="#9CA3AF"
              placeholder="First Name"
              value={formData.firstName}
              onChangeText={value => handleInputChange('firstName', value)}
              onFocus={() => handleFocus('firstName')}
              onBlur={handleBlur}
              autoCapitalize="words"
            />

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
              placeholderTextColor="#9CA3AF"
              placeholder="Last Name"
              value={formData.lastName}
              onChangeText={value => handleInputChange('lastName', value)}
              onFocus={() => handleFocus('lastName')}
              onBlur={handleBlur}
              autoCapitalize="words"
            />

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
              placeholder="Phone Number"
              placeholderTextColor="#9CA3AF"
              value={formData.contactNumber}
              onChangeText={value => {
                const formatted = formatPhoneNumber(value);
                handleInputChange('contactNumber', formatted);
              }}
              onFocus={() => handleFocus('contactNumber')}
              onBlur={handleBlur}
              keyboardType="phone-pad"
            />

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
                placeholder="Confirm Password"
                placeholderTextColor="#9CA3AF"
                value={formData.confirmPassword}
                onChangeText={value => handleInputChange('confirmPassword', value)}
                onFocus={() => handleFocus('confirmPassword')}
                onBlur={handleBlur}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  right: 5,
                  top: -5,
                  padding: 5,
                }}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Image 
                  source={!showConfirmPassword ? require('./assets/eyeoff.png') : require('./assets/eyeon.png')}
                  style={{ 
                    width: 50, 
                    height: 50,
                    tintColor: '#193a3c'
                  }}
                />
              </TouchableOpacity>
            </View>

            {/* Register Button */}
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
              onPress={handleRegister}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text
                  style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: '600',
                    letterSpacing: 0.5,
                  }}>
                  Sign Up
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
            fontSize: 16,
          }}>
          Already have an account?{' '}
          <Text
            style={{
              color: '#f8f9ed',
              fontWeight: '600',
            }}
            onPress={onGoToLogin}
          >
            Log In
          </Text>
        </Text>
      </ScrollView>
    </View>
  );
};

export default Register;