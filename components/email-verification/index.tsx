import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { FirebaseService } from '../../services/firebaseService';
import { auth } from '../../firebaseConfig';

interface EmailVerificationProps {
  userEmail: string;
  onVerificationComplete: () => void;
  onGoToLogin: () => void;
}

const EmailVerification: React.FC<EmailVerificationProps> = ({
  userEmail,
  onVerificationComplete,
  onGoToLogin,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, []);

  const handleSendVerificationEmail = async () => {
    if (!user) {
      Alert.alert('Error', 'No user found. Please try logging in again.');
      return;
    }

    setIsLoading(true);
    try {
      await FirebaseService.sendEmailVerification(user);
      Alert.alert(
        'Verification Email Sent',
        'A verification email has been sent to your email address. Please check your inbox and spam folder.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Send verification email error:', error);
      let errorMessage = 'Failed to send verification email. Please try again.';
      
      if (error.message === 'Email is already verified') {
        errorMessage = 'Your email is already verified.';
        onVerificationComplete();
        return;
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!user) {
      Alert.alert('Error', 'No user found. Please try logging in again.');
      return;
    }

    setIsCheckingVerification(true);
    try {
      // Reload the user to get the latest verification status from Firebase
      await user.reload();
      
      // Get the updated user from auth
      const updatedUser = auth.currentUser;
      
      if (updatedUser && updatedUser.emailVerified) {
        Alert.alert(
          'Email Verified!',
          'Your email has been successfully verified. You can now login to access all features of the app.',
          [
            {
              text: 'Continue to Login',
              onPress: onVerificationComplete,
            },
          ]
        );
      } else {
        Alert.alert(
          'Not Verified Yet',
          'Your email is not verified yet. Please check your email and click the verification link.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Check verification error:', error);
      Alert.alert('Error', 'Failed to check verification status. Please try again.');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Header */}
        <Text style={styles.title}>Verify Your Email</Text>
        
        {/* Description */}
        <Text style={styles.description}>
          We've sent a verification email to:
        </Text>
        <Text style={styles.emailText}>{userEmail}</Text>
        
        <Text style={styles.subDescription}>
          Please check your email inbox and spam folder, then click the verification link to activate your account.
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleSendVerificationEmail}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Resend Verification Email</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleCheckVerification}
            disabled={isCheckingVerification}
          >
            {isCheckingVerification ? (
              <ActivityIndicator color="#4c643b" size="small" />
            ) : (
              <Text style={styles.secondaryButtonText}>I've Verified My Email</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <TouchableOpacity
          style={styles.footerLink}
          onPress={onGoToLogin}
        >
          <Text style={styles.footerLinkText}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2d3480',
    justifyContent: 'center',
    padding: 20,
  },
  contentContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#475e3d',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4c643b',
    textAlign: 'center',
    marginBottom: 20,
  },
  subDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  primaryButton: {
    backgroundColor: '#4c643b',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#4c643b',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButtonText: {
    color: '#4c643b',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerLink: {
    marginTop: 20,
  },
  footerLinkText: {
    color: '#4c643b',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default EmailVerification;
