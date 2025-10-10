/**
 * Firebase Client Wrapper
 * Centralizes all Firebase operations
 */

import { auth, database } from '../../firebaseConfig';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  UserCredential,
} from 'firebase/auth';
import {
  ref,
  set,
  get,
  push,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  onValue,
  off,
} from 'firebase/database';
import { logger } from '../utils/logger';

export const firebaseClient = {
  // Authentication
  auth: {
    signIn: async (email: string, password: string): Promise<UserCredential> => {
      try {
        logger.debug('FirebaseClient: Signing in user', email);
        return await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        logger.error('FirebaseClient: Sign in failed', error);
        throw error;
      }
    },

    signUp: async (email: string, password: string): Promise<UserCredential> => {
      try {
        logger.debug('FirebaseClient: Creating new user', email);
        return await createUserWithEmailAndPassword(auth, email, password);
      } catch (error) {
        logger.error('FirebaseClient: Sign up failed', error);
        throw error;
      }
    },

    resetPassword: async (email: string): Promise<void> => {
      try {
        logger.debug('FirebaseClient: Sending password reset email', email);
        return await sendPasswordResetEmail(auth, email);
      } catch (error) {
        logger.error('FirebaseClient: Password reset failed', error);
        throw error;
      }
    },

    updatePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
      try {
        const user = auth.currentUser;
        if (!user || !user.email) {
          throw new Error('No user logged in');
        }

        logger.debug('FirebaseClient: Updating password for user', user.email);

        // Re-authenticate user
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        // Update password
        return await updatePassword(user, newPassword);
      } catch (error) {
        logger.error('FirebaseClient: Password update failed', error);
        throw error;
      }
    },

    signOut: async (): Promise<void> => {
      try {
        logger.debug('FirebaseClient: Signing out user');
        return await auth.signOut();
      } catch (error) {
        logger.error('FirebaseClient: Sign out failed', error);
        throw error;
      }
    },

    getCurrentUser: () => {
      return auth.currentUser;
    },
  },

  // Database Operations
  database: {
    // Read operations
    read: async (path: string) => {
      try {
        logger.debug('FirebaseClient: Reading from path', path);
        const dbRef = ref(database, path);
        const snapshot = await get(dbRef);
        return snapshot.exists() ? snapshot.val() : null;
      } catch (error) {
        logger.error('FirebaseClient: Read failed', path, error);
        throw error;
      }
    },

    // Write operations
    write: async (path: string, data: any) => {
      try {
        logger.debug('FirebaseClient: Writing to path', path);
        const dbRef = ref(database, path);
        return await set(dbRef, data);
      } catch (error) {
        logger.error('FirebaseClient: Write failed', path, error);
        throw error;
      }
    },

    // Update operations
    update: async (path: string, data: any) => {
      try {
        logger.debug('FirebaseClient: Updating path', path);
        const dbRef = ref(database, path);
        return await update(dbRef, data);
      } catch (error) {
        logger.error('FirebaseClient: Update failed', path, error);
        throw error;
      }
    },

    // Delete operations
    delete: async (path: string) => {
      try {
        logger.debug('FirebaseClient: Deleting path', path);
        const dbRef = ref(database, path);
        return await remove(dbRef);
      } catch (error) {
        logger.error('FirebaseClient: Delete failed', path, error);
        throw error;
      }
    },

    // Push operation (generates unique ID)
    push: async (path: string, data: any) => {
      try {
        logger.debug('FirebaseClient: Pushing to path', path);
        const dbRef = ref(database, path);
        const newRef = push(dbRef);
        await set(newRef, data);
        return newRef.key;
      } catch (error) {
        logger.error('FirebaseClient: Push failed', path, error);
        throw error;
      }
    },

    // Query operations
    query: async (path: string, orderBy: string, equalToValue: any) => {
      try {
        logger.debug('FirebaseClient: Querying path', path, orderBy, equalToValue);
        const dbRef = ref(database, path);
        const q = query(dbRef, orderByChild(orderBy), equalTo(equalToValue));
        const snapshot = await get(q);
        return snapshot.exists() ? snapshot.val() : null;
      } catch (error) {
        logger.error('FirebaseClient: Query failed', path, error);
        throw error;
      }
    },

    // Real-time listeners
    listen: (path: string, callback: (data: any) => void) => {
      logger.debug('FirebaseClient: Setting up listener for path', path);
      const dbRef = ref(database, path);
      onValue(dbRef, (snapshot) => {
        callback(snapshot.exists() ? snapshot.val() : null);
      });
    },

    unlisten: (path: string) => {
      logger.debug('FirebaseClient: Removing listener for path', path);
      const dbRef = ref(database, path);
      off(dbRef);
    },
  },
};

export default firebaseClient;

