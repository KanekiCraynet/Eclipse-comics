// utils/apiHelpers.js
import { safeParseJSON } from './storageHelpers';

/**
 * Extract data from API response consistently
 * Handles both axios response format and direct data format
 * API wrapper returns: { data: { status: 'success', data: [...] } }
 * This function extracts the actual data from the response
 */
export const extractApiData = (response) => {
  if (!response) {
    return null;
  }

  // If response is already the data (not wrapped in axios response)
  if (!response.data && !response.status) {
    return response;
  }

  // Handle axios response format: response.data
  const responseData = response.data || response;

  // If responseData has status field, it's from API wrapper
  if (responseData.status !== undefined) {
    if (responseData.status === 'success') {
      // API wrapper format: { status: 'success', data: [...] }
      return responseData.data !== undefined ? responseData.data : responseData;
    } else {
      throw new Error(responseData.message || 'API request failed');
    }
  }

  // Direct data format (already extracted)
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
  if (!url || typeof url !== 'string') {
    return fallback;
  }
  try {
    // Only allow absolute http(s) URLs. If the API gives a relative path (e.g. '/placeholder.jpg'), use the fallback
    const isAbsolute = /^https?:\/\//i.test(url);
    if (!isAbsolute) return fallback;
    // Remove resize parameters if present
    return url.split('?')[0];
  } catch (error) {
    console.error('[API Helpers] Error processing image URL:', error);
    return fallback;
  }
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