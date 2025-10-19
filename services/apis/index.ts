/**
 * API Layer - Centralized API management
 * All API calls should go through this layer
 */

import { firebaseClient } from './firebase-client';
import { logger } from '../utils/logger';

// Type definitions
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  password: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  uid: string;
  createdAt: string;
}

export interface CrimeReportData {
  crimeType: string;
  dateTime: Date;
  description: string;
  multimedia: string[];
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  anonymous: boolean;
  reporterName: string;
  reporterUid: string;
  status: string;
  createdAt: string;
  severity: 'Immediate' | 'High' | 'Moderate' | 'Low';
  upvotes?: number;
  downvotes?: number;
  userVotes?: { [userId: string]: 'upvote' | 'downvote' };
}

/**
 * Centralized API object
 * All API methods are defined here
 */
export const apis = {
  // ========== Authentication APIs ==========
  auth: {
    login: async (email: string, password: string) => {
      logger.debug('API: Login', email);
      return await firebaseClient.auth.signIn(email, password);
    },

    register: async (data: RegisterData) => {
      logger.debug('API: Register', data.email);
      // Create auth user
      const userCredential = await firebaseClient.auth.signUp(data.email, data.password);

      // Save user profile
      await firebaseClient.database.write(
        `civilian/civilian account/${userCredential.user.uid}`,
        {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          contactNumber: data.contactNumber,
          createdAt: new Date().toISOString(),
          uid: userCredential.user.uid,
        }
      );

      // Create phone mapping
      if (data.contactNumber) {
        await firebaseClient.database.write(
          `phone_mappings/${data.contactNumber}`,
          {
            userId: userCredential.user.uid,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            createdAt: new Date().toISOString(),
          }
        );
      }

      return userCredential;
    },

    resetPassword: async (email: string) => {
      logger.debug('API: Reset password', email);
      return await firebaseClient.auth.resetPassword(email);
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      logger.debug('API: Change password');
      return await firebaseClient.auth.updatePassword(currentPassword, newPassword);
    },

    logout: async () => {
      logger.debug('API: Logout');
      return await firebaseClient.auth.signOut();
    },
  },

  // ========== User Profile APIs ==========
  user: {
    getProfile: async (userId: string): Promise<UserProfile | null> => {
      logger.debug('API: Get user profile', userId);
      return await firebaseClient.database.read(`civilian/civilian account/${userId}`);
    },

    updateProfile: async (userId: string, data: Partial<UserProfile>) => {
      logger.debug('API: Update user profile', userId);
      return await firebaseClient.database.update(`civilian/civilian account/${userId}`, data);
    },

    checkUserExists: async (email: string): Promise<boolean> => {
      logger.debug('API: Check if user exists', email);
      const users = await firebaseClient.database.query('civilian/civilian account', 'email', email);
      return users !== null;
    },
  },

  // ========== Crime Report APIs ==========
  reports: {
    submit: async (report: CrimeReportData) => {
      logger.debug('API: Submit crime report');
      const reportId = await firebaseClient.database.push('crime_reports', {
        ...report,
        dateTime: report.dateTime.toISOString(),
        upvotes: 0,
        downvotes: 0,
        userVotes: {},
      });
      return reportId;
    },

    getByUser: async (userId: string) => {
      logger.debug('API: Get reports by user', userId);
      return await firebaseClient.database.query('crime_reports', 'reporterUid', userId);
    },

    getById: async (reportId: string) => {
      logger.debug('API: Get report by ID', reportId);
      return await firebaseClient.database.read(`crime_reports/${reportId}`);
    },

    getAll: async () => {
      logger.debug('API: Get all reports');
      return await firebaseClient.database.read('crime_reports');
    },

    updateStatus: async (reportId: string, status: string, updatedBy?: string) => {
      logger.debug('API: Update report status', reportId, status);
      // Use FirebaseService to ensure both collections are updated and notifications are sent
      const { FirebaseService } = await import('../firebaseService');
      return await FirebaseService.updateCrimeReportStatus(reportId, status, updatedBy);
    },

    vote: async (reportId: string, userId: string, voteType: 'upvote' | 'downvote') => {
      logger.debug('API: Vote on report', reportId, voteType);
      const report = await firebaseClient.database.read(`crime_reports/${reportId}`);
      if (!report) throw new Error('Report not found');

      const currentVote = report.userVotes?.[userId];
      const updates: any = {};

      if (currentVote === voteType) {
        // Remove vote
        updates[`userVotes/${userId}`] = null;
        updates[voteType === 'upvote' ? 'upvotes' : 'downvotes'] = (report[voteType === 'upvote' ? 'upvotes' : 'downvotes'] || 0) - 1;
      } else {
        // Add or change vote
        if (currentVote) {
          updates[currentVote === 'upvote' ? 'upvotes' : 'downvotes'] = (report[currentVote === 'upvote' ? 'upvotes' : 'downvotes'] || 0) - 1;
        }
        updates[`userVotes/${userId}`] = voteType;
        updates[voteType === 'upvote' ? 'upvotes' : 'downvotes'] = (report[voteType === 'upvote' ? 'upvotes' : 'downvotes'] || 0) + 1;
      }

      return await firebaseClient.database.update(`crime_reports/${reportId}`, updates);
    },
  },

  // ========== Emergency Contacts APIs ==========
  emergencyContacts: {
    getAll: async (userId: string) => {
      logger.debug('API: Get emergency contacts', userId);
      return await firebaseClient.database.read(`civilian/emergency_contacts/${userId}`);
    },

    add: async (userId: string, contact: any) => {
      logger.debug('API: Add emergency contact', userId);
      return await firebaseClient.database.push(`civilian/emergency_contacts/${userId}`, contact);
    },

    update: async (userId: string, contactId: string, data: any) => {
      logger.debug('API: Update emergency contact', userId, contactId);
      return await firebaseClient.database.update(`civilian/emergency_contacts/${userId}/${contactId}`, data);
    },

    delete: async (userId: string, contactId: string) => {
      logger.debug('API: Delete emergency contact', userId, contactId);
      return await firebaseClient.database.delete(`civilian/emergency_contacts/${userId}/${contactId}`);
    },
  },

  // ========== SOS Alerts APIs ==========
  sos: {
    send: async (userId: string, location: any, message: string) => {
      logger.debug('API: Send SOS alert', userId);
      return await firebaseClient.database.push(`civilian/sos_alerts/${userId}`, {
        location,
        message,
        timestamp: new Date().toISOString(),
        status: 'active',
      });
    },

    getByUser: async (userId: string) => {
      logger.debug('API: Get SOS alerts', userId);
      return await firebaseClient.database.read(`civilian/sos_alerts/${userId}`);
    },

    delete: async (userId: string, alertId: string) => {
      logger.debug('API: Delete SOS alert', userId, alertId);
      return await firebaseClient.database.delete(`civilian/sos_alerts/${userId}/${alertId}`);
    },
  },

  // ========== Notifications APIs ==========
  notifications: {
    getByUser: async (userId: string) => {
      logger.debug('API: Get notifications', userId);
      return await firebaseClient.database.read(`civilian/notifications/${userId}`);
    },

    markAsRead: async (userId: string, notificationId: string) => {
      logger.debug('API: Mark notification as read', userId, notificationId);
      return await firebaseClient.database.update(
        `civilian/notifications/${userId}/${notificationId}`,
        { read: true, readAt: new Date().toISOString() }
      );
    },

    delete: async (userId: string, notificationId: string) => {
      logger.debug('API: Delete notification', userId, notificationId);
      return await firebaseClient.database.delete(`civilian/notifications/${userId}/${notificationId}`);
    },
  },

  // ========== Location APIs ==========
  location: {
    reverseGeocode: async (latitude: number, longitude: number): Promise<string> => {
      try {
        logger.debug('API: Reverse geocode', latitude, longitude);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'E-Responde-MobileApp/1.0',
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data && data.display_name) {
          return data.display_name;
        }

        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      } catch (error) {
        logger.error('API: Reverse geocode failed', error);
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }
    },
  },
};

export default apis;

