import { useState, useEffect, useCallback, useRef } from 'react';
import { komikcastAPI } from '../services/api';
import cacheManager from '../services/cacheManager';
import { extractApiData, validateSearchResponse } from '../utils/apiHelpers';

/**
 * Debounced search hook with cancellation and caching
 */
export const useDebounceSearch = (keyword, options = {}) => {
  const {
    debounceMs = 300,
    minLength = 3,
    enableCache = true,
    cacheTTL = 10 * 60 * 1000, // 10 minutes for search results
  } = options;

  const [searchKeyword, setSearchKeyword] = useState(keyword || '');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  // Debounce keyword
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchKeyword, debounceMs]);

  // Search function
  const performSearch = useCallback(async (searchTerm) => {
    // Validate minimum length
    if (!searchTerm || searchTerm.trim().length < minLength) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const trimmedKeyword = searchTerm.trim();

    // Check cache first
    if (enableCache) {
      const cacheKey = `search_${trimmedKeyword}`;
      const cachedData = cacheManager.get(cacheKey);
      if (cachedData !== null) {
        setData(cachedData);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);

    try {
      const response = await komikcastAPI.search(trimmedKeyword, {
        signal,
        enableDeduplication: true,
      });

      // Extract data from response consistently
      const extractedData = extractApiData(response);
      const validatedData = validateSearchResponse(extractedData);

      // Only update if component is mounted and not cancelled
      if (mountedRef.current && !signal.aborted) {
        setData(validatedData);
        setError(null);

        // Cache the result
        if (enableCache) {
          const cacheKey = `search_${trimmedKeyword}`;
          cacheManager.set(cacheKey, validatedData, cacheTTL);
        }
      }
    } catch (err) {
      // Don't update if cancelled or unmounted
      if (signal.aborted || !mountedRef.current) {
        return;
      }

      // Extract error message from transformed error (API wrapper already provides user-friendly messages)
      const errorMessage = err.message || 'Gagal melakukan pencarian. Silakan coba lagi.';
      setError(errorMessage);
      setData(null);
    } finally {
      if (mountedRef.current && !signal.aborted) {
        setLoading(false);
      }
    }
  }, [minLength, enableCache, cacheTTL]);

  // Effect to perform search when debounced keyword changes
  useEffect(() => {
    performSearch(debouncedKeyword);

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedKeyword, performSearch]);

  // Manual search trigger
  const search = useCallback((keyword) => {
    setSearchKeyword(keyword || '');
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchKeyword('');
    setDebouncedKeyword('');
    setData(null);
    setError(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Check if search is valid
  const isValidSearch = searchKeyword.trim().length >= minLength;

  return {
    keyword: searchKeyword,
    debouncedKeyword,
    data,
    loading,
    error,
    search,
    clearSearch,
    isValidSearch,
    hasResults: data?.seriesList?.length > 0,
  };
};

export default useDebounceSearch;

