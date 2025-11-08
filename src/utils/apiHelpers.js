// utils/apiHelpers.js
import { safeParseJSON } from './storageHelpers';

/**
 * Extract data from API response consistently
 * Handles both axios response format and direct data format
 * API wrapper validateResponse already extracts data from { status: 'success', data: {...} }
 * This function handles the final extraction from axios response format
 */
export const extractApiData = (response) => {
  if (!response) {
    return null;
  }

  // eslint-disable-next-line no-undef
  if (process.env.NODE_ENV === 'development') {
    console.log('[API] extractApiData - Input:', {
      hasResponse: !!response,
      hasData: !!response.data,
      dataType: typeof response.data,
      isAxiosResponse: !!(response.status && response.headers),
      dataKeys: response.data ? Object.keys(response.data) : [],
    });
  }

  // If response is already the data (not wrapped in axios response)
  // Check if it's a plain object without axios response structure
  if (typeof response === 'object' && !response.data && !response.status && !response.headers) {
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] extractApiData - Direct data format, returning as-is');
    }
    return response;
  }

  // Handle axios response format: response.data
  // After validateResponse, response.data should already be the extracted data
  // Check if this is an axios response (has status and headers)
  const isAxiosResponse = !!(response.status && response.headers);
  
  if (isAxiosResponse) {
    // This is an axios response, validateResponse has already processed it
    // response.data should already be the extracted data (without API status wrapper)
    // We should NOT check for status field here because data might have its own status field
    // (e.g., comic status: "Ongoing", "Completed", etc.)
    const responseData = response.data;
    
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] extractApiData - Axios response format, using response.data directly');
    }
    
    return responseData;
  }

  // Not an axios response, might be direct data or unprocessed response
  const responseData = response.data !== undefined ? response.data : response;

  // Only check for API status wrapper if this is NOT an axios response
  // and the responseData looks like an API response wrapper
  if (responseData && typeof responseData === 'object' && responseData.status !== undefined) {
    // Check if this looks like an API response wrapper (has status and possibly data field)
    // API response wrapper: { status: 'success', data: {...} } or { status: 'error', message: '...' }
    const looksLikeApiWrapper = responseData.status === 'success' || responseData.status === 'error' || responseData.status === 'failed';
    
    if (looksLikeApiWrapper) {
      // eslint-disable-next-line no-undef
      if (process.env.NODE_ENV === 'development') {
        console.warn('[API] extractApiData - API wrapper detected, extracting...');
      }
      
      if (responseData.status === 'success') {
        // API format: { status: 'success', data: [...] }
        if (responseData.data !== undefined) {
          // eslint-disable-next-line no-undef
          if (process.env.NODE_ENV === 'development') {
            console.log('[API] extractApiData - Extracted data.data');
          }
          return responseData.data;
        } else {
          // Remove status field if data.data doesn't exist
          const { status, ...dataWithoutStatus } = responseData;
          // eslint-disable-next-line no-undef
          if (process.env.NODE_ENV === 'development') {
            console.log('[API] extractApiData - Removed status field');
          }
          return dataWithoutStatus;
        }
      } else {
        // Status is not 'success', this is an error
        const errorMessage = responseData.message || responseData.error || 'API request failed';
        // eslint-disable-next-line no-undef
        if (process.env.NODE_ENV === 'development') {
          console.error('[API] extractApiData - Error status:', {
            status: responseData.status,
            message: errorMessage,
          });
        }
        throw new Error(errorMessage);
      }
    }
    // If status field exists but doesn't look like API wrapper (e.g., status: "Ongoing" in comic data),
    // just return the data as-is
  }

  // Direct data format (already extracted by API wrapper validateResponse)
  // eslint-disable-next-line no-undef
  if (process.env.NODE_ENV === 'development') {
    console.log('[API] extractApiData - Output:', {
      hasData: !!responseData,
      dataType: typeof responseData,
      isArray: Array.isArray(responseData),
      dataKeys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : [],
    });
  }
  return responseData;
};

/**
 * Validate API response structure
 * @deprecated Use extractApiData instead for consistent data extraction
 */
export const validateApiResponse = (response, expectedDataType = 'array') => {
  const data = extractApiData(response);

  if (expectedDataType === 'array' && !Array.isArray(data)) {
    console.warn('Expected array but got:', typeof data);
    return [];
  }

  return data;
};

