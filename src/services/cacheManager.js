/**
 * Centralized Cache Manager with TTL support and invalidation strategies
 */
class CacheManager {
  constructor(options = {}) {
    this.memoryCache = new Map();
    this.useLocalStorage = options.useLocalStorage !== false;
    this.defaultTTL = options.defaultTTL || 30 * 60 * 1000; // 30 minutes
    this.maxCacheSize = options.maxCacheSize || 50; // Max items in memory cache
    this.storagePrefix = options.storagePrefix || 'komikcast_cache_';
    this.storageTimePrefix = options.storageTimePrefix || 'komikcast_cache_time_';
    
    // Cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Generate cache key
   */
  generateKey(key) {
    return typeof key === 'string' ? key : JSON.stringify(key);
  }
  
  /**
   * Get cache entry from memory
   */
  getFromMemory(key) {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Get cache entry from localStorage
   */
  getFromLocalStorage(key) {
    if (!this.useLocalStorage || typeof window === 'undefined') {
      return null;
    }
    
    try {
      const cacheKey = this.storagePrefix + key;
      const timeKey = this.storageTimePrefix + key;
      
      const cachedData = localStorage.getItem(cacheKey);
      const cachedTime = localStorage.getItem(timeKey);
      
      if (!cachedData || !cachedTime) {
        return null;
      }
      
      const expiresAt = parseInt(cachedTime, 10);
      
      // Check expiration
      if (Date.now() > expiresAt) {
        this.removeFromLocalStorage(key);
        return null;
      }
      
      return JSON.parse(cachedData);
    } catch (error) {
      console.error('[Cache] Error reading from localStorage:', error);
      return null;
    }
  }
  
  /**
   * Get cached data (checks memory first, then localStorage)
   */
  get(key) {
    const cacheKey = this.generateKey(key);
    
    // Try memory cache first
    const memoryData = this.getFromMemory(cacheKey);
    if (memoryData !== null) {
      return memoryData;
    }
    
    // Try localStorage
    const storageData = this.getFromLocalStorage(cacheKey);
    if (storageData !== null) {
      // Restore to memory cache
      this.setToMemory(cacheKey, storageData, this.defaultTTL);
      return storageData;
    }
    
    return null;
  }
  
  /**
   * Set cache entry in memory
   */
  setToMemory(key, data, ttl) {
    const expiresAt = ttl ? Date.now() + ttl : null;
    
    // Enforce max cache size
    if (this.memoryCache.size >= this.maxCacheSize) {
      // Remove oldest entry (first in map)
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    this.memoryCache.set(key, {
      data,
      expiresAt,
      cachedAt: Date.now(),
    });
  }
  
  /**
   * Set cache entry in localStorage
   */
  setToLocalStorage(key, data, ttl) {
    if (!this.useLocalStorage || typeof window === 'undefined') {
      return;
    }
    
    try {
      const cacheKey = this.storagePrefix + key;
      const timeKey = this.storageTimePrefix + key;
      const expiresAt = Date.now() + (ttl || this.defaultTTL);
      
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(timeKey, expiresAt.toString());
    } catch (error) {
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError') {
        console.warn('[Cache] localStorage quota exceeded, clearing old entries');
        this.clearOldLocalStorageEntries();
        
        // Retry once
        try {
          localStorage.setItem(this.storagePrefix + key, JSON.stringify(data));
          localStorage.setItem(this.storageTimePrefix + key, (Date.now() + (ttl || this.defaultTTL)).toString());
        } catch (retryError) {
          console.error('[Cache] Failed to cache after cleanup:', retryError);
        }
      } else {
        console.error('[Cache] Error writing to localStorage:', error);
      }
    }
  }
  
  /**
   * Set cached data (stores in both memory and localStorage)
   */
  set(key, data, ttl = null) {
    const cacheKey = this.generateKey(key);
    const cacheTTL = ttl || this.defaultTTL;
    
    this.setToMemory(cacheKey, data, cacheTTL);
    this.setToLocalStorage(cacheKey, data, cacheTTL);
  }
  
  /**
   * Remove cache entry
   */
  remove(key) {
    const cacheKey = this.generateKey(key);
    
    this.memoryCache.delete(cacheKey);
    this.removeFromLocalStorage(cacheKey);
  }
  
  /**
   * Remove from localStorage
   */
  removeFromLocalStorage(key) {
    if (!this.useLocalStorage || typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.removeItem(this.storagePrefix + key);
      localStorage.removeItem(this.storageTimePrefix + key);
    } catch (error) {
      console.error('[Cache] Error removing from localStorage:', error);
    }
  }
  
  /**
   * Clear all cache
   */
  clear() {
    this.memoryCache.clear();
    
    if (this.useLocalStorage && typeof window !== 'undefined') {
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(this.storagePrefix) || key?.startsWith(this.storageTimePrefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.error('[Cache] Error clearing localStorage:', error);
      }
    }
  }
  
  /**
   * Clear old localStorage entries to free up space
   */
  clearOldLocalStorageEntries() {
    if (!this.useLocalStorage || typeof window === 'undefined') {
      return;
    }
    
    try {
      const now = Date.now();
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.storageTimePrefix)) {
          const timeStr = localStorage.getItem(key);
          if (timeStr) {
            const expiresAt = parseInt(timeStr, 10);
            if (now > expiresAt) {
              // Extract cache key
              const cacheKey = key.replace(this.storageTimePrefix, '');
              keysToRemove.push(cacheKey);
            }
          }
        }
      }
      
      // Remove expired entries
      keysToRemove.forEach(cacheKey => {
        this.removeFromLocalStorage(cacheKey);
      });
      
      // If still too many entries, remove oldest
      if (keysToRemove.length === 0) {
        const timeKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(this.storageTimePrefix)) {
            const timeStr = localStorage.getItem(key);
            if (timeStr) {
              timeKeys.push({
                key,
                time: parseInt(timeStr, 10),
              });
            }
          }
        }
        
        // Sort by time and remove oldest 25%
        timeKeys.sort((a, b) => a.time - b.time);
        const toRemove = Math.floor(timeKeys.length * 0.25);
        timeKeys.slice(0, toRemove).forEach(({ key }) => {
          const cacheKey = key.replace(this.storageTimePrefix, '');
          this.removeFromLocalStorage(cacheKey);
        });
      }
    } catch (error) {
      console.error('[Cache] Error clearing old entries:', error);
    }
  }
  
  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    
    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
    
    // Clean localStorage (only check every 10th cleanup to avoid performance issues)
    if (Math.random() < 0.1) {
      this.clearOldLocalStorageEntries();
    }
  }
  
  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    // Invalidate memory cache
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Invalidate localStorage
    if (this.useLocalStorage && typeof window !== 'undefined') {
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(this.storagePrefix)) {
            const cacheKey = key.replace(this.storagePrefix, '');
            if (regex.test(cacheKey)) {
              keysToRemove.push(cacheKey);
            }
          }
        }
        keysToRemove.forEach(cacheKey => this.removeFromLocalStorage(cacheKey));
      } catch (error) {
        console.error('[Cache] Error invalidating pattern:', error);
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memorySize: this.memoryCache.size,
      maxMemorySize: this.maxCacheSize,
      localStorageEnabled: this.useLocalStorage,
    };
  }
  
  /**
   * Destroy cache manager (cleanup interval)
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager({
  useLocalStorage: true,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  maxCacheSize: 50,
});

export default cacheManager;
export { CacheManager };

