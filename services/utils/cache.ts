/**
 * Enhanced cache utility with in-memory and persistent storage support
 * Provides TTL-based caching to reduce redundant network requests
 * Supports both in-memory (fast) and AsyncStorage (persistent) caching
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface PersistentCacheEntry {
  data: string; // JSON stringified data
  timestamp: number;
  ttl: number;
}

class Cache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number = 100; // Maximum number of entries
  private persistentKeys: Set<string> = new Set(); // Keys that should be persisted
  private readonly PERSISTENT_PREFIX = 'cache_persistent_';
  private readonly PERSISTENT_KEYS_KEY = 'cache_persistent_keys';

  constructor() {
    // Load persistent keys on initialization
    this.loadPersistentKeys();
  }

  /**
   * Get cached data if available and not expired
   * Checks both in-memory and persistent cache
   */
  async get<T>(key: string, usePersistent: boolean = false): Promise<T | null> {
    // Check in-memory cache first
    const entry = this.cache.get(key);
    
    if (entry) {
      const now = Date.now();
      if (now - entry.timestamp <= entry.ttl) {
        return entry.data as T;
      } else {
        // Expired, remove from memory
        this.cache.delete(key);
      }
    }

    // Check persistent cache if requested
    if (usePersistent) {
      try {
        const persistentKey = `${this.PERSISTENT_PREFIX}${key}`;
        const stored = await AsyncStorage.getItem(persistentKey);
        
        if (stored) {
          const entry: PersistentCacheEntry = JSON.parse(stored);
          const now = Date.now();
          
          if (now - entry.timestamp <= entry.ttl) {
            const data = JSON.parse(entry.data) as T;
            // Restore to in-memory cache for faster access
            this.cache.set(key, {
              data,
              timestamp: entry.timestamp,
              ttl: entry.ttl,
            });
            return data;
          } else {
            // Expired, remove from persistent storage
            await AsyncStorage.removeItem(persistentKey);
            this.persistentKeys.delete(key);
            await this.savePersistentKeys();
          }
        }
      } catch (error) {
        console.error('Error reading from persistent cache:', error);
      }
    }

    return null;
  }

  /**
   * Synchronous get (in-memory only)
   */
  getSync<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache entry with TTL
   * @param persistent - If true, also stores in AsyncStorage for persistence
   */
  async set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000, persistent: boolean = false): Promise<void> {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey && !this.persistentKeys.has(firstKey)) {
        this.cache.delete(firstKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.cache.set(key, entry);

    // Store in persistent cache if requested
    if (persistent) {
      try {
        const persistentKey = `${this.PERSISTENT_PREFIX}${key}`;
        const persistentEntry: PersistentCacheEntry = {
          data: JSON.stringify(data),
          timestamp: entry.timestamp,
          ttl: entry.ttl,
        };
        
        await AsyncStorage.setItem(persistentKey, JSON.stringify(persistentEntry));
        this.persistentKeys.add(key);
        await this.savePersistentKeys();
      } catch (error) {
        console.error('Error writing to persistent cache:', error);
      }
    }
  }

  /**
   * Remove specific cache entry (both memory and persistent)
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    
    if (this.persistentKeys.has(key)) {
      try {
        const persistentKey = `${this.PERSISTENT_PREFIX}${key}`;
        await AsyncStorage.removeItem(persistentKey);
        this.persistentKeys.delete(key);
        await this.savePersistentKeys();
      } catch (error) {
        console.error('Error deleting from persistent cache:', error);
      }
    }
  }

  /**
   * Clear all cache entries (both memory and persistent)
   */
  async clear(): Promise<void> {
    this.cache.clear();
    
    try {
      // Clear all persistent cache entries
      const keys = Array.from(this.persistentKeys);
      const persistentKeys = keys.map(key => `${this.PERSISTENT_PREFIX}${key}`);
      await AsyncStorage.multiRemove(persistentKeys);
      this.persistentKeys.clear();
      await this.savePersistentKeys();
    } catch (error) {
      console.error('Error clearing persistent cache:', error);
    }
  }

  /**
   * Remove expired entries (both memory and persistent)
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    
    // Clean up in-memory cache
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }

    // Clean up persistent cache
    const persistentKeysToRemove: string[] = [];
    for (const key of this.persistentKeys) {
      try {
        const persistentKey = `${this.PERSISTENT_PREFIX}${key}`;
        const stored = await AsyncStorage.getItem(persistentKey);
        
        if (stored) {
          const entry: PersistentCacheEntry = JSON.parse(stored);
          if (now - entry.timestamp > entry.ttl) {
            persistentKeysToRemove.push(key);
          }
        }
      } catch (error) {
        // Remove if corrupted
        persistentKeysToRemove.push(key);
      }
    }

    if (persistentKeysToRemove.length > 0) {
      const persistentKeys = persistentKeysToRemove.map(key => `${this.PERSISTENT_PREFIX}${key}`);
      await AsyncStorage.multiRemove(persistentKeys);
      persistentKeysToRemove.forEach(key => this.persistentKeys.delete(key));
      await this.savePersistentKeys();
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Load persistent keys from storage
   */
  private async loadPersistentKeys(): Promise<void> {
    try {
      const keysJson = await AsyncStorage.getItem(this.PERSISTENT_KEYS_KEY);
      if (keysJson) {
        const keys = JSON.parse(keysJson) as string[];
        this.persistentKeys = new Set(keys);
      }
    } catch (error) {
      console.error('Error loading persistent keys:', error);
    }
  }

  /**
   * Save persistent keys to storage
   */
  private async savePersistentKeys(): Promise<void> {
    try {
      const keys = Array.from(this.persistentKeys);
      await AsyncStorage.setItem(this.PERSISTENT_KEYS_KEY, JSON.stringify(keys));
    } catch (error) {
      console.error('Error saving persistent keys:', error);
    }
  }

  /**
   * Stale-while-revalidate: returns stale data immediately if available, then fetches fresh data
   */
  async staleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 5 * 60 * 1000,
    staleTtl: number = 24 * 60 * 60 * 1000, // How long stale data is acceptable
    persistent: boolean = false
  ): Promise<T> {
    // Check for fresh data
    const fresh = await this.get<T>(key, persistent);
    if (fresh) {
      // Return fresh data immediately, but fetch in background to update cache
      fetcher().then(data => this.set(key, data, ttl, persistent)).catch(() => {});
      return fresh;
    }

    // Check for stale data
    try {
      const persistentKey = `${this.PERSISTENT_PREFIX}${key}`;
      const stored = await AsyncStorage.getItem(persistentKey);
      
      if (stored) {
        const entry: PersistentCacheEntry = JSON.parse(stored);
        const now = Date.now();
        const age = now - entry.timestamp;
        
        // If data exists but is stale, return it and fetch fresh data
        if (age > entry.ttl && age <= staleTtl) {
          const staleData = JSON.parse(entry.data) as T;
          // Fetch fresh data in background
          fetcher().then(data => this.set(key, data, ttl, persistent)).catch(() => {});
          return staleData;
        }
      }
    } catch (error) {
      // Ignore errors, just fetch fresh data
    }

    // No cached data, fetch fresh
    const data = await fetcher();
    await this.set(key, data, ttl, persistent);
    return data;
  }
}

// Create singleton instance
export const cache = new Cache();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Cache key generators for common operations
 */
export const cacheKeys = {
  geocode: (lat: number, lng: number) => `geocode_${lat.toFixed(4)}_${lng.toFixed(4)}`,
  userProfile: (uid: string) => `user_profile_${uid}`,
  crimeReports: (userId: string) => `crime_reports_${userId}`,
  crimeReportsAll: () => `crime_reports_all`,
  crimeReport: (reportId: string) => `crime_report_${reportId}`,
  notifications: (userId: string) => `notifications_${userId}`,
  emergencyContacts: (userId: string) => `emergency_contacts_${userId}`,
  sosAlerts: (userId: string) => `sos_alerts_${userId}`,
  imageUrl: (url: string) => `image_url_${url.replace(/[^a-zA-Z0-9]/g, '_')}`,
};

export default cache;

