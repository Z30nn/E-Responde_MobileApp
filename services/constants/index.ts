/**
 * Application Constants
 * All hardcoded values should be defined here for easy maintenance
 */

export const APP_CONSTANTS = {
  // Emergency Contacts
  MAX_PRIMARY_CONTACTS: 3,
  MAX_EMERGENCY_CONTACTS: 10,

  // SOS Alerts
  SOS_CLEANUP_DAYS: 7,
  SOS_COUNTDOWN_SECONDS: 5,

  // Location
  LOCATION_TIMEOUT: 10000,
  LOCATION_MAX_AGE: 30000,

  // Phone Number
  PHONE_PREFIX: '+63',
  PHONE_DIGITS_AFTER_PREFIX: 10,

  // Password
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 20,

  // Image Upload
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGES_PER_REPORT: 5,

  // Report
  DEFAULT_SEVERITY: 'Low' as const,
  SEVERITY_OPTIONS: ['Immediate', 'High', 'Moderate', 'Low'] as const,
};

export const ERROR_MESSAGES = {
  AUTH: {
    USER_NOT_FOUND: 'No account found with this email address',
    WRONG_PASSWORD: 'Incorrect password',
    INVALID_EMAIL: 'Invalid email address',
    USER_DISABLED: 'This account has been disabled',
    TOO_MANY_REQUESTS: 'Too many failed attempts. Please try again later',
    NETWORK_ERROR: 'Network error. Please check your internet connection',
    WEAK_PASSWORD: 'Password is too weak',
    EMAIL_IN_USE: 'An account with this email already exists',
    REQUIRES_RECENT_LOGIN: 'Please log out and log back in before changing your password',
  },
  VALIDATION: {
    EMAIL_REQUIRED: 'Email is required',
    EMAIL_INVALID: 'Please enter a valid email address',
    PASSWORD_REQUIRED: 'Password is required',
    PASSWORD_TOO_SHORT: (min: number) => `Password must be at least ${min} characters`,
    PASSWORD_MISMATCH: 'Passwords do not match',
    PHONE_REQUIRED: 'Contact number is required',
    PHONE_INVALID: 'Please enter a valid Philippine phone number (+63 followed by 10 digits)',
    NAME_REQUIRED: 'Name is required',
  },
  LOCATION: {
    PERMISSION_DENIED: 'Location permission denied',
    TIMEOUT: 'Location request timed out',
    UNAVAILABLE: 'Location services unavailable',
  },
  EMERGENCY: {
    NO_PRIMARY_CONTACTS: 'You need at least one primary emergency contact to send SOS alerts',
    MAX_PRIMARY_REACHED: (max: number) => `You can only have ${max} primary contacts`,
    SOS_FAILED: 'Failed to send SOS alert',
  },
  GENERIC: {
    UNKNOWN: 'An unknown error occurred',
    TRY_AGAIN: 'Please try again',
  },
};

export const SUCCESS_MESSAGES = {
  AUTH: {
    REGISTRATION_SUCCESS: 'Registration successful!',
    PASSWORD_CHANGED: 'Password changed successfully',
    LOGGED_OUT: 'Logged out successfully',
  },
  EMERGENCY: {
    SOS_SENT: (count: number) => `SOS alert sent to ${count} emergency contact(s)`,
    CONTACT_ADDED: 'Emergency contact added successfully',
    CONTACT_UPDATED: 'Emergency contact updated successfully',
    CONTACT_DELETED: 'Emergency contact deleted successfully',
  },
  REPORT: {
    SUBMITTED: 'Crime report submitted successfully',
    UPDATED: 'Crime report updated successfully',
  },
};

export const API_ENDPOINTS = {
  // Nominatim for reverse geocoding
  REVERSE_GEOCODE: 'https://nominatim.openstreetmap.org/reverse',
};

export const STORAGE_KEYS = {
  THEME: 'theme',
  LANGUAGE: 'language',
  FONT_SIZE: 'fontSize',
  USER_PREFERENCES: 'userPreferences',
};

export const COLORS = {
  PRIMARY: '#4c643b',
  SECONDARY: '#2d3480',
  DANGER: '#FF4444',
  WARNING: '#FFA500',
  SUCCESS: '#32CD32',
  INFO: '#4A90E2',
  LIGHT_GRAY: '#E5E7EB',
  DARK_GRAY: '#6B7280',
};

export default {
  APP_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  API_ENDPOINTS,
  STORAGE_KEYS,
  COLORS,
};

