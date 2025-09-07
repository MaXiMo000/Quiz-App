import cacheService from '../services/cacheService.js';
import logger from '../utils/logger.js';

/**
 * Cache middleware for API responses
 * @param {number} ttl - Time to live in seconds (default: 5 minutes)
 * @param {Function} keyGenerator - Custom key generator function
 * @returns {Function} - Express middleware
 */
export const cache = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    try {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Skip caching for authenticated routes that need fresh data
      if (req.path.includes('/user/') && req.user) {
        return next();
      }

      // Generate cache key
      let cacheKey;
      if (keyGenerator) {
        cacheKey = keyGenerator(req);
      } else {
        // Default key generation
        const baseKey = `api:${req.method}:${req.path}`;
        const queryString = req.query ? JSON.stringify(req.query) : '';
        const userKey = req.user ? `:user:${req.user.id}` : '';
        cacheKey = `${baseKey}${queryString}${userKey}`;
      }

      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        logger.cache('MIDDLEWARE_HIT', cacheKey, true);
        return res.json({
          ...cachedData,
          _cached: true,
          _cacheKey: cacheKey
        });
      }

      // Store original res.json
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache the response
      res.json = (data) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, ttl);
          logger.cache('MIDDLEWARE_SET', cacheKey, true, { ttl });
        }
        
        // Call original res.json
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next(); // Continue without caching on error
    }
  };
};

/**
 * Cache invalidation middleware
 * @param {string|Array} patterns - Cache key patterns to invalidate
 * @returns {Function} - Express middleware
 */
export const invalidateCache = (patterns) => {
  return async (req, res, next) => {
    try {
      // Store original res.json
      const originalJson = res.json.bind(res);
      
      // Override res.json to invalidate cache after successful response
      res.json = async (data) => {
        // Only invalidate on successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
          
          for (const pattern of patternsArray) {
            const deletedCount = await cacheService.delPattern(pattern);
            if (deletedCount > 0) {
              console.log(`🗑️ Invalidated ${deletedCount} cache entries matching: ${pattern}`);
            }
          }
        }
        
        // Call original res.json
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache invalidation error:', error);
      next(); // Continue without invalidation on error
    }
  };
};

/**
 * Cache warming middleware - pre-populate cache with data
 * @param {Function} dataFetcher - Function to fetch data for caching
 * @param {string} cacheKey - Cache key to store data
 * @param {number} ttl - Time to live in seconds
 * @returns {Function} - Express middleware
 */
export const warmCache = (dataFetcher, cacheKey, ttl = 300) => {
  return async (req, res, next) => {
    try {
      // Check if cache already has data
      const existingData = await cacheService.get(cacheKey);
      if (existingData) {
        return next();
      }

      // Fetch and cache data
      const data = await dataFetcher(req);
      if (data) {
        await cacheService.set(cacheKey, data, ttl);
        console.log(`🔥 Cache warmed: ${cacheKey}`);
      }

      next();
    } catch (error) {
      console.error('Cache warming error:', error);
      next(); // Continue without warming on error
    }
  };
};

export default { cache, invalidateCache, warmCache };
