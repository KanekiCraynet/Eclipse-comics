import { useState, useEffect, useCallback } from 'react';
import { getJSONItem, setJSONItem } from '@/utils/storageHelpers';

/**
 * Reading preferences constants
 */
export const READING_MODES = {
  WEBTOON: 'webtoon',
  MANGA: 'manga',
  LONG_STRIP: 'longstrip',
};

export const READING_DIRECTIONS = {
  LTR: 'ltr',
  RTL: 'rtl',
};

const DEFAULT_PREFERENCES = {
  readingMode: READING_MODES.WEBTOON,
  readingDirection: READING_DIRECTIONS.LTR,
  imageQuality: 'auto',
  autoLoadNext: false,
  autoScroll: false,
  autoScrollSpeed: 50,
  zoomLevel: 1,
  darkMode: true,
};

/**
 * Hook for managing reading preferences
 * Stores preferences in localStorage
 */
export const useReadingPreferences = () => {
  const [preferences, setPreferencesState] = useState(DEFAULT_PREFERENCES);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = getJSONItem('readingPreferences', DEFAULT_PREFERENCES);
      const loadedPreferences = { ...DEFAULT_PREFERENCES, ...saved };
      setPreferencesState(loadedPreferences);
      
      // Apply theme to document
      if (loadedPreferences.darkMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Error loading reading preferences:', error);
    }
  }, []);

  // Apply theme when darkMode changes
  useEffect(() => {
    if (preferences.darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.darkMode]);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences) => {
    try {
      const updated = { ...preferences, ...newPreferences };
      setPreferencesState(updated);
      setJSONItem('readingPreferences', updated);
    } catch (error) {
      console.error('Error saving reading preferences:', error);
    }
  }, [preferences]);

  // Update single preference
  const updatePreference = useCallback((key, value) => {
    savePreferences({ [key]: value });
  }, [savePreferences]);

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
    setJSONItem('readingPreferences', DEFAULT_PREFERENCES);
  }, []);

  return {
    preferences,
    updatePreference,
    savePreferences,
    resetPreferences,
  };
};

export default useReadingPreferences;

