/**
 * Validation Schemas using Yup
 * Centralized validation logic for all forms
 */

import * as Yup from 'yup';
import { APP_CONSTANTS, ERROR_MESSAGES } from '../constants';

// ========== Authentication Schemas ==========

export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email(ERROR_MESSAGES.VALIDATION.EMAIL_INVALID)
    .required(ERROR_MESSAGES.VALIDATION.EMAIL_REQUIRED),
  password: Yup.string()
    .required(ERROR_MESSAGES.VALIDATION.PASSWORD_REQUIRED)
    .min(APP_CONSTANTS.MIN_PASSWORD_LENGTH, ERROR_MESSAGES.VALIDATION.PASSWORD_TOO_SHORT(APP_CONSTANTS.MIN_PASSWORD_LENGTH)),
});

export const registerSchema = Yup.object().shape({
  firstName: Yup.string()
    .required(ERROR_MESSAGES.VALIDATION.NAME_REQUIRED)
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be at most 50 characters'),
  lastName: Yup.string()
    .required(ERROR_MESSAGES.VALIDATION.NAME_REQUIRED)
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be at most 50 characters'),
  email: Yup.string()
    .email(ERROR_MESSAGES.VALIDATION.EMAIL_INVALID)
    .required(ERROR_MESSAGES.VALIDATION.EMAIL_REQUIRED),
  contactNumber: Yup.string()
    .required(ERROR_MESSAGES.VALIDATION.PHONE_REQUIRED)
    .matches(/^\+63[0-9]{10}$/, ERROR_MESSAGES.VALIDATION.PHONE_INVALID),
  password: Yup.string()
    .required(ERROR_MESSAGES.VALIDATION.PASSWORD_REQUIRED)
    .min(8, 'Password must be at least 8 characters')
    .max(20, 'Password must be at most 20 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/\d/, 'Password must contain at least one number')
    .matches(/[^A-Za-z\d]/, 'Password must contain at least one special character'),
  confirmPassword: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('password')], ERROR_MESSAGES.VALIDATION.PASSWORD_MISMATCH),
});

export const changePasswordSchema = Yup.object().shape({
  currentPassword: Yup.string()
    .required('Current password is required'),
  newPassword: Yup.string()
    .required('New password is required')
    .min(APP_CONSTANTS.MIN_PASSWORD_LENGTH, ERROR_MESSAGES.VALIDATION.PASSWORD_TOO_SHORT(APP_CONSTANTS.MIN_PASSWORD_LENGTH))
    .notOneOf([Yup.ref('currentPassword')], 'New password must be different from current password'),
  confirmPassword: Yup.string()
    .required('Please confirm your new password')
    .oneOf([Yup.ref('newPassword')], ERROR_MESSAGES.VALIDATION.PASSWORD_MISMATCH),
});

export const forgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email(ERROR_MESSAGES.VALIDATION.EMAIL_INVALID)
    .required(ERROR_MESSAGES.VALIDATION.EMAIL_REQUIRED),
});

// ========== Crime Report Schemas ==========

export const crimeReportSchema = Yup.object().shape({
  crimeType: Yup.string()
    .required('Please select a crime type'),
  dateTime: Yup.date()
    .required('Date and time are required')
    .max(new Date(), 'Date and time cannot be in the future'),
  description: Yup.string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be at most 1000 characters'),
  location: Yup.object().shape({
    latitude: Yup.number().required('Location is required'),
    longitude: Yup.number().required('Location is required'),
    address: Yup.string().required('Address is required'),
  }),
  severity: Yup.string()
    .oneOf(['Immediate', 'High', 'Moderate', 'Low'], 'Invalid severity level')
    .required('Severity is required'),
  anonymous: Yup.boolean(),
});

// ========== Emergency Contact Schemas ==========

export const emergencyContactSchema = Yup.object().shape({
  name: Yup.string()
    .required('Contact name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  phoneNumber: Yup.string()
    .required(ERROR_MESSAGES.VALIDATION.PHONE_REQUIRED)
    .matches(/^\+63[0-9]{10}$/, ERROR_MESSAGES.VALIDATION.PHONE_INVALID),
  relationship: Yup.string()
    .required('Relationship is required')
    .min(2, 'Relationship must be at least 2 characters')
    .max(50, 'Relationship must be at most 50 characters'),
  isPrimary: Yup.boolean(),
});

// ========== User Profile Schema ==========

export const userProfileSchema = Yup.object().shape({
  firstName: Yup.string()
    .required(ERROR_MESSAGES.VALIDATION.NAME_REQUIRED)
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be at most 50 characters'),
  lastName: Yup.string()
    .required(ERROR_MESSAGES.VALIDATION.NAME_REQUIRED)
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be at most 50 characters'),
  contactNumber: Yup.string()
    .required(ERROR_MESSAGES.VALIDATION.PHONE_REQUIRED)
    .matches(/^\+63[0-9]{10}$/, ERROR_MESSAGES.VALIDATION.PHONE_INVALID),
});

export default {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  crimeReportSchema,
  emergencyContactSchema,
  userProfileSchema,
};

