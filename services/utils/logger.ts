/**
 * Logger utility to replace console.log statements
 * Provides different log levels and can be easily disabled in production
 */

const isDevelopment = __DEV__;

export const logger = {
  /**
   * Debug level logging - only in development
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info level logging - only in development
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Warning level logging - enabled in all environments
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error level logging - enabled in all environments
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Log with custom tag
   */
  tag: (tag: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[${tag}]`, ...args);
    }
  },

  /**
   * Group logging
   */
  group: (label: string) => {
    if (isDevelopment && console.group) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDevelopment && console.groupEnd) {
      console.groupEnd();
    }
  },

  /**
   * Table logging for objects/arrays
   */
  table: (data: any) => {
    if (isDevelopment && console.table) {
      console.table(data);
    }
  },
};

export default logger;

