import React, { FC, useState, useEffect } from 'react';
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
import { FirebaseService } from '../../services/firebaseService';
import EmailVerification from '../../components/email-verification';
import { createStyles } from './styles';

interface RegisterProps {
  onGoToLogin?: () => void;
}

const Register: FC<RegisterProps> = ({ onGoToLogin }) => {
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
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const styles = createStyles();

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
    const cleaned = text.replace(/\D/g, '');

    if (cleaned.startsWith('63')) {
      const digitsAfter63 = cleaned.substring(2);
      const limitedDigits = digitsAfter63.substring(0, 10);
      return '+' + '63' + limitedDigits;
    }
    if (cleaned.length > 0 && !cleaned.startsWith('63')) {
      const limitedDigits = cleaned.substring(0, 10);
      return '+63' + limitedDigits;
    }
    if (cleaned.length === 0) {
      return '';
    }
    if (cleaned.startsWith('0')) {
      const digitsAfter0 = cleaned.substring(1);
      const limitedDigits = digitsAfter0.substring(0, 10);
      return '+63' + limitedDigits;
    }

    const limitedDigits = cleaned.substring(0, 10);
    return '+63' + limitedDigits;
  };

  const validateContactNumber = (contactNumber: string) => {
    if (!contactNumber) return 'Contact number is required.';
    const trimmedNumber = contactNumber.trim();
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
      const userExists = await FirebaseService.checkCivilianUser(formData.email);
      if (userExists) {
        Alert.alert('Error', 'An account with this email already exists');
        return;
      }

      const userCredential = await FirebaseService.registerCivilian({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        contactNumber: formData.contactNumber.trim(),
        password: formData.password,
      });

      // Send email verification after successful registration
      if (userCredential.user) {
        try {
          await FirebaseService.sendEmailVerification(userCredential.user);
          setRegisteredEmail(formData.email.trim());
          setShowEmailVerification(true);
        } catch (verificationError) {
          console.error('Email verification error:', verificationError);
          // Still show verification screen even if sending fails
          setRegisteredEmail(formData.email.trim());
          setShowEmailVerification(true);
        }
      }
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

  const handleVerificationComplete = () => {
    setShowEmailVerification(false);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      contactNumber: '',
      password: '',
      confirmPassword: '',
    });
    if (onGoToLogin) onGoToLogin();
  };

  const handleGoToLogin = () => {
    setShowEmailVerification(false);
    if (onGoToLogin) onGoToLogin();
  };

  const isFormValid =
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    !emailError &&
    !contactNumberError &&
    !passwordErrors.length &&
    formData.password === formData.confirmPassword;

  if (showEmailVerification) {
    return (
      <EmailVerification
        userEmail={registeredEmail}
        onVerificationComplete={handleVerificationComplete}
        onGoToLogin={handleGoToLogin}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={false}
      >
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Create an Account</Text>

          <View style={styles.formFields}>
            <TextInput
              style={styles.input}
              placeholderTextColor="#9CA3AF"
              placeholder="First Name"
              value={formData.firstName}
              onChangeText={value => handleInputChange('firstName', value)}
              onFocus={() => handleFocus('firstName')}
              onBlur={handleBlur}
              autoCapitalize="words"
            />

            <TextInput
              style={styles.input}
              placeholderTextColor="#9CA3AF"
              placeholder="Last Name"
              value={formData.lastName}
              onChangeText={value => handleInputChange('lastName', value)}
              onFocus={() => handleFocus('lastName')}
              onBlur={handleBlur}
              autoCapitalize="words"
            />

            <TextInput
              style={styles.input}
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
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#9CA3AF"
              value={formData.email}
              onChangeText={value => handleInputChange('email', value)}
              onFocus={() => handleFocus('email')}
              onBlur={handleBlur}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={formData.password}
                onChangeText={value => handleInputChange('password', value)}
                onFocus={() => handleFocus('password')}
                onBlur={handleBlur}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Image
                  source={!showPassword ? require('../../assets/eyeoff.png') : require('../../assets/eyeon.png')}
                  style={styles.eyeIcon}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm Password"
                placeholderTextColor="#9CA3AF"
                value={formData.confirmPassword}
                onChangeText={value => handleInputChange('confirmPassword', value)}
                onFocus={() => handleFocus('confirmPassword')}
                onBlur={handleBlur}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Image
                  source={!showConfirmPassword ? require('../../assets/eyeoff.png') : require('../../assets/eyeon.png')}
                  style={styles.eyeIcon}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.registerButton,
                (!isFormValid || isLoading) && styles.registerButtonDisabled
              ]}
              onPress={handleRegister}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.registerButtonText}>Sign Up</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Text style={styles.footerLink} onPress={onGoToLogin}>
            Login
          </Text>
        </Text>
      </ScrollView>
    </View>
  );
};

export default Register;

