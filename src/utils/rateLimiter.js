/**
 * Client-side rate limiter to prevent excessive API requests
 * Implements token bucket algorithm for rate limiting
 */

class RateLimiter {
  constructor(options = {}) {
    this.limits = options.limits || {
      default: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
      '/terbaru': { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
      '/popular': { maxRequests: 3, windowMs: 60000 }, // 3 requests per minute
      '/recommended': { maxRequests: 3, windowMs: 60000 }, // 3 requests per minute
      '/search': { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
      '/detail': { maxRequests: 20, windowMs: 60000 }, // 20 requests per minute
      '/read': { maxRequests: 15, windowMs: 60000 }, // 15 requests per minute
    };
    
    // Store request timestamps per endpoint
    this.requestHistory = new Map();
    
    // Queue for requests that are rate limited
    this.requestQueue = new Map();
  }

  /**
   * Get rate limit config for endpoint
   */
  getLimitConfig(endpoint) {
    // Match endpoint to limit config
    for (const [pattern, config] of Object.entries(this.limits)) {
      if (pattern === 'default') continue;
      if (endpoint.includes(pattern)) {
        return config;
      }
    }
    return this.limits.default;
  }

  /**
   * Check if request can be made
   * @param {string} endpoint - API endpoint
   * @returns {object} - { allowed: boolean, remaining: number, resetAt: number }
   */
  canMakeRequest(endpoint) {
    const config = this.getLimitConfig(endpoint);
    const now = Date.now();
    
    // Initialize history for endpoint if not exists
    if (!this.requestHistory.has(endpoint)) {
      this.requestHistory.set(endpoint, []);
    }
    
    const history = this.requestHistory.get(endpoint);
    
    // Remove old requests outside the window
    const windowStart = now - config.windowMs;
    const recentRequests = history.filter(timestamp => timestamp > windowStart);
    this.requestHistory.set(endpoint, recentRequests);
    
    // Check if limit exceeded
    const remaining = config.maxRequests - recentRequests.length;
    const allowed = remaining > 0;
    const resetAt = allowed ? null : recentRequests[0] + config.windowMs;
    
    return {
      allowed,
      remaining: Math.max(0, remaining),
      resetAt,
      limit: config.maxRequests,
      windowMs: config.windowMs,
    };
  }

  /**
   * Record a request
   * @param {string} endpoint - API endpoint
   */
  recordRequest(endpoint) {
    if (!this.requestHistory.has(endpoint)) {
      this.requestHistory.set(endpoint, []);
    }
    
    const history = this.requestHistory.get(endpoint);
    history.push(Date.now());
    this.requestHistory.set(endpoint, history);
  }

  /**
   * Calculate delay until next request can be made
   * @param {string} endpoint - API endpoint
   * @returns {number} - Delay in milliseconds
   */
  getDelay(endpoint) {
    const result = this.canMakeRequest(endpoint);
    if (result.allowed) {
      return 0;
    }
    
    if (result.resetAt) {
      const delay = result.resetAt - Date.now();
      return Math.max(0, delay);
    }
    
    return 0;
  }

  /**
   * Clear history for endpoint
   * @param {string} endpoint - API endpoint (optional, clears all if not provided)
   */
  clearHistory(endpoint = null) {
    if (endpoint) {
      this.requestHistory.delete(endpoint);
    } else {
      this.requestHistory.clear();
    }
  }

  /**
   * Get rate limit stats
   * @param {string} endpoint - API endpoint (optional)
   * @returns {object} - Rate limit statistics
   */
  getStats(endpoint = null) {
    if (endpoint) {
      const result = this.canMakeRequest(endpoint);
      const config = this.getLimitConfig(endpoint);
      return {
        endpoint,
        ...result,
        config,
      };
    }
    
    // Return stats for all endpoints
    const stats = {};
    for (const [pattern] of Object.entries(this.limits)) {
      if (pattern !== 'default') {
        const endpoints = Array.from(this.requestHistory.keys()).filter(e => e.includes(pattern));
        endpoints.forEach(e => {
          stats[e] = this.canMakeRequest(e);
        });
      }
    }
    
    return stats;
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter({
  limits: {
    default: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
    '/terbaru': { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
    '/popular': { maxRequests: 3, windowMs: 60000 }, // 3 requests per minute
    '/recommended': { maxRequests: 3, windowMs: 60000 }, // 3 requests per minute
    '/search': { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
    '/detail': { maxRequests: 20, windowMs: 60000 }, // 20 requests per minute
    '/read': { maxRequests: 15, windowMs: 60000 }, // 15 requests per minute
  },
});

export default rateLimiter;
export { RateLimiter };

