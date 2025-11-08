import axios from 'axios';
import { normalizeError, extractErrorMessage, classifyErrorType } from '../utils/apiHelpers';
import rateLimiter from '../utils/rateLimiter';
import { RATE_LIMIT } from '../constants/api';

/**
 * API Wrapper with retry logic, request deduplication, and error handling
 */
class APIWrapper {
  constructor(baseURL, defaultConfig = {}) {
    this.baseURL = baseURL;
    this.defaultConfig = {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      ...defaultConfig,
    };
    
    // Request deduplication cache
    this.pendingRequests = new Map();
    
    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL,
      timeout: this.defaultConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...defaultConfig.headers,
      },
    });
    
    // Setup interceptors
    this.setupInterceptors();
  }
  
  setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Only log in development and avoid console spam
        // eslint-disable-next-line no-undef
        if (process.env.NODE_ENV === 'development' && !config.url?.includes('/popular') && !config.url?.includes('/recommended')) {
          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => {
        // Only log errors, not warnings
        if (error.response?.status >= 500 || error.isNetworkError) {
          console.error('[API] Request error:', error);
        }
        return Promise.reject(error);
      }
    );
    
    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log successful responses in development for debugging
        // eslint-disable-next-line no-undef
        if (process.env.NODE_ENV === 'development') {
          console.log('[API] Response received:', {
            url: response.config?.url,
            status: response.status,
            hasData: !!response.data,
            dataType: typeof response.data,
            hasStatusField: response.data?.status !== undefined,
          });
        }
        return response;
      },
      (error) => {
        // Transform error for consistent handling
        const transformedError = this.transformError(error);
        // eslint-disable-next-line no-undef
        if (process.env.NODE_ENV === 'development') {
          console.error('[API] Response error:', {
            url: error.config?.url,
            status: error.response?.status,
            message: transformedError.message,
            data: error.response?.data,
          });
        }
        return Promise.reject(transformedError);
      }
    );
  }
  
  transformError(error) {
    let transformedError = {
      message: '',
      status: null,
      data: null,
      isNetworkError: false,
      originalError: error,
    };

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      let message = error.response.data?.message || error.response.data?.error;
      
      // Extract message from response data (handle various formats)
      if (!message && error.response.data) {
        if (typeof error.response.data === 'string') {
          message = error.response.data;
        } else if (error.response.data.data?.message) {
          message = error.response.data.data.message;
        }
      }

      // Handle specific error messages from API
      const errorMessageLower = (message || '').toLowerCase();
      if (errorMessageLower.includes('page is required')) {
        message = 'Parameter page diperlukan. Silakan berikan nomor halaman yang valid.';
      } else if (errorMessageLower.includes('comic not found') || errorMessageLower.includes('komik tidak ditemukan')) {
        message = 'Komik tidak ditemukan.';
      } else if (errorMessageLower.includes('chapter not found') || errorMessageLower.includes('chapter tidak ditemukan')) {
        message = 'Chapter tidak ditemukan.';
      } else if (errorMessageLower.includes('keyword') && errorMessageLower.includes('required')) {
        message = 'Keyword pencarian diperlukan.';
      }
      
      // Provide user-friendly error messages based on status code if no message
      if (!message) {
        switch (status) {
          case 400:
            message = 'Permintaan tidak valid. Silakan periksa parameter yang dikirim.';
            break;
          case 401:
            message = 'Tidak memiliki izin untuk mengakses data ini.';
            break;
          case 403:
            message = 'Akses ditolak.';
            break;
          case 404:
            message = 'Data tidak ditemukan.';
            break;
          case 429:
            message = 'Terlalu banyak permintaan. Silakan tunggu sebentar.';
            break;
          case 500:
            message = 'Kesalahan server. Silakan coba lagi nanti.';
            break;
          case 503:
            message = 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.';
            break;
          default:
            message = `Kesalahan server (${status}). Silakan coba lagi.`;
        }
      }
      
      transformedError = {
        message,
        status,
        data: error.response.data,
        isNetworkError: false,
        originalError: error,
      };
    } else if (error.request) {
      // Request made but no response (network error)
      transformedError = {
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        status: null,
        data: null,
        isNetworkError: true,
        originalError: error,
      };
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      // Request timeout
      transformedError = {
        message: 'Waktu permintaan habis. Silakan coba lagi.',
        status: null,
        data: null,
        isNetworkError: true,
        originalError: error,
      };
    } else {
      // Error setting up request (validation errors, etc.)
      transformedError = {
        message: error.message || 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.',
        status: null,
        data: null,
        isNetworkError: false,
        originalError: error,
      };
    }

    // Normalize to standardized error format
    return normalizeError(transformedError);
  }
  
  /**
   * Generate cache key for request deduplication
   */
  getRequestKey(config) {
    const { method = 'get', url, params, data } = config;
    const paramsStr = params ? JSON.stringify(params) : '';
    const dataStr = data ? JSON.stringify(data) : '';
    return `${method}:${url}:${paramsStr}:${dataStr}`;
  }
  
  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Calculate exponential backoff delay
   */
  getRetryDelay(attempt, baseDelay) {
    return baseDelay * Math.pow(2, attempt);
  }
  
  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    // Handle standardized error format
    const errorType = error.type || classifyErrorType(error);
    const statusCode = error.statusCode || error.status;
    
    // Don't retry on validation or not found errors
    if (errorType === 'validation' || errorType === 'not_found') {
      return false;
    }
    
    // Retry on network errors, timeouts, and server errors
    if (errorType === 'network' || errorType === 'timeout' || errorType === 'server_error') {
      return true;
    }
    
    // Retry on rate limit (with backoff)
    if (errorType === 'rate_limit') {
      return true;
    }
    
    // Fallback to status code check
    if (statusCode) {
      // Retry on 5xx errors and 429 (rate limit)
      return statusCode >= 500 || statusCode === 429;
    }
    
    // Retry on network errors (legacy check)
    return error.isNetworkError === true;
  }
  
  /**
   * Execute request with retry logic and deduplication
   */
  async request(config, options = {}) {
    const {
      retries = this.defaultConfig.retries,
      retryDelay = this.defaultConfig.retryDelay,
      enableDeduplication = true,
      enableRateLimit = RATE_LIMIT.ENABLED,
      signal,
    } = options;
    
    const requestKey = enableDeduplication ? this.getRequestKey(config) : null;
    
    // Check for pending duplicate request
    if (enableDeduplication && requestKey && this.pendingRequests.has(requestKey)) {
      // Silently return pending request without logging to reduce console spam
      return this.pendingRequests.get(requestKey);
    }
    
    // Check rate limit
    if (enableRateLimit && config.url) {
      const rateLimitCheck = rateLimiter.canMakeRequest(config.url);
      if (!rateLimitCheck.allowed) {
        const delay = rateLimiter.getDelay(config.url);
        const error = normalizeError({
          message: `Terlalu banyak permintaan. Silakan tunggu ${Math.ceil(delay / 1000)} detik.`,
          status: 429,
        });
        error.type = 'rate_limit';
        error.retryAfter = delay;
        throw error;
      }
    }
    
    // Record request for rate limiting
    if (enableRateLimit && config.url) {
      rateLimiter.recordRequest(config.url);
    }
    
    // Create request promise
    const requestPromise = this.executeWithRetry(config, retries, retryDelay, signal);
    
    // Store pending request for deduplication
    if (enableDeduplication && requestKey) {
      this.pendingRequests.set(requestKey, requestPromise);
      
      // Clean up after request completes
      requestPromise
        .finally(() => {
          this.pendingRequests.delete(requestKey);
        });
    }
    
    return requestPromise;
  }
  
  /**
   * Execute request with retry logic
   */
  async executeWithRetry(config, maxRetries, baseDelay, signal) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Check if request was cancelled
      if (signal?.aborted) {
        throw new Error('Request cancelled');
      }
      
      try {
        const response = await this.axiosInstance.request({
          ...config,
          signal,
        });
        
        // Validate response structure
        try {
          return this.validateResponse(response);
        } catch (validationError) {
          // eslint-disable-next-line no-undef
          if (process.env.NODE_ENV === 'development') {
            console.error('[API] Validation error:', {
              url: config.url,
              response: response?.data,
              error: validationError.message,
            });
          }
          // Wrap validation error
          const wrappedError = normalizeError({
            message: validationError.message || 'Invalid API response format',
            status: response?.status || 200,
            data: response?.data,
          });
          throw wrappedError;
        }
      } catch (error) {
        lastError = error;
        
        // Don't retry on last attempt or if error is not retryable
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.getRetryDelay(attempt, baseDelay);
        
        // eslint-disable-next-line no-undef
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        }
        
        // Wait before retry
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
  
  /**
   * Validate and normalize response
   */
  validateResponse(response) {
    if (!response) {
      throw new Error('Invalid response: response is null or undefined');
    }
    
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] validateResponse - Input:', {
        hasResponse: !!response,
        hasData: !!response.data,
        dataType: typeof response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        status: response.data?.status,
      });
    }
    
    // Handle case where response.data might not exist
    if (!response.data) {
      // If response itself is the data (direct data format)
      if (typeof response === 'object' && !response.status && !response.headers) {
        // eslint-disable-next-line no-undef
        if (process.env.NODE_ENV === 'development') {
          console.log('[API] validateResponse - Direct data format');
        }
        return {
          ...response,
          data: response,
        };
      }
      throw new Error('Invalid response structure: missing data field');
    }
    
    // Normalize response data
    const { data } = response;
    
    // If response has status field, validate it
    if (data.status !== undefined) {
      if (data.status === 'success') {
        // Extract data.data if exists, otherwise use data itself but remove status field
        let extractedData;
        
        if (data.data !== undefined) {
          // Normal case: { status: 'success', data: {...} }
          extractedData = data.data;
          // eslint-disable-next-line no-undef
          if (process.env.NODE_ENV === 'development') {
            console.log('[API] validateResponse - Extracted data.data:', {
              hasData: !!extractedData,
              dataType: typeof extractedData,
              isArray: Array.isArray(extractedData),
              length: Array.isArray(extractedData) ? extractedData.length : (extractedData ? Object.keys(extractedData).length : 0),
              dataKeys: Array.isArray(extractedData) ? `Array(${extractedData.length})` : (extractedData ? Object.keys(extractedData) : []),
              firstItem: Array.isArray(extractedData) && extractedData.length > 0 ? extractedData[0] : null,
            });
          }
        } else {
          // Edge case: { status: 'success', ...otherFields }
          // Remove status field and use the rest
          const { status, ...dataWithoutStatus } = data;
          extractedData = dataWithoutStatus;
          // eslint-disable-next-line no-undef
          if (process.env.NODE_ENV === 'development') {
            console.log('[API] validateResponse - Removed status field, using rest:', {
              hasData: !!extractedData,
              dataType: typeof extractedData,
              dataKeys: extractedData ? Object.keys(extractedData) : [],
            });
          }
        }
        
        // Return response with extracted data
        const normalizedResponse = {
          ...response,
          data: extractedData,
        };
        
        // eslint-disable-next-line no-undef
        if (process.env.NODE_ENV === 'development') {
          console.log('[API] validateResponse - Output:', {
            hasData: !!normalizedResponse.data,
            dataType: typeof normalizedResponse.data,
            isArray: Array.isArray(normalizedResponse.data),
            length: Array.isArray(normalizedResponse.data) ? normalizedResponse.data.length : (normalizedResponse.data ? Object.keys(normalizedResponse.data).length : 0),
            dataKeys: Array.isArray(normalizedResponse.data) ? `Array(${normalizedResponse.data.length})` : (normalizedResponse.data ? Object.keys(normalizedResponse.data) : []),
            firstItem: Array.isArray(normalizedResponse.data) && normalizedResponse.data.length > 0 ? normalizedResponse.data[0] : null,
          });
        }
        
        return normalizedResponse;
      } else {
        // Status is not 'success', throw error with message
        const errorMessage = data.message || data.error || 'API request failed';
        // eslint-disable-next-line no-undef
        if (process.env.NODE_ENV === 'development') {
          console.error('[API] validateResponse - Error status:', {
            status: data.status,
            message: errorMessage,
            data: data,
          });
        }
        const error = new Error(errorMessage);
        error.response = response;
        error.status = data.status;
        throw error;
      }
    }
    
    // No status field - assume it's direct data format
    // This handles cases where API returns data directly without status wrapper
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] validateResponse - No status field, returning as-is');
    }
    return response;
  }
  
  /**
   * Convenience methods
   */
  get(url, config = {}, options = {}) {
    return this.request({ ...config, method: 'get', url }, options);
  }
  
  post(url, data, config = {}, options = {}) {
    return this.request({ ...config, method: 'post', url, data }, options);
  }
  
  put(url, data, config = {}, options = {}) {
    return this.request({ ...config, method: 'put', url, data }, options);
  }
  
  delete(url, config = {}, options = {}) {
    return this.request({ ...config, method: 'delete', url }, options);
  }
}

export default APIWrapper;