/**
 * Validate response schema for better error handling
 * @param {any} data - Response data to validate
 * @param {string} type - Expected data type ('array', 'object', 'string', 'number')
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateResponseSchema = (data, type = 'array') => {
  if (!data) return false;
  
  switch (type) {
    case 'array':
      return Array.isArray(data);
    case 'object':
      return typeof data === 'object' && !Array.isArray(data) && data !== null;
    case 'string':
      return typeof data === 'string';
    case 'number':
      return typeof data === 'number' && !isNaN(data);
    default:
      return true;
  }
};

/**
 * Validate and extract API response with schema validation
 * @param {any} response - API response
 * @param {string} expectedType - Expected data type ('array', 'object')
 * @param {string} endpoint - API endpoint for error messages
 * @returns {any} - Extracted and validated data
 */
export const validateAndExtractResponse = (response, expectedType = 'array', endpoint = '') => {
  try {
    const data = extractApiData(response);
    
    if (!validateResponseSchema(data, expectedType)) {
      console.warn(`[API] Invalid response schema for ${endpoint}: expected ${expectedType}, got ${typeof data}`);
      return expectedType === 'array' ? [] : null;
    }
    
    return data;
  } catch (error) {
    console.error(`[API] Error validating response for ${endpoint}:`, error);
    return expectedType === 'array' ? [] : null;
  }
};

/**
 * Validate API parameters
 */
export const validateEndpoint = (endpoint) => {
  if (!endpoint || typeof endpoint !== 'string') {
    throw new Error('Endpoint must be a non-empty string');
  }
  if (endpoint.trim().length === 0) {
    throw new Error('Endpoint cannot be empty');
  }
  return endpoint.trim();
};

export const validateKeyword = (keyword) => {
  if (!keyword || typeof keyword !== 'string') {
    throw new Error('Keyword must be a non-empty string');
  }
  const trimmed = keyword.trim();
  if (trimmed.length === 0) {
    throw new Error('Keyword cannot be empty');
  }
  if (trimmed.length < 2) {
    throw new Error('Keyword must be at least 2 characters');
  }
  return trimmed;
};

export const validateGenre = (genre) => {
  if (!genre || typeof genre !== 'string') {
    throw new Error('Genre must be a non-empty string');
  }
  return genre.trim().toLowerCase();
};

export const validatePage = (page) => {
  const pageNum = typeof page === 'number' ? page : parseInt(page, 10);
  if (isNaN(pageNum) || pageNum < 1) {
    throw new Error('Page must be a positive integer');
  }
  // Import VALIDATION from constants if needed, but for now use inline
  const MAX_PAGE = 1000;
  if (pageNum > MAX_PAGE) {
    throw new Error(`Page must be less than or equal to ${MAX_PAGE}`);
  }
  return pageNum;
};

/**
 * Safe array operations
 */
export const safeArrayMap = (data, fallback = []) => {
  return Array.isArray(data) ? data : fallback;
};

export const safeArrayFilter = (data, predicate, fallback = []) => {
  if (!Array.isArray(data)) {
    return fallback;
  }
  try {
    return data.filter(predicate);
  } catch (error) {
    console.error('[API Helpers] Error filtering array:', error);
    return fallback;
  }
};

export const safeArrayFind = (data, predicate, fallback = null) => {
  if (!Array.isArray(data)) {
    return fallback;
  }
  try {
    return data.find(predicate) || fallback;
  } catch (error) {
    console.error('[API Helpers] Error finding in array:', error);
    return fallback;
  }
};

/**
 * Safe string operations
 */
export const safeStringSplit = (str, separator = ',', fallback = []) => {
  if (typeof str !== 'string') {
    return fallback;
  }
  try {
    return str.split(separator).map(s => s.trim()).filter(Boolean);
  } catch (error) {
    console.error('[API Helpers] Error splitting string:', error);
    return fallback;
  }
};

export const safeStringTrim = (str, fallback = '') => {
  if (typeof str !== 'string') {
    return fallback;
  }
  return str.trim() || fallback;
};

/**
 * Safe image URL validation and normalization
 */
