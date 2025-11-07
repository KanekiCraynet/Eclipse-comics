import APIWrapper from './apiWrapper';
import {
  validateEndpoint,
  validateKeyword,
  validateGenre,
  validatePage,
} from '../utils/apiHelpers';

const BASE_URL = 'https://api-komikcast.vercel.app';

// Create API wrapper instance with retry logic and deduplication
const apiWrapper = new APIWrapper(BASE_URL, {
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
});

// API Methods with parameter validation and error handling
export const komikcastAPI = {
  /**
   * Get recommended comics
   */
  getRecommended: (options = {}) => {
    return apiWrapper.get('/recommended', {}, {
      ...options,
      enableDeduplication: true,
    });
  },

  /**
   * Get popular comics
   */
  getPopular: (options = {}) => {
    return apiWrapper.get('/popular', {}, {
      ...options,
      enableDeduplication: true,
    });
  },

  /**
   * Get newest comics (terbaru) with pagination
   */
  getTerbaru: (page = 1, options = {}) => {
    try {
      const validatedPage = validatePage(page);
      return apiWrapper.get('/terbaru', {
        params: { page: validatedPage },
      }, {
        ...options,
        enableDeduplication: true,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  },

  /**
   * Get komik detail by endpoint
   */
  getDetail: (endpoint, options = {}) => {
    try {
      const validatedEndpoint = validateEndpoint(endpoint);
      return apiWrapper.get(`/detail/${validatedEndpoint}`, {}, {
        ...options,
        enableDeduplication: true,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  },

  /**
   * Search comics by keyword
   */
  search: (keyword, options = {}) => {
    try {
      const validatedKeyword = validateKeyword(keyword);
      return apiWrapper.get('/search', {
        params: { keyword: validatedKeyword },
      }, {
        ...options,
        enableDeduplication: true,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  },

  /**
   * Read chapter by endpoint
   */
  readChapter: (endpoint, options = {}) => {
    try {
      const validatedEndpoint = validateEndpoint(endpoint);
      return apiWrapper.get(`/read/${validatedEndpoint}`, {}, {
        ...options,
        enableDeduplication: true,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  },

  /**
   * Get all genres
   */
  getGenres: (options = {}) => {
    return apiWrapper.get('/genre', {}, {
      ...options,
      enableDeduplication: true,
    });
  },

  /**
   * Get comics by genre with pagination
   */
  getGenreComics: (genre, page = 1, options = {}) => {
    try {
      const validatedGenre = validateGenre(genre);
      const validatedPage = validatePage(page);
      return apiWrapper.get(`/genre/${validatedGenre}`, {
        params: { page: validatedPage },
      }, {
        ...options,
        enableDeduplication: true,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  },
};

// Export wrapper for advanced usage
export { apiWrapper };

// Export default for backward compatibility (deprecated)
export default apiWrapper.axiosInstance;