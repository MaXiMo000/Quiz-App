import cacheService from '../services/cacheService.js';
import logger from '../utils/logger.js';

/**
 * Middleware factory to create a cache middleware for GET requests.
 * @param {number} duration - Cache duration in seconds.
 * @returns {function} Express middleware.
 */
const cache = (duration) => async (req, res, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    logger.warn(`Cache middleware skipped for non-GET request: ${req.method} ${req.originalUrl}`);
    return next();
  }

  // Use a unique key for each request, including query params
  const key = `__express__${req.originalUrl || req.url}`;

  try {
    const cachedResponse = await cacheService.get(key);
    if (cachedResponse) {
      logger.info(`✅ Cache hit for ${key}. Serving from cache.`);
      // Set a custom header to indicate a cached response
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', 'application/json');
      return res.send(cachedResponse);
    }

    logger.info(`❌ Cache miss for ${key}. Processing request...`);
    res.setHeader('X-Cache', 'MISS');

    // Monkey patch res.send to cache the response before sending it
    const originalSend = res.send;
    res.send = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.set(key, body, duration);
        logger.info(`📝 Caching response for ${key}`);
      } else {
        logger.warn(`🚫 Not caching unsuccessful response for ${key} (Status: ${res.statusCode})`);
      }
      // Restore original send function and send the response
      res.send = originalSend;
      return res.send(body);
    };

    next();
  } catch (error) {
    logger.error(`Cache middleware error for key ${key}:`, error);
    // If cache fails, proceed without caching
    next();
  }
};

export default cache;