export const safeImageUrl = (url, fallback = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AD//2Q==') => {
  if (!url) {
    return fallback;
  }
  
  // Convert to string if it's not already
  let urlString = String(url).trim();
  
  // Return fallback if empty after trimming
  if (!urlString) {
    return fallback;
  }
  
  try {
    // Only allow absolute http(s) URLs. If the API gives a relative path (e.g. '/placeholder.jpg'), use the fallback
    // Check for both http:// and https:// with case-insensitive matching
    const isAbsolute = /^https?:\/\//i.test(urlString);
    if (!isAbsolute) {
      // eslint-disable-next-line no-undef
      if (process.env.NODE_ENV === 'development') {
        console.warn('[API Helpers] Invalid image URL (not absolute):', urlString.substring(0, 50));
      }
      return fallback;
    }
    
    // Remove resize parameters if present (optional - some CDNs need query params)
    // For now, keep query parameters as they might be needed for some image services
    // Just ensure the URL is valid
    return urlString;
  } catch (error) {
    console.error('[API Helpers] Error processing image URL:', error, url);
    return fallback;
  }
};

/**
 * Generate WebP version of image URL
 * Attempts to convert image URL to WebP format if possible
 * @param {string} url - Original image URL
 * @returns {string|null} - WebP URL or null if conversion not possible
 */
export const generateWebPUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    const normalizedUrl = safeImageUrl(url);
    if (normalizedUrl === url || !normalizedUrl) {
      return null;
    }

    // Check if URL already ends with .webp
    if (normalizedUrl.toLowerCase().endsWith('.webp')) {
      return normalizedUrl;
    }

    // Try to replace extension with .webp
    const urlWithoutExt = normalizedUrl.replace(/\.(jpg|jpeg|png|gif)$/i, '');
    if (urlWithoutExt !== normalizedUrl) {
      return `${urlWithoutExt}.webp`;
    }

    // If no extension found, try appending .webp (some CDNs support this)
    // Note: This is a fallback and may not work for all image sources
    return null;
  } catch (error) {
    console.error('[API Helpers] Error generating WebP URL:', error);
    return null;
  }
};

/**
 * Generate blur placeholder data URL
 * Creates a tiny blurred version of the image for placeholder
 * @param {string} url - Image URL
 * @param {number} width - Placeholder width (default: 20)
 * @param {number} height - Placeholder height (default: 20)
 * @returns {string} - Data URL for blur placeholder
 */
export const generateBlurPlaceholder = (url, width = 20, height = 20) => {
  // For now, return a simple gradient placeholder
  // In production, you might want to use a service like blurhash or generate actual blur
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Create gradient placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a1a1a');
  gradient.addColorStop(1, '#2a2a2a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/jpeg', 0.1);
};

/**
 * Check if browser supports WebP format
 * @returns {Promise<boolean>} - True if WebP is supported
 */
export const checkWebPSupport = () => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

/**
 * Safe endpoint extraction from URL
 */
export const safeEndpoint = (url, fallback = '') => {
  if (!url || typeof url !== 'string') {
    return fallback;
  }
  try {
    // Extract endpoint from URL path
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1] || fallback;
  } catch (error) {
    console.error('[API Helpers] Error extracting endpoint:', error);
    return fallback;
  }
};

/**
 * Safe number operations
 */
export const safeNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
};

export const safeInteger = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Extract chapter information from various API response formats
 * Handles:
 * - Array format: [{title: "Chapter 240", href: "...", date: "..."}]
 * - String format: "Ch.940" or "Chapter 240"
 * - Direct chapter object: {title: "Chapter 240", ...}
 * 
 * @param {any} chapterData - Chapter data from API (can be array, string, or object)
 * @param {string} fallback - Fallback value if chapter cannot be extracted
 * @returns {string} - Cleaned chapter string (e.g., "240" or "940")
 */
export const extractChapter = (chapterData, fallback = 'N/A') => {
  if (!chapterData) {
    return fallback;
  }

  let chapterString = '';

  // Handle array format (from detail API)
  if (Array.isArray(chapterData)) {
    // First item is usually the latest chapter
    const latestChapter = chapterData[0];
    if (latestChapter && typeof latestChapter === 'object') {
      chapterString = latestChapter.title || latestChapter.chapterTitle || '';
    } else if (typeof latestChapter === 'string') {
      chapterString = latestChapter;
    }
  }
  // Handle string format (from recommended API)
  else if (typeof chapterData === 'string') {
    chapterString = chapterData;
  }
  // Handle object format
  else if (typeof chapterData === 'object') {
    chapterString = chapterData.title || chapterData.chapterTitle || chapterData.latestChapter || '';
  }

  // Clean chapter string - remove "Ch." and "Chapter" prefixes
  if (chapterString) {
    let cleaned = String(chapterString).trim();
    // Remove "Chapter" prefix first (longer match)
    cleaned = cleaned.replace(/^Chapter\s+/i, '');
    // Then remove "Ch." prefix
    cleaned = cleaned.replace(/^Ch\.?\s*/i, '');
    return cleaned || fallback;
  }

  return fallback;
};

