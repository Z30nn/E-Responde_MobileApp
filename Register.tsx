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
} from 'react-native';
import EyeIcon from './assets/eye.svg';
import EyeOffIcon from './assets/eye-off.svg';

const Register = ({ onGoToLogin }: { onGoToLogin?: () => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

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

  const handleRegister = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
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
    Alert.alert('Success', 'Registration successful!', [
      {
        text: 'OK',
        onPress: () => {
          setFormData({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
          });
          if (onGoToLogin) onGoToLogin();
        },
      },
    ]);
  };

  const isFormValid =
    formData.name.trim() &&
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
        source={require('./assets/logo.jpg')}
        style={{
          width: 100,
          height: 100,
          alignSelf: 'center',
        }}
      />
      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 30,
          color: '#333',
        }}>
        E-Responde
      </Text>

      <TextInput
        style={{
          borderBottomWidth: 1,
          borderBottomColor: focusedField === 'name' ? '#000000' : '#D3D3D3',
          padding: 15,
          marginBottom: 15,
          fontSize: 16,
        }}
        placeholder="Full Name"
        value={formData.name}
        onChangeText={value => handleInputChange('name', value)}
        onFocus={() => handleFocus('name')}
        onBlur={handleBlur}
        autoCapitalize="words"
      />

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

      <View style={{ position: 'relative', marginBottom: 15 }}>
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
          style={{
            position: 'absolute',
            right: 15,
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
              <Text key={idx} style={{ color: 'white', fontSize: 13, textAlign: 'center' }}>
                Password must have: {err}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={{ position: 'relative', marginBottom: 25 }}>
        <TextInput
          style={{
            borderBottomWidth: 1,
            borderBottomColor: focusedField === 'confirmPassword' ? '#000000' : '#D3D3D3',
            padding: 15,
            fontSize: 16,
            paddingRight: 50,
          }}
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChangeText={value => handleInputChange('confirmPassword', value)}
          onFocus={() => handleFocus('confirmPassword')}
          onBlur={handleBlur}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity
          style={{
            position: 'absolute',
            right: 15,
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
          <Text style={{ color: 'red', marginBottom: 10, fontSize: 13 }}>
            Passwords do not match
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: isFormValid ? '#007AFF' : '#aaa',
          borderRadius: 8,
          padding: 15,
          alignItems: 'center',
        }}
        onPress={handleRegister}
        disabled={!isFormValid}
      >
        <Text
          style={{
            color: 'white',
            fontSize: 18,
            fontWeight: 'bold',
          }}>
          Register
        </Text>
      </TouchableOpacity>

      <Text
        style={{
          textAlign: 'center',
          marginTop: 20,
          color: '#666',
          fontSize: 14,
        }}>
        Already have an account?{' '}
        <Text
          style={{
            color: '#007AFF',
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