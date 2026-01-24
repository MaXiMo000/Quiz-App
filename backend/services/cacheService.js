import { redisClient } from "../config/redis.js";
import logger from "../utils/logger.js";

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Parsed JSON value or null if not found
 */
const get = async (key) => {
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        logger.error({ message: "Error getting cache", key, error: error.message });
        return null;
    }
};

/**
 * Set a value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified)
 * @param {number} expiration - Expiration time in seconds (default: 3600)
 * @returns {Promise<string>} - Redis SET result
 */
const set = async (key, value, expiration = 3600) => {
    try {
        return await redisClient.set(key, JSON.stringify(value), { EX: expiration });
    } catch (error) {
        logger.error({ message: "Error setting cache", key, error: error.message });
        throw error;
    }
};

/**
 * Delete a single key from cache
 * @param {string} key - Cache key to delete
 * @returns {Promise<number>} - Number of keys deleted
 */
const del = async (key) => {
    try {
        return await redisClient.del(key);
    } catch (error) {
        logger.error({ message: "Error deleting cache key", key, error: error.message });
        throw error;
    }
};

/**
 * Clear cache for a specific key (alias for del)
 * @param {string} key - Cache key to clear
 * @returns {Promise<number>} - Number of keys deleted
 */
const clearCache = async (key) => {
    return del(key);
};

/**
 * Flush all cache (clear entire database)
 * @returns {Promise<string>} - Redis FLUSHDB result
 */
const flushAll = async () => {
    try {
        return await redisClient.flushDb();
    } catch (error) {
        logger.error({ message: "Error flushing cache", error: error.message });
        throw error;
    }
};

/**
 * Delete all keys matching a pattern using SCAN
 * @param {string} pattern - Redis key pattern (e.g., "user:*" or "/api/quizzes*")
 * @returns {Promise<number>} - Total number of keys deleted
 */
const delByPattern = async (pattern) => {
    if (!pattern || typeof pattern !== "string") {
        logger.warn(`delByPattern called with invalid pattern: ${pattern}`);
        return 0;
    }

    try {
        // Start with cursor 0 (beginning of database)
        let cursor = 0;
        let totalDeleted = 0;
        const maxIterations = 1000; // Safety limit to prevent infinite loops
        let iterations = 0;

        do {
            // SCAN command - node-redis v5 returns { cursor, keys }
            const scanResult = await redisClient.scan(cursor, {
                MATCH: pattern,
                COUNT: 100, // Scan 100 keys at a time
            });

            // Extract cursor and keys from result
            let nextCursor, keys;

            // Handle different return formats (v4 vs v5 compatibility)
            if (Array.isArray(scanResult)) {
                // node-redis v4 format: [cursor, keys]
                [nextCursor, keys] = scanResult;
            } else if (scanResult && typeof scanResult === "object") {
                // node-redis v5 format: { cursor, keys }
                nextCursor = scanResult.cursor;
                keys = scanResult.keys || scanResult[1] || [];
            } else {
                logger.error(`Unexpected scan result format: ${typeof scanResult}`, { scanResult });
                break;
            }

            // Normalize cursor - Redis returns "0" (string) when done, or a number
            // Convert to number for comparison, but handle string "0" correctly
            const cursorValue = typeof nextCursor === "string" ? parseInt(nextCursor, 10) : nextCursor;

            // Delete keys if any found
            if (keys && Array.isArray(keys) && keys.length > 0) {
                // Delete all keys in batch
                // redisClient.del() accepts array of keys in redis v5
                const deleted = await redisClient.del(keys);
                totalDeleted += deleted || 0;

                logger.debug(`Deleted ${deleted} keys matching pattern "${pattern}" (iteration ${iterations + 1}, total: ${totalDeleted})`);
            }

            // Update cursor for next iteration
            cursor = cursorValue;
            iterations++;

            // Safety check to prevent infinite loops
            if (iterations >= maxIterations) {
                logger.warn(`delByPattern reached max iterations (${maxIterations}) for pattern: ${pattern}. Stopping to prevent infinite loop.`);
                break;
            }

            // Continue scanning if cursor is not 0 (0 means scan is complete)
            // Also handle string "0" case
        } while (cursor !== 0 && cursor !== "0");

        if (totalDeleted > 0) {
            logger.info(`Successfully deleted ${totalDeleted} cache keys matching pattern: ${pattern}`);
        } else {
            logger.debug(`No cache keys found matching pattern: ${pattern}`);
        }

        return totalDeleted;
    } catch (error) {
        logger.error({
            message: "Error deleting cache by pattern",
            pattern,
            error: error.message,
            stack: error.stack,
        });
        // Don't throw - allow the request to continue even if cache clearing fails
        // This prevents cache clearing failures from breaking the application
        return 0;
    }
};

export default {
    get,
    set,
    del,
    clearCache,
    flushAll,
    delByPattern,
};
