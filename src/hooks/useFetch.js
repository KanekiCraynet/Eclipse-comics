// hooks/useFetch.js
import { useState, useEffect, useCallback } from 'react';
import { validateApiResponse } from '../utils/apiHelpers';

export const useFetch = (apiFunction) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFunction();
      const validatedData = validateApiResponse(response);

      setData(validatedData);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Terjadi kesalahan');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  // Note: Any external deps should be closed over in apiFunction so fetchData
  // identity changes when needed. Keep deps minimal to satisfy eslint.
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};