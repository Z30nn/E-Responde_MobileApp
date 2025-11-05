/**
 * Image caching utility for React Native
 * Downloads and caches images locally using react-native-fs
 */

import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

const CACHE_DIR = `${RNFS.CachesDirectoryPath}/image_cache`;
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB max cache size
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedImageInfo {
  localPath: string;
  downloadedAt: number;
  size: number;
}

class ImageCache {
  private cacheIndex: Map<string, CachedImageInfo> = new Map();
  private indexPath: string;

  constructor() {
    this.indexPath = `${CACHE_DIR}/index.json`;
    this.initializeCache();
  }

  /**
   * Initialize cache directory and load index
   */
  private async initializeCache(): Promise<void> {
    try {
      // Create cache directory if it doesn't exist
      const exists = await RNFS.exists(CACHE_DIR);
      if (!exists) {
        await RNFS.mkdir(CACHE_DIR);
      }

      // Load cache index
      await this.loadIndex();
      
      // Clean up old files periodically
      this.cleanup();
    } catch (error) {
      console.error('Error initializing image cache:', error);
    }
  }

  /**
   * Load cache index from disk
   */
  private async loadIndex(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.indexPath);
      if (exists) {
        const indexData = await RNFS.readFile(this.indexPath, 'utf8');
        const index = JSON.parse(indexData) as Record<string, CachedImageInfo>;
        this.cacheIndex = new Map(Object.entries(index));
      }
    } catch (error) {
      console.error('Error loading cache index:', error);
      this.cacheIndex = new Map();
    }
  }

  /**
   * Save cache index to disk
   */
  private async saveIndex(): Promise<void> {
    try {
      const indexObject = Object.fromEntries(this.cacheIndex);
      await RNFS.writeFile(this.indexPath, JSON.stringify(indexObject), 'utf8');
    } catch (error) {
      console.error('Error saving cache index:', error);
    }
  }

  /**
   * Generate cache key from URL
   */
  private getCacheKey(url: string): string {
    // Remove query parameters and create a safe filename
    const urlWithoutQuery = url.split('?')[0];
    const filename = urlWithoutQuery.split('/').pop() || 'image';
    const hash = this.hashString(url);
    return `${hash}_${filename.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  }

  /**
   * Simple hash function for URLs
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get local path for cached image, or download if not cached
   */
  async getCachedImagePath(url: string): Promise<string | null> {
    if (!url || url.trim() === '') {
      return null;
    }

    // Handle data URIs (base64 images)
    if (url.startsWith('data:')) {
      return url;
    }

    // Handle local file paths
    if (url.startsWith('file://') || !url.startsWith('http')) {
      return url;
    }

    const cacheKey = this.getCacheKey(url);
    const localPath = `${CACHE_DIR}/${cacheKey}`;

    // Check if already cached
    const cachedInfo = this.cacheIndex.get(url);
    if (cachedInfo) {
      const exists = await RNFS.exists(cachedInfo.localPath);
      if (exists) {
        // Check if cache is still valid
        const age = Date.now() - cachedInfo.downloadedAt;
        if (age < MAX_CACHE_AGE) {
          return Platform.OS === 'android' ? `file://${cachedInfo.localPath}` : cachedInfo.localPath;
        } else {
          // Cache expired, remove it
          await this.removeFromCache(url);
        }
      } else {
        // File doesn't exist, remove from index
        this.cacheIndex.delete(url);
        await this.saveIndex();
      }
    }

    // Download and cache the image
    try {
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: localPath,
      }).promise;

      if (downloadResult.statusCode === 200) {
        const stats = await RNFS.stat(localPath);
        const imageInfo: CachedImageInfo = {
          localPath,
          downloadedAt: Date.now(),
          size: stats.size || 0,
        };

        this.cacheIndex.set(url, imageInfo);
        await this.saveIndex();

        return Platform.OS === 'android' ? `file://${localPath}` : localPath;
      } else {
        console.error('Failed to download image:', url, downloadResult.statusCode);
        return null;
      }
    } catch (error) {
      console.error('Error caching image:', url, error);
      return null;
    }
  }

  /**
   * Pre-cache an image (download without returning)
   */
  async preloadImage(url: string): Promise<void> {
    try {
      await this.getCachedImagePath(url);
    } catch (error) {
      console.error('Error preloading image:', url, error);
    }
  }

  /**
   * Remove image from cache
   */
  async removeFromCache(url: string): Promise<void> {
    const cachedInfo = this.cacheIndex.get(url);
    if (cachedInfo) {
      try {
        const exists = await RNFS.exists(cachedInfo.localPath);
        if (exists) {
          await RNFS.unlink(cachedInfo.localPath);
        }
      } catch (error) {
        console.error('Error removing cached image:', error);
      }
      this.cacheIndex.delete(url);
      await this.saveIndex();
    }
  }

  /**
   * Clear all cached images
   */
  async clearCache(): Promise<void> {
    try {
      // Delete all files in cache directory
      const files = await RNFS.readDir(CACHE_DIR);
      await Promise.all(
        files
          .filter(file => file.name !== 'index.json')
          .map(file => RNFS.unlink(file.path))
      );

      this.cacheIndex.clear();
      await this.saveIndex();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache size
   */
  async getCacheSize(): Promise<number> {
    let totalSize = 0;
    for (const info of this.cacheIndex.values()) {
      totalSize += info.size;
    }
    return totalSize;
  }

  /**
   * Clean up old and oversized cache
   */
  private async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const entriesToRemove: string[] = [];

      // Remove expired entries
      for (const [url, info] of this.cacheIndex.entries()) {
        const age = now - info.downloadedAt;
        if (age > MAX_CACHE_AGE) {
          entriesToRemove.push(url);
        }
      }

      // Remove expired entries
      for (const url of entriesToRemove) {
        await this.removeFromCache(url);
      }

      // If cache is still too large, remove oldest entries
      const cacheSize = await this.getCacheSize();
      if (cacheSize > MAX_CACHE_SIZE) {
        const sortedEntries = Array.from(this.cacheIndex.entries())
          .sort((a, b) => a[1].downloadedAt - b[1].downloadedAt);

        for (const [url] of sortedEntries) {
          await this.removeFromCache(url);
          const newSize = await this.getCacheSize();
          if (newSize <= MAX_CACHE_SIZE * 0.8) {
            break; // Remove until we're at 80% of max size
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }

  /**
   * Get cached image URI (synchronous check only)
   */
  getCachedImageUriSync(url: string): string | null {
    if (!url || url.trim() === '') {
      return null;
    }

    // Handle data URIs and local paths
    if (url.startsWith('data:') || url.startsWith('file://') || !url.startsWith('http')) {
      return url;
    }

    const cachedInfo = this.cacheIndex.get(url);
    if (cachedInfo) {
      return Platform.OS === 'android' ? `file://${cachedInfo.localPath}` : cachedInfo.localPath;
    }

    return null;
  }
}

// Create singleton instance
export const imageCache = new ImageCache();

export default imageCache;