/**
 * Extract and normalize rating from API response
 * Handles both string ("7.00") and number (7.0) formats
 * 
 * @param {any} rating - Rating from API
 * @param {string|number} fallback - Fallback value if rating cannot be extracted
 * @returns {string} - Normalized rating string (e.g., "7.00")
 */
export const extractRating = (rating, fallback = '0') => {
  if (rating === null || rating === undefined) {
    return String(fallback);
  }

  // If it's already a string, return it (may need formatting)
  if (typeof rating === 'string') {
    const parsed = parseFloat(rating);
    if (!isNaN(parsed)) {
      // Format to 2 decimal places if needed
      return parsed.toFixed(2);
    }
    return rating || String(fallback);
  }

  // If it's a number, format it
  if (typeof rating === 'number' && !isNaN(rating)) {
    return rating.toFixed(2);
  }

  return String(fallback);
};

/**
 * Data normalization utilities
 */
export const normalizeKomikData = (komik) => {
  if (!komik || typeof komik !== 'object') {
    return null;
  }
  
  return {
    title: safeStringTrim(komik.title || komik.name, 'Untitled'),
    endpoint: safeEndpoint(komik.endpoint || komik.link || komik.url, ''),
    thumbnail: safeImageUrl(komik.image || komik.imageSrc || komik.thumbnail),
    rating: safeNumber(komik.rating, 0),
    author: safeStringTrim(komik.author, 'Unknown'),
    released: safeStringTrim(komik.released || komik.releaseDate, 'Unknown'),
    description: safeStringTrim(komik.description || komik.synopsis, ''),
    genre: Array.isArray(komik.genre) ? komik.genre : safeStringSplit(komik.genre || komik.genres),
    chapter: komik.chapter || komik.chapters || [],
    latestChapter: safeStringTrim(komik.latestChapter || komik.chapter?.[0]?.title, 'N/A'),
  };
};

export const normalizeChapterData = (chapter) => {
  if (!chapter || typeof chapter !== 'object') {
    return null;
  }
  
  // API returns { title: "...", panel: [...] } for read endpoint
  const panel = Array.isArray(chapter.panel) ? chapter.panel : [];
  const images = Array.isArray(chapter.images) ? chapter.images : panel;
  
  return {
    title: safeStringTrim(chapter.title, 'Untitled Chapter'),
    href: safeStringTrim(chapter.href || chapter.url || chapter.link, ''),
    date: safeStringTrim(chapter.date || chapter.releaseDate, ''),
    images: images.map(img => safeImageUrl(img)),
    panel: panel.map(img => safeImageUrl(img)),
    prevChapter: safeStringTrim(chapter.prevChapter || chapter.previous, ''),
    nextChapter: safeStringTrim(chapter.nextChapter || chapter.next, ''),
  };
};

/**
 * Response schema validation
 */
export const validateKomikListResponse = (data) => {
  if (!Array.isArray(data)) {
    console.warn('[API Helpers] Expected array for komik list, got:', typeof data);
    return [];
  }
  return data.map(komik => normalizeKomikData(komik)).filter(Boolean);
};

export const validateKomikDetailResponse = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid komik detail response');
  }
  return normalizeKomikData(data);
};

export const validateChapterResponse = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid chapter response');
  }
  return normalizeChapterData(data);
};

export const validateSearchResponse = (data) => {
  if (!data || typeof data !== 'object') {
    return { seriesList: [], pagination: [] };
  }
  
  // API returns { status: "success", data: [...] } directly
  // Check if data is an array (direct response) or has seriesList property
  const seriesList = Array.isArray(data) 
    ? data.map(komik => normalizeKomikData(komik)).filter(Boolean)
    : Array.isArray(data.seriesList) 
      ? data.seriesList.map(komik => normalizeKomikData(komik)).filter(Boolean)
      : Array.isArray(data.data)
        ? data.data.map(komik => normalizeKomikData(komik)).filter(Boolean)
        : [];
  
  const pagination = Array.isArray(data.pagination) ? data.pagination : [];
  
  return { seriesList, pagination };
};

