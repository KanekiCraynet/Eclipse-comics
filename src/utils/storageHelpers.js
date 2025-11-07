/**
 * Safe Storage Utilities with try-catch for localStorage operations
 */

/**
 * Safe localStorage.getItem with error handling
 */
export const safeGetItem = (key, defaultValue = null) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue;
  }
  
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return item;
  } catch (error) {
    console.error(`[Storage] Error getting item "${key}":`, error);
    return defaultValue;
  }
};

/**
 * Safe localStorage.setItem with error handling
 */
export const safeSetItem = (key, value) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn(`[Storage] Quota exceeded for key "${key}". Attempting cleanup...`);
      // Try to clear old entries
      clearOldEntries();
      
      // Retry once
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error(`[Storage] Failed to set item "${key}" after cleanup:`, retryError);
        return false;
      }
    } else {
      console.error(`[Storage] Error setting item "${key}":`, error);
      return false;
    }
  }
};

/**
 * Safe localStorage.removeItem with error handling
 */
export const safeRemoveItem = (key) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[Storage] Error removing item "${key}":`, error);
    return false;
  }
};

/**
 * Safe JSON.parse with error handling
 */
export const safeParseJSON = (jsonString, defaultValue = null) => {
  if (jsonString === null || jsonString === undefined) {
    return defaultValue;
  }
  
  if (typeof jsonString !== 'string') {
    return jsonString; // Already parsed or not a string
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('[Storage] Error parsing JSON:', error, 'String:', jsonString);
    return defaultValue;
  }
};

/**
 * Safe JSON.stringify with error handling
 */
export const safeStringifyJSON = (value, defaultValue = '') => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('[Storage] Error stringifying JSON:', error, 'Value:', value);
    return defaultValue;
  }
};

/**
 * Get item and parse as JSON safely
 */
export const getJSONItem = (key, defaultValue = null) => {
  const item = safeGetItem(key);
  if (item === null) {
    return defaultValue;
  }
  return safeParseJSON(item, defaultValue);
};

/**
 * Set item as JSON string safely
 */
export const setJSONItem = (key, value) => {
  const jsonString = safeStringifyJSON(value);
  if (jsonString === '') {
    return false;
  }
  return safeSetItem(key, jsonString);
};

/**
 * Clear old localStorage entries to free up space
 */
export const clearOldEntries = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  
  try {
    const now = Date.now();
    const keysToRemove = [];
    
    // Find entries with timestamp suffix
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.endsWith('-time')) {
        const timeStr = localStorage.getItem(key);
        if (timeStr) {
          const timestamp = parseInt(timeStr, 10);
          // Remove entries older than 7 days
          if (now - timestamp > 7 * 24 * 60 * 60 * 1000) {
            const baseKey = key.replace('-time', '');
            keysToRemove.push(baseKey);
          }
        }
      }
    }
    
    // Remove old entries
    keysToRemove.forEach(key => {
      safeRemoveItem(key);
      safeRemoveItem(`${key}-time`);
    });
    
    return keysToRemove.length;
  } catch (error) {
    console.error('[Storage] Error clearing old entries:', error);
    return 0;
  }
};

/**
 * Get storage usage information
 */
export const getStorageInfo = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { available: false };
  }
  
  try {
    let totalSize = 0;
    const keys = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
          keys.push(key);
        }
      }
    }
    
    return {
      available: true,
      totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      itemCount: keys.length,
      keys,
    };
  } catch (error) {
    console.error('[Storage] Error getting storage info:', error);
    return { available: false, error: error.message };
  }
};

/**
 * Storage event listener for sync across tabs
 */
export const setupStorageSync = (callback) => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  
  const handleStorageChange = (event) => {
    if (event.key && callback) {
      callback({
        key: event.key,
        oldValue: event.oldValue,
        newValue: event.newValue,
      });
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};

