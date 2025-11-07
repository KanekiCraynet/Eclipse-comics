import axios from 'axios';

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
      (response) => response,
      (error) => {
        // Transform error for consistent handling
        const transformedError = this.transformError(error);
        console.error('[API] Response error:', transformedError);
        return Promise.reject(transformedError);
      }
    );
  }
  
  transformError(error) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      let message = error.response.data?.message;
      
      // Provide user-friendly error messages based on status code
      if (!message) {
        switch (status) {
          case 400:
            message = 'Permintaan tidak valid. Silakan coba lagi.';
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
      
      return {
        message,
        status,
        data: error.response.data,
        isNetworkError: false,
        originalError: error,
      };
    } else if (error.request) {
      // Request made but no response (network error)
      return {
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        status: null,
        data: null,
        isNetworkError: true,
        originalError: error,
      };
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      // Request timeout
      return {
        message: 'Waktu permintaan habis. Silakan coba lagi.',
        status: null,
        data: null,
        isNetworkError: true,
        originalError: error,
      };
    } else {
      // Error setting up request
      return {
        message: error.message || 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.',
        status: null,
        data: null,
        isNetworkError: false,
        originalError: error,
      };
    }
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
    if (!error.isNetworkError && error.status) {
      // Retry on 5xx errors and 429 (rate limit)
      return error.status >= 500 || error.status === 429;
    }
    // Retry on network errors
    return error.isNetworkError;
  }
  
  /**
   * Execute request with retry logic and deduplication
   */
  async request(config, options = {}) {
    const {
      retries = this.defaultConfig.retries,
      retryDelay = this.defaultConfig.retryDelay,
      enableDeduplication = true,
      signal,
    } = options;
    
    const requestKey = enableDeduplication ? this.getRequestKey(config) : null;
    
    // Check for pending duplicate request
    if (enableDeduplication && requestKey && this.pendingRequests.has(requestKey)) {
      // Silently return pending request without logging to reduce console spam
      return this.pendingRequests.get(requestKey);
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
        return this.validateResponse(response);
      } catch (error) {
        lastError = error;
        
        // Don't retry on last attempt or if error is not retryable
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.getRetryDelay(attempt, baseDelay);
        
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
    if (!response || !response.data) {
      throw new Error('Invalid response structure');
    }
    
    // Normalize response data
    const { data } = response;
    
    // If response has status field, validate it
    if (data.status !== undefined) {
      if (data.status === 'success') {
        return {
          ...response,
          data: data.data !== undefined ? data.data : data,
        };
      } else {
        throw new Error(data.message || 'API request failed');
      }
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

