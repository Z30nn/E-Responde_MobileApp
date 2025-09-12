import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebaseConfig';
import { FirebaseService } from './firebaseService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Listen to Firebase auth state changes - Firebase handles persistence automatically
  useEffect(() => {
    console.log('AuthProvider: Setting up Firebase auth state listener');
    
    // Add a small delay to ensure Firebase is fully initialized
    const initTimer = setTimeout(() => {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        try {
          console.log('AuthProvider: Firebase auth state changed, user:', firebaseUser ? firebaseUser.email : 'null');
          console.log('AuthProvider: User UID:', firebaseUser ? firebaseUser.uid : 'null');
          
          if (firebaseUser) {
            setUser(firebaseUser);
            console.log('AuthProvider: User authenticated via Firebase persistence');
          } else {
            setUser(null);
            console.log('AuthProvider: User not authenticated');
          }
        } catch (error) {
          console.error('Error handling Firebase auth state change:', error);
        } finally {
          setIsLoading(false);
          console.log('AuthProvider: Auth loading completed');
        }
      });

      return () => unsubscribe();
    }, 500); // Wait 500ms for Firebase to initialize

    return () => clearTimeout(initTimer);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await FirebaseService.loginCivilian({ email, password });
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

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
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
