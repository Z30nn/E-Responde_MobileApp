import React, { FC, useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  View,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Register from '../register';
import ForgotPassword from '../forgot-password';
import EmailVerification from '../../components/email-verification';
import { useAuth } from '../../services/authContext';
import { createStyles } from './styles';

const Login: FC = () => {
  const { width } = useWindowDimensions();
  const [showSignUp, setShowSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const styles = createStyles();

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
        // Show email verification screen for unverified users
        setUserEmail(formData.email);
        setShowEmailVerification(true);
        setIsLoading(false);
        return;
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
    // User can now login normally
  };

  const handleGoToLogin = () => {
    setShowEmailVerification(false);
  };

  const isFormValid = formData.email && !emailError && formData.password;

  return (
    showEmailVerification ? (
      <EmailVerification
        userEmail={userEmail}
        onVerificationComplete={handleVerificationComplete}
        onGoToLogin={handleGoToLogin}
      />
    ) : showForgotPassword ? (
      <ForgotPassword onGoToLogin={() => setShowForgotPassword(false)} />
    ) : showSignUp ? (
      <Register onGoToLogin={() => setShowSignUp(false)} />
    ) : (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Form Title */}
            <Text style={styles.formTitle}>
              Sign In
            </Text>

            {/* Form Fields */}
            <View style={styles.formFields}>
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

              <Text
                style={styles.forgotPasswordText}
                onPress={() => setShowForgotPassword(true)}
              >
                Forgot Password?
              </Text>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  (!isFormValid || isLoading) && styles.loginButtonDisabled
                ]}
                onPress={handleLogin}
                disabled={!isFormValid || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>
                    Sign In
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Text */}
          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text
              style={styles.footerLink}
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

