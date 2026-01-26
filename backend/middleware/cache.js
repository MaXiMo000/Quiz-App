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
  '/challenges/',       // Challenge-specific routes (history, etc.)
  '/challenges/completed', // User-specific completed challenges
  '/tournaments',       // User-specific tournaments (filtered by participation)
  '/tournaments/history', // User-specific tournament history
  '/tournaments/completed', // User-specific completed tournaments
  '/study-groups',      // User-specific study groups (user's groups)
  '/study-groups/',     // Specific study group (user-specific based on membership)
  '/friends',           // User-specific friends list
  '/friends/requests',  // User-specific friend requests
  '/learning-paths',    // User-specific learning paths (progress tracking)
  '/learning-paths/',   // Specific learning path (user-specific progress)
  '/competencies/user', // User-specific competencies
  '/users/bookmarks',   // User-specific bookmarks
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
        // Only log warnings in development or debug mode
        if (process.env.LOG_LEVEL === "debug" || process.env.NODE_ENV !== "production") {
          logger.warn(`Found old cache entry without user ID: ${oldKey} - clearing it`);
        }
        await cacheService.del(oldKey);
        // Also clear all old cache entries for this pattern
        await cacheService.delByPattern(`${req.originalUrl}*`);
      }

      key = `${req.originalUrl}:user:${req.user.id}`;
      isUserSpecific = true;
    }

    const cachedData = await cacheService.get(key);

    // Always set fresh ETag and cache headers to prevent 304 responses
    // Use timestamp + random to ensure ETag changes even for cached data
    const etagValue = `"${Date.now()}-${Math.random().toString(36).substring(7)}"`;
    res.set({
      'Cache-Control': 'private, no-cache, must-revalidate',
      'ETag': etagValue,
      'Last-Modified': new Date().toUTCString(),
      'Pragma': 'no-cache'
    });

    if (cachedData) {
      // Return cached data but with fresh headers to prevent browser caching
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
            // Set cache-control headers to prevent caching of responses after data modification
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });

            // Check if this pattern matches user-specific endpoints
            const isUserSpecific = USER_SPECIFIC_ENDPOINTS.some(endpoint => {
                const cleanEndpoint = endpoint.replace(/\/$/, '');
                return pattern.includes(cleanEndpoint) || pattern.endsWith(cleanEndpoint);
            });

            if (isUserSpecific) {
                // For user-specific endpoints, clear cache for:
                // 1. Base pattern without user suffix (for backward compatibility with old cache keys)
                const result1 = await cacheService.delByPattern(`${pattern}*`);

                // 2. Current user's cache (immediate invalidation)
                let result2 = 0;
                if (req.user && req.user.id) {
                    const userPattern = `${pattern}*:user:${req.user.id}*`;
                    result2 = await cacheService.delByPattern(userPattern);
                }

                // 3. All users' cache (in case admin makes changes affecting all users)
                // Pattern: /api/quizzes*:user:*
                const allUsersPattern = `${pattern}*:user:*`;
                const result3 = await cacheService.delByPattern(allUsersPattern);

                // Log summary in debug mode
                if (process.env.LOG_LEVEL === "debug" || process.env.NODE_ENV !== "production") {
                    const totalDeleted = result1 + result2 + result3;
                    if (totalDeleted > 0) {
                        logger.debug(`Cleared ${totalDeleted} cache entries for pattern: ${pattern}`);
                    }
                }
            } else {
                // For global endpoints, just clear the base pattern
                const result = await cacheService.delByPattern(`${pattern}*`);
                if (process.env.LOG_LEVEL === "debug" || process.env.NODE_ENV !== "production") {
                    if (result > 0) {
                        logger.debug(`Cleared ${result} cache entries for pattern: ${pattern}`);
                    }
                }
            }
        } catch (error) {
            // Only log detailed errors in development or for critical errors
            const isCriticalError = error.code === "ECONNREFUSED" ||
                                    error.code === "ETIMEDOUT" ||
                                    error.message.includes("timeout");

            if (isCriticalError || process.env.NODE_ENV !== "production") {
                logger.error({
                    message: "Error clearing cache",
                    pattern,
                    error: error.message,
                    code: error.code,
                    stack: process.env.NODE_ENV !== "production" ? error.stack : undefined
                });
            } else {
                // In production, only log warnings for non-critical cache errors
                logger.debug({
                    message: "Cache clearing failed (non-critical)",
                    pattern,
                    error: error.message
                });
            }
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
