import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { FirebaseService } from './firebaseService';

interface AuthContextType {
  user: User | null;
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
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;
  const isEmailVerified = user?.emailVerified || false;

  // Listen to Firebase auth state changes - Firebase handles persistence automatically
  useEffect(() => {
    console.log('AuthProvider: Setting up Firebase auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('AuthProvider: Firebase auth state changed, user:', firebaseUser ? firebaseUser.email : 'null');
      setUser(firebaseUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const userCredential = await FirebaseService.loginCivilian({ email, password });
      
      // Check if email is verified
      if (userCredential.user && !userCredential.user.emailVerified) {
        throw { code: 'auth/email-not-verified' };
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
