import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { komikcastAPI } from '../services/api';
import cacheManager from '../services/cacheManager';
import { extractApiData } from '../utils/apiHelpers';

/**
 * Unified API hook consolidating both useFetch implementations
 * Supports caching, retry logic, request cancellation, and parallel fetching
 */
export const useKomikcastAPI = (apiFunction, options = {}) => {
  const {
    cacheKey = null,
    cacheTTL = 30 * 60 * 1000, // 30 minutes default
    enableCache = true,
    enableRetry = true,
    retries = 3,
    retryDelay = 1000,
    dependencies = [],
    skip = false,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  // Memoize dependencies to avoid spread element warning
  const dependenciesString = useMemo(() => JSON.stringify(dependencies), [dependencies]);

  // Check cache first
  const getCachedData = useCallback(() => {
    if (!enableCache || !cacheKey) {
      return null;
    }
    return cacheManager.get(cacheKey);
  }, [enableCache, cacheKey]);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    if (skip) {
      setLoading(false);
      return;
    }

    // Check cache first
    if (enableCache && cacheKey) {
      const cachedData = getCachedData();
      if (cachedData !== null) {
        setData(cachedData);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);

    try {
      // Call API function with options
      const response = await apiFunction({
        signal,
        retries: enableRetry ? retries : 0,
        retryDelay,
        enableDeduplication: true,
      });

      // Extract data from response consistently
      const extractedData = extractApiData(response);

      // Only update state if component is still mounted
      if (mountedRef.current && !signal.aborted) {
        setData(extractedData);
        setError(null);

        // Cache the data
        if (enableCache && cacheKey) {
          cacheManager.set(cacheKey, extractedData, cacheTTL);
        }
      }
    } catch (err) {
      // Don't update state if request was cancelled or component unmounted
      if (signal.aborted || !mountedRef.current) {
        return;
      }

      // Extract error message from transformed error (API wrapper already provides user-friendly messages)
      const errorMessage = err.message || err.response?.data?.message || 'Gagal memuat data. Silakan coba lagi.';
      setError(errorMessage);
      setData(null);
    } finally {
      if (mountedRef.current && !signal.aborted) {
        setLoading(false);
      }
    }
  }, [
    apiFunction,
    skip,
    enableCache,
    cacheKey,
    cacheTTL,
    enableRetry,
    retries,
    retryDelay,
    getCachedData,
    dependenciesString,
  ]);

  // Refetch function
  const refetch = useCallback(() => {
    // Clear cache if exists
    if (cacheKey) {
      cacheManager.remove(cacheKey);
    }
    fetchData();
  }, [fetchData, cacheKey]);

  // Effect to fetch data
  useEffect(() => {
    fetchData();

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return { data, loading, error, refetch };
};

/**
 * Hook for fetching route-based API calls (backward compatibility)
 */
export const useKomikcastRoute = (route, options = {}) => {
  const {
    cacheKey = null,
    cacheTTL = 30 * 60 * 1000,
    enableCache = true,
    skip = false,
  } = options;

  // Map route to API function
  const getApiFunction = useCallback(() => {
    if (route.startsWith('recommended')) {
      return komikcastAPI.getRecommended;
    } else if (route.startsWith('popular')) {
      return komikcastAPI.getPopular;
    } else if (route.startsWith('detail/')) {
      const endpoint = route.replace('detail/', '');
      return () => komikcastAPI.getDetail(endpoint);
    } else if (route.startsWith('read/')) {
      const endpoint = route.replace('read/', '');
      return () => komikcastAPI.readChapter(endpoint);
    } else if (route.startsWith('search')) {
      // Extract keyword from route like "search?keyword=xxx" or "search/xxx"
      const parts = route.split('/');
      const keyword = parts.length > 1 ? parts[1] : route.split('keyword=')[1]?.split('&')[0];
      if (keyword) {
        return () => komikcastAPI.search(keyword);
      }
      return null;
    } else if (route.startsWith('genre/')) {
      // Extract genre and page from route like "genre/action?page=1"
      const match = route.match(/genre\/([^?]+)(?:\?page=(\d+))?/);
      if (match) {
        const genre = match[1];
        const page = match[2] ? parseInt(match[2], 10) : 1;
        return () => komikcastAPI.getGenreComics(genre, page);
      }
      return null;
    }
    return null;
  }, [route]);

  const apiFunction = getApiFunction();

  return useKomikcastAPI(
    apiFunction || (() => Promise.reject(new Error(`Invalid route: ${route}`))),
    {
      cacheKey: cacheKey || (enableCache ? `route_${route}` : null),
      cacheTTL,
      enableCache,
      skip: skip || !apiFunction,
    }
  );
};

export default useKomikcastAPI;

