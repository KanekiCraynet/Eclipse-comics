import APIWrapper from './apiWrapper';
import {
  validateEndpoint,
  validateKeyword,
  validateGenre,
  validatePage,
} from '../utils/apiHelpers';
import { API_CONFIG, API_ENDPOINTS } from '../constants/api';

// Create API wrapper instance with retry logic and deduplication
const apiWrapper = new APIWrapper(API_CONFIG.BASE_URL, {
  timeout: API_CONFIG.TIMEOUT,
  retries: API_CONFIG.RETRIES,
  retryDelay: API_CONFIG.RETRY_DELAY,
});

// API Methods with parameter validation and error handling
export const komikcastAPI = {
  /**
   * Get recommended comics
   * GET /recommended
   * Returns: Array of recommended comics
   */
  getRecommended: (options = {}) => {
    return apiWrapper.get(API_ENDPOINTS.RECOMMENDED, {}, {
      ...options,
      enableDeduplication: true,
    });
  },

  /**
   * Get popular comics
   * GET /popular
   * Returns: Array of popular comics
   */
  getPopular: (options = {}) => {
    return apiWrapper.get(API_ENDPOINTS.POPULAR, {}, {
      ...options,
      enableDeduplication: true,
    });
  },

  /**
   * Get newest comics (terbaru) with pagination
   * GET /terbaru?page=1
   * @param {number} page - Page number (default: 1)
   * @param {object} options - Additional options
   * @returns {Promise} Array of latest comics
   */
  getTerbaru: (page = 1, options = {}) => {
    try {
      const validatedPage = validatePage(page);
      return apiWrapper.get(API_ENDPOINTS.TERBARU, {
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
   * GET /detail/:endpoint
   * @param {string} endpoint - Komik endpoint (e.g., "solo-leveling")
   * @param {object} options - Additional options
   * @returns {Promise} Komik detail object
   */
  getDetail: (endpoint, options = {}) => {
    try {
      const validatedEndpoint = validateEndpoint(endpoint);
      return apiWrapper.get(`${API_ENDPOINTS.DETAIL}/${validatedEndpoint}`, {}, {
        ...options,
        enableDeduplication: true,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  },

  /**
   * Search comics by keyword
   * GET /search?keyword=query
   * @param {string} keyword - Search keyword (min 2 characters)
   * @param {object} options - Additional options
   * @returns {Promise} Search results object with seriesList and pagination
   */
  search: (keyword, options = {}) => {
    try {
      const validatedKeyword = validateKeyword(keyword);
      return apiWrapper.get(API_ENDPOINTS.SEARCH, {
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
   * GET /read/:endpoint
   * @param {string} endpoint - Chapter endpoint (e.g., "solo-leveling-chapter-1")
   * @param {object} options - Additional options
   * @returns {Promise} Chapter object with title and panel (images array)
   */
  readChapter: (endpoint, options = {}) => {
    try {
      const validatedEndpoint = validateEndpoint(endpoint);
      return apiWrapper.get(`${API_ENDPOINTS.READ}/${validatedEndpoint}`, {}, {
        ...options,
        enableDeduplication: true,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  },

  /**
   * Get all genres
   * GET /genre
   * @param {object} options - Additional options
   * @returns {Promise} Array of genre objects
   */
  getGenres: (options = {}) => {
    return apiWrapper.get(API_ENDPOINTS.GENRE, {}, {
      ...options,
      enableDeduplication: true,
    });
  },

  /**
   * Get comics by genre with pagination
   * GET /genre/:genre?page=1
   * @param {string} genre - Genre name (e.g., "action")
   * @param {number} page - Page number (default: 1)
   * @param {object} options - Additional options
   * @returns {Promise} Array of comics in the genre
   */
  getGenreComics: (genre, page = 1, options = {}) => {
    try {
      const validatedGenre = validateGenre(genre);
      const validatedPage = validatePage(page);
      return apiWrapper.get(`${API_ENDPOINTS.GENRE}/${validatedGenre}`, {
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