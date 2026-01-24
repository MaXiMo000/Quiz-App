import cacheService from "../services/cacheService.js";
import logger from "../utils/logger.js";

/**
 * List of endpoint patterns that require user-specific caching
 * These endpoints return different data based on the authenticated user
 */
const USER_SPECIFIC_ENDPOINTS = [
  '/quizzes',           // Premium users see only their quizzes + admin quizzes
  '/quizzes/',          // Specific quiz (needs authorization check, so user-specific cache)
  '/reports',           // Users see only their own reports
  '/reports/user',      // User-specific reports
  '/reports/',          // Specific report (should be user-specific for security)
  '/written-test-reports', // User-specific written test reports
  '/written-test-reports/user', // User-specific written test reports
  '/written-test-reports/', // Specific written test report
  '/reviews',           // User-specific review schedule
  '/recommendations',   // User-specific quiz recommendations
  '/adaptive-difficulty', // User-specific adaptive difficulty
  '/analytics',         // User-specific learning analytics
  '/question-stats',    // User-specific question statistics
  '/score-trends',      // User-specific score trends
  '/topic-heatmap',     // User-specific topic heatmap
  '/challenges/daily',  // User-specific daily challenge
  '/challenges/status', // User-specific challenge status
  '/challenges/history', // User-specific challenge history
  '/tournaments',       // User-specific tournaments (filtered by participation)
  '/tournaments/history', // User-specific tournament history
];

/**
 * List of endpoint patterns that are GLOBAL (same for all users)
 * These endpoints don't need user-specific caching
 */
const GLOBAL_ENDPOINTS = [
  '/leaderboard/weekly',
  '/leaderboard/monthly',
  '/reports/top-scorers',
  '/categories',
];

/**
 * Check if an endpoint requires user-specific caching
 */
const isUserSpecificEndpoint = (url) => {
  // Remove query parameters for matching
  const urlPath = url.split('?')[0];
  
  // Normalize: Remove /api prefix if present for pattern matching
  // Routes are mounted at /api, so /api/quizzes becomes /quizzes for matching
  const normalizedPath = urlPath.startsWith('/api/') ? urlPath.slice(4) : urlPath;
  
  // Check global endpoints first (these should NOT be user-specific)
  // Use exact path matching to avoid false positives
  if (GLOBAL_ENDPOINTS.some(pattern => {
    // Check both original path and normalized path
    const normalizedPattern = pattern.startsWith('/api/') ? pattern.slice(4) : pattern;
    return normalizedPath === normalizedPattern || 
           normalizedPath.startsWith(normalizedPattern + '/') || 
           normalizedPath === normalizedPattern ||
           urlPath === pattern ||
           urlPath.startsWith(pattern + '/');
  })) {
    return false;
  }
  
  // Check if it matches any user-specific pattern
  return USER_SPECIFIC_ENDPOINTS.some(pattern => {
    // Handle patterns ending with / (for path parameters)
    if (pattern.endsWith('/')) {
      // Match: /api/quizzes/123 should match /quizzes/
      // But NOT match: /api/quizzes-top-scorers
      const basePattern = pattern.slice(0, -1); // Remove trailing /
      // Check normalized path (without /api)
      return normalizedPath.startsWith(basePattern + '/') || 
             normalizedPath === basePattern ||
             urlPath.includes(basePattern + '/');
    }
    
    // Handle exact patterns (like /quizzes, /reports)
    // Match if normalized URL equals pattern or starts with pattern + /
    if (normalizedPath === pattern || 
        normalizedPath.startsWith(pattern + '/') || 
        normalizedPath.startsWith(pattern + '?') ||
        urlPath.includes(pattern + '/') ||
        urlPath.endsWith(pattern)) {
      return true;
    }
    
    return false;
  });
};

const cache = async (req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }

  try {
    // Build cache key
    let key = req.originalUrl;
    let isUserSpecific = false;
    
    // For user-specific endpoints, include user ID in cache key
    // This ensures each user gets their own cached results
    if (req.user && req.user.id && isUserSpecificEndpoint(req.originalUrl)) {
      // IMPORTANT: First, check and clear old cache entries without user ID
      // This prevents stale data from being served to wrong users
      const oldKey = req.originalUrl;
      const oldCachedData = await cacheService.get(oldKey);
      if (oldCachedData) {
        logger.warn(`Found old cache entry without user ID: ${oldKey} - clearing it`);
        await cacheService.del(oldKey);
        // Also clear all old cache entries for this pattern
        await cacheService.delByPattern(`${req.originalUrl}*`);
      }
      
      key = `${req.originalUrl}:user:${req.user.id}`;
      isUserSpecific = true;
    }

    const cachedData = await cacheService.get(key);

    if (cachedData) {
      return res.json(cachedData);
    }

    const originalJson = res.json;
    res.json = (body) => {
      cacheService.set(key, body);
      originalJson.call(res, body);
    };

    next();
  } catch (error) {
    logger.error({ message: "Cache middleware error", error: error.message, stack: error.stack });
    // Don't fail the request if caching fails
    next();
  }
};

export const clearCacheByPattern = (pattern) => {
    return async (req, res, next) => {
        try {
            // Check if this pattern matches user-specific endpoints
            const isUserSpecific = USER_SPECIFIC_ENDPOINTS.some(endpoint => {
                const cleanEndpoint = endpoint.replace(/\/$/, '');
                return pattern.includes(cleanEndpoint) || pattern.endsWith(cleanEndpoint);
            });
            
            if (isUserSpecific) {
                // For user-specific endpoints, clear cache for:
                // 1. Base pattern without user suffix (for backward compatibility with old cache keys)
                await cacheService.delByPattern(`${pattern}*`);
                
                // 2. Current user's cache (immediate invalidation)
                if (req.user && req.user.id) {
                    const userPattern = `${pattern}*:user:${req.user.id}*`;
                    await cacheService.delByPattern(userPattern);
                }
                
                // 3. All users' cache (in case admin makes changes affecting all users)
                // Pattern: /api/quizzes*:user:*
                const allUsersPattern = `${pattern}*:user:*`;
                await cacheService.delByPattern(allUsersPattern);
            } else {
                // For global endpoints, just clear the base pattern
                await cacheService.delByPattern(`${pattern}*`);
            }
        } catch (error) {
            logger.error({ message: "Error clearing cache", pattern, error: error.message, stack: error.stack });
            // Don't fail the request if cache clearing fails
        }
        next();
    };
};

export const clearAllCacheMiddleware = async (req, res, next) => {
    await cacheService.flushAll();
    next();
};

export const clearCacheByKeyMiddleware = (key) => {
    return (req, res, next) => {
        cacheService.clearCache(key);
        next();
    };
};

/**
 * Debug utility: Get cache key for a given request
 * Useful for debugging cache issues
 */
export const getCacheKey = (req) => {
    if (!req.user || !req.user.id) {
        return req.originalUrl;
    }
    
    if (isUserSpecificEndpoint(req.originalUrl)) {
        return `${req.originalUrl}:user:${req.user.id}`;
    }
    
    return req.originalUrl;
};

export default cache;
