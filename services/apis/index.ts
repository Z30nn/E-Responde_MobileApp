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
  barangay: string;
  anonymous: boolean;
  reporterName: string;
  reporterUid: string;
  status: string;
  createdAt: string;
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
      // Check cache first
      const { cache, cacheKeys } = await import('../utils/cache');
      const cacheKey = cacheKeys.userProfile(userId);
      const cached = await cache.get<UserProfile>(cacheKey, true); // Use persistent cache
      
      if (cached) {
        logger.debug('API: Get user profile from cache', userId);
        return cached;
      }

      logger.debug('API: Get user profile', userId);
      const profile = await firebaseClient.database.read(`civilian/civilian account/${userId}`);
      
      // Cache for 5 minutes with persistence
      if (profile) {
        await cache.set(cacheKey, profile, 5 * 60 * 1000, true);
      }
      
      return profile;
    },

    updateProfile: async (userId: string, data: Partial<UserProfile>) => {
      logger.debug('API: Update user profile', userId);
      const result = await firebaseClient.database.update(`civilian/civilian account/${userId}`, data);
      
      // Invalidate cache on update
      const { cache, cacheKeys } = await import('../utils/cache');
      await cache.delete(cacheKeys.userProfile(userId));
      
      return result;
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
      
      // Invalidate relevant caches
      const { cache, cacheKeys } = await import('../utils/cache');
      await cache.delete(cacheKeys.crimeReportsAll());
      if (report.reporterUid) {
        await cache.delete(cacheKeys.crimeReports(report.reporterUid));
      }
      
      return reportId;
    },

    getByUser: async (userId: string) => {
      logger.debug('API: Get reports by user', userId);
      const { cache, cacheKeys } = await import('../utils/cache');
      const cacheKey = cacheKeys.crimeReports(userId);
      
      // Use stale-while-revalidate for better UX
      return await cache.staleWhileRevalidate(
        cacheKey,
        async () => {
          return await firebaseClient.database.query('crime_reports', 'reporterUid', userId);
        },
        5 * 60 * 1000, // 5 minutes fresh
        24 * 60 * 60 * 1000, // 24 hours stale acceptable
        true // persistent
      );
    },

    getById: async (reportId: string) => {
      logger.debug('API: Get report by ID', reportId);
      const { cache, cacheKeys } = await import('../utils/cache');
      const cacheKey = cacheKeys.crimeReport(reportId);
      
      const cached = await cache.get(cacheKey, true);
      if (cached) {
        logger.debug('API: Get report by ID from cache', reportId);
        return cached;
      }
      
      const report = await firebaseClient.database.read(`crime_reports/${reportId}`);
      if (report) {
        await cache.set(cacheKey, report, 10 * 60 * 1000, true); // Cache for 10 minutes
      }
      return report;
    },

    getAll: async () => {
      logger.debug('API: Get all reports');
      const { cache, cacheKeys } = await import('../utils/cache');
      const cacheKey = cacheKeys.crimeReportsAll();
      
      // Use stale-while-revalidate for better UX
      return await cache.staleWhileRevalidate(
        cacheKey,
        async () => {
          return await firebaseClient.database.read('crime_reports');
        },
        5 * 60 * 1000, // 5 minutes fresh
        24 * 60 * 60 * 1000, // 24 hours stale acceptable
        true // persistent
      );
    },

    updateStatus: async (reportId: string, status: string, updatedBy?: string) => {
      logger.debug('API: Update report status', reportId, status);
      // Use FirebaseService to ensure both collections are updated and notifications are sent
      const { FirebaseService } = await import('../firebaseService');
      const result = await FirebaseService.updateCrimeReportStatus(reportId, status, updatedBy);
      
      // Invalidate caches
      const { cache, cacheKeys } = await import('../utils/cache');
      await cache.delete(cacheKeys.crimeReport(reportId));
      await cache.delete(cacheKeys.crimeReportsAll());
      
      return result;
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

      const result = await firebaseClient.database.update(`crime_reports/${reportId}`, updates);
      
      // Invalidate report cache
      const { cache, cacheKeys } = await import('../utils/cache');
      await cache.delete(cacheKeys.crimeReport(reportId));
      
      return result;
    },
  },

  // ========== Emergency Contacts APIs ==========
  emergencyContacts: {
    getAll: async (userId: string) => {
      logger.debug('API: Get emergency contacts', userId);
      const { cache, cacheKeys } = await import('../utils/cache');
      const cacheKey = cacheKeys.emergencyContacts(userId);
      
      const cached = await cache.get(cacheKey, true);
      if (cached) {
        logger.debug('API: Get emergency contacts from cache', userId);
        return cached;
      }
      
      const contacts = await firebaseClient.database.read(`civilian/emergency_contacts/${userId}`);
      if (contacts) {
        await cache.set(cacheKey, contacts, 10 * 60 * 1000, true); // Cache for 10 minutes
      }
      return contacts;
    },

    add: async (userId: string, contact: any) => {
      logger.debug('API: Add emergency contact', userId);
      const result = await firebaseClient.database.push(`civilian/emergency_contacts/${userId}`, contact);
      
      // Invalidate cache
      const { cache, cacheKeys } = await import('../utils/cache');
      await cache.delete(cacheKeys.emergencyContacts(userId));
      
      return result;
    },

    update: async (userId: string, contactId: string, data: any) => {
      logger.debug('API: Update emergency contact', userId, contactId);
      const result = await firebaseClient.database.update(`civilian/emergency_contacts/${userId}/${contactId}`, data);
      
      // Invalidate cache
      const { cache, cacheKeys } = await import('../utils/cache');
      await cache.delete(cacheKeys.emergencyContacts(userId));
      
      return result;
    },

    delete: async (userId: string, contactId: string) => {
      logger.debug('API: Delete emergency contact', userId, contactId);
      const result = await firebaseClient.database.delete(`civilian/emergency_contacts/${userId}/${contactId}`);
      
      // Invalidate cache
      const { cache, cacheKeys } = await import('../utils/cache');
      await cache.delete(cacheKeys.emergencyContacts(userId));
      
      return result;
    },
  },

  // ========== SOS Alerts APIs ==========
  sos: {
    send: async (userId: string, location: any, message: string) => {
      logger.debug('API: Send SOS alert', userId);
      const result = await firebaseClient.database.push(`civilian/sos_alerts/${userId}`, {
        location,
        message,
        timestamp: new Date().toISOString(),
        status: 'active',
      });
      
      // Invalidate cache
      const { cache, cacheKeys } = await import('../utils/cache');
      await cache.delete(cacheKeys.sosAlerts(userId));
      
      return result;
    },

    getByUser: async (userId: string) => {
      logger.debug('API: Get SOS alerts', userId);
      const { cache, cacheKeys } = await import('../utils/cache');
      const cacheKey = cacheKeys.sosAlerts(userId);
      
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.debug('API: Get SOS alerts from cache', userId);
        return cached;
      }
      
      const alerts = await firebaseClient.database.read(`civilian/sos_alerts/${userId}`);
      if (alerts) {
        await cache.set(cacheKey, alerts, 2 * 60 * 1000); // Cache for 2 minutes (SOS alerts change frequently)
      }
      return alerts;
    },

    delete: async (userId: string, alertId: string) => {
      logger.debug('API: Delete SOS alert', userId, alertId);
      const result = await firebaseClient.database.delete(`civilian/sos_alerts/${userId}/${alertId}`);
      
      // Invalidate cache
      const { cache, cacheKeys } = await import('../utils/cache');
      await cache.delete(cacheKeys.sosAlerts(userId));
      
      return result;
    },
  },

  // ========== Notifications APIs ==========
  notifications: {
    getByUser: async (userId: string) => {
      logger.debug('API: Get notifications', userId);
      const { cache, cacheKeys } = await import('../utils/cache');
      const cacheKey = cacheKeys.notifications(userId);
      
      // Use stale-while-revalidate for notifications (important for UX)
      return await cache.staleWhileRevalidate(
        cacheKey,
        async () => {
          return await firebaseClient.database.read(`civilian/notifications/${userId}`);
        },
        2 * 60 * 1000, // 2 minutes fresh
        1 * 60 * 60 * 1000, // 1 hour stale acceptable
        true // persistent
      );
    },

    markAsRead: async (userId: string, notificationId: string) => {
      logger.debug('API: Mark notification as read', userId, notificationId);
      const result = await firebaseClient.database.update(
        `civilian/notifications/${userId}/${notificationId}`,
        { read: true, readAt: new Date().toISOString() }
      );
      
      // Invalidate cache
      const { cache, cacheKeys } = await import('../utils/cache');
      await cache.delete(cacheKeys.notifications(userId));
      
      return result;
    },

    delete: async (userId: string, notificationId: string) => {
      logger.debug('API: Delete notification', userId, notificationId);
      const result = await firebaseClient.database.delete(`civilian/notifications/${userId}/${notificationId}`);
      
      // Invalidate cache
      const { cache, cacheKeys } = await import('../utils/cache');
      await cache.delete(cacheKeys.notifications(userId));
      
      return result;
    },
  },

  // ========== Location APIs ==========
  location: {
    reverseGeocode: async (latitude: number, longitude: number): Promise<string> => {
      try {
        // Check cache first
        const { cache, cacheKeys } = await import('../utils/cache');
        const cacheKey = cacheKeys.geocode(latitude, longitude);
        const cached = await cache.get<string>(cacheKey, true); // Use persistent cache for geocoding
        
        if (cached) {
          logger.debug('API: Reverse geocode from cache', latitude, longitude);
          return cached;
        }

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
        let address: string;
        if (data && data.display_name) {
          address = data.display_name;
        } else {
          address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        }

        // Cache the result for 24 hours (geocoding results don't change often) with persistence
        await cache.set(cacheKey, address, 24 * 60 * 60 * 1000, true);
        
        return address;
      } catch (error) {
        logger.error('API: Reverse geocode failed', error);
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }
    },
  },
};

export default apis;

