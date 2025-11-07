// utils/apiHelpers.js
export const validateApiResponse = (response, expectedDataType = 'array') => {
  if (!response?.data) {
    throw new Error('Invalid API response structure');
  }

  const { status, data } = response.data;

  if (status !== 'success') {
    throw new Error(response.data?.message || 'API request failed');
  }

  if (expectedDataType === 'array' && !Array.isArray(data)) {
    console.warn('Expected array but got:', typeof data);
    return [];
  }

  return data;
};

export const safeArrayMap = (data, fallback = []) => {
  return Array.isArray(data) ? data : fallback;
};

export const safeStringSplit = (str, separator = ',', fallback = []) => {
  if (typeof str !== 'string') {
    return fallback;
  }
  return str.split(separator).map(s => s.trim()).filter(Boolean);
};

export const safeImageUrl = (url, fallback = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AD//2Q==') => {
  if (!url || typeof url !== 'string') {
    return fallback;
  }
  // Remove resize parameters if present
  return url.split('?')[0];
};

export const safeEndpoint = (url, fallback = '') => {
  if (!url || typeof url !== 'string') {
    return fallback;
  }
  // Extract endpoint from URL path
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1] || fallback;
};