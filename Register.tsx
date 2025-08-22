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
import EyeIcon from './assets/eye.svg';
import EyeOffIcon from './assets/eye-off.svg';
import { FirebaseService } from './services/firebaseService';

const Register = ({ onGoToLogin }: { onGoToLogin?: () => void }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setEmailError(validateEmail(formData.email));
    setPasswordErrors(getPasswordErrors(formData.password));
  }, [formData.email, formData.password]);

  const validateEmail = (email: string) => {
    if (!email) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
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
    !passwordErrors.length &&
    formData.password === formData.confirmPassword;

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
      }}>
      <Image
        source={require('./assets/signuplogo.png')}
                  style={{
            width: 300,
            height: 300,
            alignSelf: 'center',
            marginBottom: 40,
        }}
      />

            <TextInput
        style={{
          backgroundColor: 'rgba(30, 58, 138, 0.31)',
          padding: 15,
          marginBottom: 15,
          fontSize: 16,
          borderRadius: 8,
          width: '80%',
          alignSelf: 'center',
          color: '#1E3A8A',
          marginTop: -80,
          fontWeight: '500',
        }}
        placeholderTextColor="#1E3A8A"
        placeholder="First Name"
        value={formData.firstName}
        onChangeText={value => handleInputChange('firstName', value)}
        onFocus={() => handleFocus('firstName')}
        onBlur={handleBlur}
        autoCapitalize="words"
      />

      <TextInput
        style={{
          backgroundColor: 'rgba(30, 58, 138, 0.31)',
          padding: 15,
          marginBottom: 15,
          fontSize: 16,
          borderRadius: 8,
          width: '80%',
          alignSelf: 'center',
          color: '#1E3A8A',
          fontWeight: '500',
        }}
        placeholderTextColor="#1E3A8A"
        placeholder="Last Name"
        value={formData.lastName}
        onChangeText={value => handleInputChange('lastName', value)}
        onFocus={() => handleFocus('lastName')}
        onBlur={handleBlur}
        autoCapitalize="words"
      />

      <View style={{ position: 'relative', marginBottom: 15 }}>
        <TextInput
          style={{
            backgroundColor: 'rgba(30, 58, 138, 0.31)',
            padding: 15,
            fontSize: 16,
            borderRadius: 8,
            width: '80%',
            alignSelf: 'center',
            color: '#1E3A8A',
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
            <Text style={{ color: '#FFFFFF', fontSize: 13, textAlign: 'center', fontWeight: 'bold' }}>{emailError}</Text>
          </View>
        )}
      </View>

      <View style={{ position: 'relative', marginBottom: 15 }}>
        <TextInput
          style={{
            backgroundColor: 'rgba(30, 58, 138, 0.31)',
            padding: 15,
            fontSize: 16,
            paddingRight: 50,
            borderRadius: 8,
            width: '80%',
            alignSelf: 'center',
            color: '#1E3A8A',
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
          style={{
            position: 'absolute',
            right: '14%',
            top: 15,
            padding: 5,
          }}
          onPress={() => setShowPassword(!showPassword)}>
          {showPassword ? (
            <EyeOffIcon width={24} height={24} />
          ) : (
            <EyeIcon width={24} height={24} />
          )}
        </TouchableOpacity>
        {focusedField === 'password' && passwordErrors.length > 0 && (
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
            {passwordErrors.map((err, idx) => (
              <Text key={idx} style={{ color: '#FFFFFF', fontSize: 13, textAlign: 'center', fontWeight: 'bold' }}>
                Password must have: {err}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={{ position: 'relative', marginBottom: 25 }}>
        <TextInput
          style={{
            backgroundColor: 'rgba(30, 58, 138, 0.31)',
            padding: 15,
            fontSize: 16,
            paddingRight: 50,
            borderRadius: 8,
            width: '80%',
            alignSelf: 'center',
            color: '#1E3A8A',
            fontWeight: '500',
          }}
          placeholder="Confirm Password"
          placeholderTextColor="#1E3A8A"
          value={formData.confirmPassword}
          onChangeText={value => handleInputChange('confirmPassword', value)}
          onFocus={() => handleFocus('confirmPassword')}
          onBlur={handleBlur}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity
          style={{
            position: 'absolute',
            right: '14%',
            top: 15,
            padding: 5,
          }}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
          {showConfirmPassword ? (
            <EyeOffIcon width={24} height={24} />
          ) : (
            <EyeIcon width={24} height={24} />
          )}
        </TouchableOpacity>
        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
          <Text style={{ color: '#FFFFFF', marginBottom: 10, fontSize: 13, fontWeight: 'bold' }}>
            Passwords do not match
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: isFormValid && !isLoading ? '#1E3A8A' : '#aaa',
          borderRadius: 15,
          padding: 15,
          marginTop: 60,
          alignItems: 'center',
          alignSelf: 'center',
          width: '50%',
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
              fontSize: 20,
              fontWeight: 'bold',
            }}>
            Register
          </Text>
        )}
      </TouchableOpacity>

      <Text
                  style={{
            textAlign: 'center',
            marginTop: 20,
            color: '#000000',
            fontSize: 14,
          }}>
        Already have an account?{' '}
        <Text
          style={{
            color: '#1E3A8A',
            fontWeight: 'bold',
          }}
          onPress={onGoToLogin}
        >
          Log In
        </Text>
      </Text>
    </ScrollView>
  );
};

export default Register; 