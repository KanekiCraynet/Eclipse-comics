import { useState, useEffect, useCallback, useRef } from 'react';
import { useKomikcastAPI } from './useKomikcastAPI';

/**
 * Hook for fetching multiple endpoints simultaneously using Promise.all
 * Handles partial failures gracefully
 */
export const useParallelFetch = (apiFunctions, options = {}) => {
  const {
    enableCache = true,
    cacheTTL = 30 * 60 * 1000,
    dependencies = [],
    skip = false,
  } = options;

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(!skip);
  const [errors, setErrors] = useState([]);
  const [overallError, setOverallError] = useState(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  // Validate input
  if (!Array.isArray(apiFunctions) || apiFunctions.length === 0) {
    console.warn('[useParallelFetch] apiFunctions must be a non-empty array');
    return {
      results: [],
      loading: false,
      errors: [],
      overallError: 'Invalid apiFunctions array',
      allSucceeded: false,
      someSucceeded: false,
    };
  }

  // Fetch all data in parallel
  const fetchAll = useCallback(async () => {
    if (skip) {
      setLoading(false);
      return;
    }

    // Cancel previous requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setErrors([]);
    setOverallError(null);

    try {
      // Create promises for all API calls
      const promises = apiFunctions.map((apiFunction, index) => {
        if (typeof apiFunction !== 'function') {
          return Promise.reject(new Error(`Invalid API function at index ${index}`));
        }

        return apiFunction({
          signal,
          enableDeduplication: true,
        }).catch((error) => {
          // Return error object instead of throwing
          return {
            error: true,
            index,
            message: error.message || 'Request failed',
            originalError: error,
          };
        });
      });

      // Execute all promises in parallel
      const responses = await Promise.all(promises);

      // Check if request was cancelled
      if (signal.aborted || !mountedRef.current) {
        return;
      }

      // Process results
      const processedResults = [];
      const processedErrors = [];
      let hasErrors = false;

      responses.forEach((response, index) => {
        if (response && response.error) {
          // This is an error object
          processedErrors.push({
            index,
            message: response.message,
            originalError: response.originalError,
          });
          processedResults.push(null);
          hasErrors = true;
        } else {
          // Success response
          try {
            // Extract data from response
            const data = response?.data || response;
            processedResults.push(data);
            processedErrors.push(null);
          } catch (err) {
            processedErrors.push({
              index,
              message: err.message || 'Failed to process response',
            });
            processedResults.push(null);
            hasErrors = true;
          }
        }
      });

      // Update state
      setResults(processedResults);
      setErrors(processedErrors);
      setOverallError(hasErrors ? 'Some requests failed' : null);
    } catch (err) {
      // Fatal error (shouldn't happen with Promise.all, but handle it anyway)
      if (!signal.aborted && mountedRef.current) {
        setOverallError(err.message || 'Failed to fetch data');
        setResults(apiFunctions.map(() => null));
        setErrors(apiFunctions.map((_, index) => ({
          index,
          message: err.message || 'Request failed',
        })));
      }
    } finally {
      if (mountedRef.current && !signal.aborted) {
        setLoading(false);
      }
    }
  }, [apiFunctions, skip, ...dependencies]);

  // Effect to fetch data
  useEffect(() => {
    fetchAll();

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAll]);

  // Refetch all
  const refetch = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  // Check success status
  const allSucceeded = errors.every(err => err === null);
  const someSucceeded = results.some(result => result !== null);

  return {
    results,
    loading,
    errors,
    overallError,
    allSucceeded,
    someSucceeded,
    refetch,
  };
};

/**
 * Hook for fetching multiple API endpoints with individual loading/error states
 */
export const useParallelFetchDetailed = (apiFunctionsConfig, options = {}) => {
  const {
    enableCache = true,
    cacheTTL = 30 * 60 * 1000,
    dependencies = [],
    skip = false,
  } = options;

  // Validate input
  if (!Array.isArray(apiFunctionsConfig) || apiFunctionsConfig.length === 0) {
    console.warn('[useParallelFetchDetailed] apiFunctionsConfig must be a non-empty array');
    return {
      states: [],
      allLoading: false,
      allSucceeded: false,
      someSucceeded: false,
    };
  }

  // Use individual hooks for each API function
  const states = apiFunctionsConfig.map((config, index) => {
    const { apiFunction, cacheKey, ...hookOptions } = config;
    
    return useKomikcastAPI(apiFunction, {
      cacheKey: cacheKey || (enableCache ? `parallel_${index}` : null),
      cacheTTL,
      enableCache,
      skip,
      ...hookOptions,
    });
  });

  const allLoading = states.some(state => state.loading);
  const allSucceeded = states.every(state => !state.loading && !state.error && state.data !== null);
  const someSucceeded = states.some(state => !state.loading && !state.error && state.data !== null);

  const refetchAll = useCallback(() => {
    states.forEach(state => {
      if (state.refetch) {
        state.refetch();
      }
    });
  }, [states]);

  return {
    states,
    allLoading,
    allSucceeded,
    someSucceeded,
    refetchAll,
  };
};

export default useParallelFetch;

