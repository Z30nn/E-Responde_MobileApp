import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { Alert } from 'react-native';
import { auth, database } from '../firebaseConfig';
import { FirebaseService } from './firebaseService';

interface AuthContextType {
  user: User | null;
  userType: 'police' | 'civilian' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<'police' | 'civilian' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;
  const isEmailVerified = user?.emailVerified || false;

  // Listen to Firebase auth state changes - Firebase handles persistence automatically
  useEffect(() => {
    console.log('AuthProvider: Setting up Firebase auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('AuthProvider: Firebase auth state changed, user:', firebaseUser ? firebaseUser.email : 'null');
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Determine user type
        const type = await FirebaseService.getUserType(firebaseUser.uid);
        console.log('AuthProvider: User type:', type);
        setUserType(type);
      } else {
        setUserType(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Monitor suspension status for currently logged-in civilian users
  useEffect(() => {
    if (!user || userType !== 'civilian') {
      console.log('AuthProvider: Skipping suspension listener - not a civilian user');
      return; // Only monitor civilian users
    }

    console.log('AuthProvider: Setting up suspension listener for user:', user.uid);
    
    // Listen to suspension status changes in real-time
    const suspensionRef = ref(database, `civilian/civilian account/${user.uid}/isSuspended`);
    
    const handleSuspensionChange = (snapshot: any) => {
      const isSuspended = snapshot.val();
      
      console.log('AuthProvider: Suspension status changed:', isSuspended);
      
      if (isSuspended === true) {
        console.log('AuthProvider: User has been suspended, forcing logout');
        
        // Immediately sign out without waiting for user to click OK
        signOut(auth).then(() => {
          console.log('AuthProvider: User signed out due to suspension');
        }).catch((error) => {
          console.error('Error signing out suspended user:', error);
        });
        
        // Show alert to inform user (after logout starts)
        setTimeout(() => {
          Alert.alert(
            'Account Suspended',
            'Your account has been suspended by an administrator. Please contact support for more information.',
            [{ text: 'OK' }]
          );
        }, 100);
      }
    };
    
    // Attach listener with error handling
    const unsubscribe = onValue(
      suspensionRef, 
      handleSuspensionChange,
      (error) => {
        console.error('AuthProvider: Error in suspension listener:', error);
      }
    );
    
    // Cleanup listener on unmount or when user changes
    return () => {
      console.log('AuthProvider: Cleaning up suspension listener');
      unsubscribe();
    };
  }, [user, userType]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Try to authenticate first, then determine user type
      let userCredential;
      let isPolice = false;
      
      try {
        // First try police login
        userCredential = await FirebaseService.loginPolice({ email, password });
        isPolice = true;
        console.log('AuthProvider: Police login successful, skipping email verification');
      } catch (policeError) {
        console.log('AuthProvider: Police login failed, trying civilian login');
        
        // If police login fails, try civilian login
        try {
          userCredential = await FirebaseService.loginCivilian({ email, password });
          isPolice = false;
          
          // Check if email is verified for civilians only
          if (userCredential.user && !userCredential.user.emailVerified) {
            // Sign out the user immediately if email is not verified
            await signOut(auth);
            throw { code: 'auth/email-not-verified', message: 'Please verify your email before logging in.' };
          }
        } catch (civilianError) {
          // If both fail, throw the original error
          throw policeError;
        }
      }
      
      // Firebase Auth will handle setting the user state via onAuthStateChanged
      console.log('AuthProvider: Login successful, waiting for auth state change');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      // Firebase Auth will handle clearing the user state via onAuthStateChanged
      console.log('AuthProvider: Logout successful, waiting for auth state change');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendEmailVerification = async () => {
    if (!user) {
      throw new Error('No authenticated user found');
    }
    await FirebaseService.sendEmailVerification(user);
  };

  const reloadUser = async () => {
    if (!user) {
      throw new Error('No authenticated user found');
    }
    await FirebaseService.reloadUser(user);
  };

  const value: AuthContextType = {
    user,
    userType,
    isLoading,
    isAuthenticated,
    isEmailVerified,
    login,
    logout,
    sendEmailVerification,
    reloadUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
