import AsyncStorage from '@react-native-async-storage/async-storage';

interface GeocodingResult {
  address: string;
  success: boolean;
  error?: string;
  source: 'cache' | 'nominatim' | 'fallback';
}

interface CachedGeocoding {
  address: string;
  timestamp: number;
}

class GeocodingService {
  private static readonly CACHE_KEY = 'geocoding_cache';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private static lastRequestTime = 0;

  /**
   * Get address from coordinates with caching and retry logic
   */
  static async reverseGeocode(
    latitude: number, 
    longitude: number, 
    maxRetries: number = 3
  ): Promise<GeocodingResult> {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    
    try {
      // Check cache first
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        console.log('GeocodingService: Using cached result');
        return {
          address: cached.address,
          success: true,
          source: 'cache'
        };
      }

      // Rate limiting - ensure minimum delay between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
        const delay = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
        console.log(`GeocodingService: Rate limiting - waiting ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Try geocoding with retry logic
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`GeocodingService: Attempt ${attempt}/${maxRetries} for coordinates ${latitude}, ${longitude}`);
          
          const result = await this.performGeocoding(latitude, longitude);
          
          // Cache successful result
          await this.cacheResult(cacheKey, result.address);
          
          this.lastRequestTime = Date.now();
          
          return {
            address: result.address,
            success: true,
            source: 'nominatim'
          };
          
        } catch (error: any) {
          console.log(`GeocodingService: Attempt ${attempt} failed:`, error.message);
          
          if (attempt === maxRetries) {
            // All attempts failed, use fallback
            const fallbackAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            console.log('GeocodingService: All attempts failed, using coordinate fallback');
            
            return {
              address: fallbackAddress,
              success: false,
              error: error.message,
              source: 'fallback'
            };
          }
          
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`GeocodingService: Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // This should never be reached, but just in case
      return {
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        success: false,
        error: 'All retry attempts failed',
        source: 'fallback'
      };
      
    } catch (error: any) {
      console.error('GeocodingService: Unexpected error:', error);
      return {
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        success: false,
        error: error.message,
        source: 'fallback'
      };
    }
  }

  /**
   * Perform the actual geocoding request
   */
  private static async performGeocoding(latitude: number, longitude: number): Promise<{address: string}> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    console.log('GeocodingService: Making request to:', url);
    
    const response = await Promise.race([
      fetch(url, {
        headers: {
          'User-Agent': 'E-Responde-MobileApp/1.0',
          'Accept': 'application/json',
        },
      }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 8000) // 8 second timeout
      )
    ]);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('GeocodingService: Response received:', data);

    if (data && data.display_name) {
      return { address: data.display_name };
    } else {
      throw new Error('No address found in response');
    }
  }

  /**
   * Get cached geocoding result
   */
  private static async getCachedResult(cacheKey: string): Promise<CachedGeocoding | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.CACHE_KEY}_${cacheKey}`);
      if (cached) {
        const parsed: CachedGeocoding = JSON.parse(cached);
        const isExpired = Date.now() - parsed.timestamp > this.CACHE_DURATION;
        
        if (!isExpired) {
          return parsed;
        } else {
          // Remove expired cache
          await AsyncStorage.removeItem(`${this.CACHE_KEY}_${cacheKey}`);
        }
      }
    } catch (error) {
      console.log('GeocodingService: Cache read error:', error);
    }
    
    return null;
  }

  /**
   * Cache geocoding result
   */
  private static async cacheResult(cacheKey: string, address: string): Promise<void> {
    try {
      const cacheData: CachedGeocoding = {
        address,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(
        `${this.CACHE_KEY}_${cacheKey}`, 
        JSON.stringify(cacheData)
      );
      
      console.log('GeocodingService: Result cached for key:', cacheKey);
    } catch (error) {
      console.log('GeocodingService: Cache write error:', error);
    }
  }

  /**
   * Clear all cached geocoding results
   */
  static async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_KEY));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('GeocodingService: Cache cleared');
    } catch (error) {
      console.log('GeocodingService: Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{count: number, size: number}> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_KEY));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return {
        count: cacheKeys.length,
        size: totalSize
      };
    } catch (error) {
      console.log('GeocodingService: Cache stats error:', error);
      return { count: 0, size: 0 };
    }
  }
}

export default GeocodingService;
