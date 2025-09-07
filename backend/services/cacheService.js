import redis from '../config/redis.js';
import logger from '../utils/logger.js';

class CacheService {
  constructor() {
    this.redis = redis;
    this.defaultTTL = 300; // 5 minutes default TTL
  }

  /**
   * Set a key-value pair in Redis with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache (will be JSON stringified)
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serializedValue = JSON.stringify(value);
      await this.redis.setex(key, ttl, serializedValue);
      logger.cache('SET', key, true, { ttl, size: serializedValue.length });
      return true;
    } catch (error) {
      logger.error('Cache set error', error, { key, ttl });
      return false;
    }
  }

  /**
   * Get a value from Redis by key
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached value or null
   */
  async get(key) {
    try {
      const value = await this.redis.get(key);
      const hit = value !== null;
      logger.cache('GET', key, hit, { size: value ? value.length : 0 });
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error', error, { key });
      return null;
    }
  }

  /**
   * Delete a key from Redis
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error', error, { key });
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param {string} pattern - Pattern to match keys
   * @returns {Promise<number>} - Number of keys deleted
   */
  async delPattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;
      return await this.redis.del(...keys);
    } catch (error) {
      logger.error('Cache delete pattern error', error, { pattern });
      return 0;
    }
  }

  /**
   * Check if a key exists in Redis
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Existence status
   */
  async exists(key) {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', error, { key });
      return false;
    }
  }

  /**
   * Get TTL (time to live) for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} - TTL in seconds (-1 if no TTL, -2 if key doesn't exist)
   */
  async ttl(key) {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error('Cache TTL error', error, { key });
      return -2;
    }
  }

  /**
   * Increment a numeric value in Redis
   * @param {string} key - Cache key
   * @param {number} increment - Amount to increment by (default: 1)
   * @returns {Promise<number>} - New value after increment
   */
  async incr(key, increment = 1) {
    try {
      return await this.redis.incrby(key, increment);
    } catch (error) {
      logger.error('Cache increment error', error, { key, increment });
      return 0;
    }
  }

  /**
   * Set expiration for a key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async expire(key, ttl) {
    try {
      const result = await this.redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error', error, { key, ttl });
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<object>} - Cache statistics
   */
  async getStats() {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      return {
        memory: info,
        keyspace: keyspace,
        connected: this.redis.status === 'ready'
      };
    } catch (error) {
      logger.error('Cache stats error', error);
      return {
        memory: null,
        keyspace: null,
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Clear all cache data (use with caution!)
   * @returns {Promise<boolean>} - Success status
   */
  async flushAll() {
    try {
      await this.redis.flushall();
      return true;
    } catch (error) {
      logger.error('Cache flush all error', error);
      return false;
    }
  }

  /**
   * Cache middleware for Express routes
   * @param {number} ttl - Time to live in seconds
   * @param {string} keyGenerator - Function to generate cache key from request
   * @returns {Function} - Express middleware function
   */
  cacheMiddleware(ttl = this.defaultTTL, keyGenerator = null) {
    return async (req, res, next) => {
      try {
        // Generate cache key
        const cacheKey = keyGenerator ? keyGenerator(req) : `cache:${req.method}:${req.originalUrl}`;
        
        // Try to get from cache
        const cachedData = await this.get(cacheKey);
        if (cachedData) {
          logger.cache('MIDDLEWARE_HIT', cacheKey, true);
          return res.json(cachedData);
        }

        // Store original res.json
        const originalJson = res.json.bind(res);
        
        // Override res.json to cache the response
        res.json = (data) => {
          // Cache the response
          this.set(cacheKey, data, ttl);
          logger.cache('MIDDLEWARE_SET', cacheKey, true, { ttl });
          
          // Call original res.json
          return originalJson(data);
        };

        next();
      } catch (error) {
        logger.error('Cache middleware error', error);
        next(); // Continue without caching on error
      }
    };
  }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;
export { CacheService };
