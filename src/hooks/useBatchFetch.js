import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for batch fetching with rate limiting
 * Useful for fetching multiple items with controlled concurrency
 * 
 * @param {Array} items - Array of items to fetch
 * @param {Function} fetchFn - Function to fetch a single item
 * @param {Object} options - Options for batch fetching
 * @param {number} options.batchSize - Number of concurrent requests (default: 3)
 * @param {number} options.delay - Delay between batches in ms (default: 100)
 * @param {boolean} options.enabled - Whether to enable fetching (default: true)
 * @returns {Object} - { data, loading, error, refetch }
 */
export const useBatchFetch = (items, fetchFn, options = {}) => {
  const {
    batchSize = 3,
    delay = 100,
    enabled = true,
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchBatch = useCallback(async () => {
    if (!enabled || !items || items.length === 0) {
      setData([]);
      setLoading(false);
      return;
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
    setData([]);

    try {
      const results = [];
      
      // Process items in batches
      for (let i = 0; i < items.length; i += batchSize) {
        // Check if request was cancelled
        if (signal.aborted || !mountedRef.current) {
          return;
        }

        const batch = items.slice(i, i + batchSize);
        
        // Fetch batch in parallel
        const batchPromises = batch.map(async (item, index) => {
          try {
            const result = await fetchFn(item, i + index);
            return { item, result, success: true };
          } catch (err) {
            console.warn(`Failed to fetch item ${i + index}:`, err);
            return { item, result: null, success: false, error: err };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add delay between batches (except for the last batch)
        if (i + batchSize < items.length && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Only update state if component is still mounted and request wasn't cancelled
      if (mountedRef.current && !signal.aborted) {
        setData(results);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current && !signal.aborted) {
        setError(err.message || 'Failed to fetch batch data');
        setData([]);
      }
    } finally {
      if (mountedRef.current && !signal.aborted) {
        setLoading(false);
      }
    }
  }, [items, fetchFn, batchSize, delay, enabled]);

  const refetch = useCallback(() => {
    fetchBatch();
  }, [fetchBatch]);

  useEffect(() => {
    mountedRef.current = true;
    fetchBatch();

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchBatch]);

  return { data, loading, error, refetch };
};

export default useBatchFetch;
