/**
 * API Constants
 * Configuration and endpoint definitions for Komikcast API
 */

export const API_CONFIG = {
  BASE_URL: 'https://api-komikcast.vercel.app',
  TIMEOUT: 10000,
  RETRIES: 3,
  RETRY_DELAY: 1000,
};

export const API_ENDPOINTS = {
  RECOMMENDED: '/recommended',
  POPULAR: '/popular',
  TERBARU: '/terbaru',
  DETAIL: '/detail',
  READ: '/read',
  SEARCH: '/search',
  GENRE: '/genre',
};

export const API_RESPONSE_CODES = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export const CACHE_TTL = {
  RECOMMENDED: 30 * 60 * 1000, // 30 minutes
  POPULAR: 30 * 60 * 1000, // 30 minutes
  TERBARU: 15 * 60 * 1000, // 15 minutes (more frequent updates)
  DETAIL: 30 * 60 * 1000, // 30 minutes
  CHAPTER: 60 * 60 * 1000, // 1 hour (chapters don't change)
  SEARCH: 10 * 60 * 1000, // 10 minutes
  GENRE: 30 * 60 * 1000, // 30 minutes
};

export const VALIDATION = {
  MIN_KEYWORD_LENGTH: 2,
  MIN_PAGE: 1,
  MAX_PAGE: 1000,
};