/**
 * Safe JSON parsing with fallback
 */
export const safeParseJSONResponse = (jsonString, fallback = null) => {
  return safeParseJSON(jsonString, fallback);
};

/**
 * Validate and sanitize user input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove potentially dangerous characters but keep basic punctuation
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Error Types
 */
export const ERROR_TYPES = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  NOT_FOUND: 'not_found',
  SERVER_ERROR: 'server_error',
  RATE_LIMIT: 'rate_limit',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown',
};

/**
 * Create standardized error response
 * @param {string} message - Error message
 * @param {string} type - Error type (from ERROR_TYPES)
 * @param {any} data - Additional error data
 * @param {number} status - HTTP status code (if applicable)
 * @returns {object} - Standardized error object
 */
export const createErrorResponse = (message, type = ERROR_TYPES.UNKNOWN, data = null, status = null) => {
  return {
    status: 'error',
    message: message || 'Terjadi kesalahan yang tidak diketahui',
    type,
    data: data || [],
    statusCode: status,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Classify error type from error object
 * @param {object} error - Error object from API wrapper
 * @returns {string} - Error type
 */
export const classifyErrorType = (error) => {
  if (!error) return ERROR_TYPES.UNKNOWN;

  // Check for network errors
  if (error.isNetworkError) {
    if (error.message?.includes('timeout') || error.message?.includes('habis')) {
      return ERROR_TYPES.TIMEOUT;
    }
    return ERROR_TYPES.NETWORK;
  }

  // Check for HTTP status codes
  if (error.status) {
    if (error.status === 404) {
      return ERROR_TYPES.NOT_FOUND;
    }
    if (error.status === 429) {
      return ERROR_TYPES.RATE_LIMIT;
    }
    if (error.status >= 500) {
      return ERROR_TYPES.SERVER_ERROR;
    }
    if (error.status === 400) {
      return ERROR_TYPES.VALIDATION;
    }
  }

  // Check for validation errors
  if (error.message?.includes('must be') || error.message?.includes('required')) {
    return ERROR_TYPES.VALIDATION;
  }

  // Check for specific error messages
  const message = error.message?.toLowerCase() || '';
  if (message.includes('page is required') || message.includes('keyword') || message.includes('endpoint')) {
    return ERROR_TYPES.VALIDATION;
  }
  if (message.includes('not found') || message.includes('tidak ditemukan')) {
    return ERROR_TYPES.NOT_FOUND;
  }
  if (message.includes('comic not found')) {
    return ERROR_TYPES.NOT_FOUND;
  }

  return ERROR_TYPES.UNKNOWN;
};

/**
 * Extract user-friendly error message from error object
 * @param {object} error - Error object
 * @returns {string} - User-friendly error message
 */
export const extractErrorMessage = (error) => {
  if (!error) return 'Terjadi kesalahan yang tidak diketahui';

  // Use message from error object if available
  if (error.message) {
    return error.message;
  }

  // Fallback to status-based messages
  if (error.status) {
    switch (error.status) {
      case 400:
        return 'Permintaan tidak valid. Silakan periksa parameter yang dikirim.';
      case 404:
        return 'Data tidak ditemukan.';
      case 429:
        return 'Terlalu banyak permintaan. Silakan tunggu sebentar.';
      case 500:
        return 'Kesalahan server. Silakan coba lagi nanti.';
      case 503:
        return 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.';
      default:
        return `Kesalahan server (${error.status}). Silakan coba lagi.`;
    }
  }

  return 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.';
};

/**
 * Normalize error to standardized format
 * @param {any} error - Error object (can be various formats)
 * @returns {object} - Standardized error response
 */
export const normalizeError = (error) => {
  if (!error) {
    return createErrorResponse(
      'Terjadi kesalahan yang tidak diketahui',
      ERROR_TYPES.UNKNOWN
    );
  }

  // If already in standardized format, return as is
  if (error.status === 'error' && error.type && error.message) {
    return error;
  }

  // Extract error information
  const type = classifyErrorType(error);
  const message = extractErrorMessage(error);
  const statusCode = error.status || error.statusCode || null;
  const data = error.data || null;

  return createErrorResponse(message, type, data, statusCode);
};