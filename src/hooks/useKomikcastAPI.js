import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { komikcastAPI } from '../services/api';
import cacheManager from '../services/cacheManager';
import { extractApiData, normalizeError, extractErrorMessage } from '../utils/apiHelpers';

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
  // Using JSON.stringify to create stable reference for dependency array
  const dependenciesString = useMemo(() => JSON.stringify(dependencies), [dependencies]);
  
  // Note: dependenciesString is used to track changes in dependencies array
  // We include it in dependency array to trigger re-fetch when dependencies change

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
      let extractedData;
      try {
        extractedData = extractApiData(response);
      } catch (extractError) {
        // eslint-disable-next-line no-undef
        if (process.env.NODE_ENV === 'development') {
          console.error('[API] extractApiData error:', {
            error: extractError.message,
            response: response,
          });
        }
        // If extractApiData fails, try to use response.data directly
        extractedData = response?.data || response;
      }

      // Validate extracted data
      if (extractedData === null || extractedData === undefined) {
        throw new Error('API mengembalikan data kosong');
      }

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

      // eslint-disable-next-line no-undef
      if (process.env.NODE_ENV === 'development') {
        console.error('[API] useKomikcastAPI error:', {
          error: err,
          message: err.message,
          stack: err.stack,
        });
      }

      // Normalize error to standardized format and extract user-friendly message
      const normalizedError = normalizeError(err);
      const errorMessage = extractErrorMessage(normalizedError);
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
    // Dependencies are stringified to avoid spread element warning
    // We need dependenciesString to track changes in dependencies array
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
 * Supports pagination for terbaru and genre endpoints
 */
export const useKomikcastRoute = (route, options = {}) => {
  const {
    cacheKey = null,
    cacheTTL = 30 * 60 * 1000,
    enableCache = true,
    skip = false,
    page = 1, // Add page parameter support
  } = options;

  // Map route to API function
  const getApiFunction = useCallback(() => {
    if (route.startsWith('recommended')) {
      return komikcastAPI.getRecommended;
    } else if (route.startsWith('popular')) {
      return komikcastAPI.getPopular;
    } else if (route.startsWith('terbaru')) {
      // Extract page from route or use options.page
      const pageMatch = route.match(/\?page=(\d+)/);
      const routePage = pageMatch ? parseInt(pageMatch[1], 10) : page;
      // Validate and default to 1 if invalid
      const validPage = (routePage && routePage > 0 && routePage <= 1000) ? routePage : 1;
      return () => komikcastAPI.getTerbaru(validPage);
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
        const routePage = match[2] ? parseInt(match[2], 10) : page;
        // Validate and default to 1 if invalid
        const validPage = (routePage && routePage > 0 && routePage <= 1000) ? routePage : 1;
        return () => komikcastAPI.getGenreComics(genre, validPage);
      }
      return null;
    }
    return null;
  }, [route, page]);

  const apiFunction = getApiFunction();
  
  // Generate cache key with page if applicable
  const finalCacheKey = cacheKey || (enableCache 
    ? (route.startsWith('terbaru') || route.startsWith('genre/') 
      ? `route_${route}_page_${page}` 
      : `route_${route}`)
    : null);

  return useKomikcastAPI(
    apiFunction || (() => Promise.reject(new Error(`Invalid route: ${route}`))),
    {
      cacheKey: finalCacheKey,
      cacheTTL,
      enableCache,
      skip: skip || !apiFunction,
    }
  );
};

export default useKomikcastAPI;

