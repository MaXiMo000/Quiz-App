import { redisClient, isRedisConnected } from "../config/redis.js";
import logger from "../utils/logger.js";

// Helper function to add timeout to Redis operations
const withTimeout = async (promise, timeoutMs = 5000, operation = "operation") => {
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs)
            )
        ]);
    } catch (error) {
        if (error.message.includes("timeout")) {
            logger.warn({ message: `Redis ${operation} timed out`, timeout: timeoutMs });
        }
        throw error;
    }
};

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Parsed JSON value or null if not found
 */
const get = async (key) => {
    if (!isRedisConnected()) {
        // Only log in debug mode or development
        if (process.env.LOG_LEVEL === "debug" || process.env.NODE_ENV !== "production") {
            logger.debug({ message: "Redis not connected, skipping cache get", key });
        }
        return null;
    }

    try {
        const data = await withTimeout(redisClient.get(key), 5000, "GET");
        return data ? JSON.parse(data) : null;
    } catch (error) {
        // Only log errors in production if critical (connection issues)
        const isCritical = error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT";
        if (isCritical || process.env.NODE_ENV !== "production") {
            logger.error({ message: "Error getting cache", key, error: error.message, code: error.code });
        }
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
    if (!isRedisConnected()) {
        // Only log in debug mode or development
        if (process.env.LOG_LEVEL === "debug" || process.env.NODE_ENV !== "production") {
            logger.debug({ message: "Redis not connected, skipping cache set", key });
        }
        return "OK"; // Return success to not break application flow
    }

    try {
        return await withTimeout(
            redisClient.set(key, JSON.stringify(value), { EX: expiration }),
            5000,
            "SET"
        );
    } catch (error) {
        // Only log errors in production if critical (connection issues)
        const isCritical = error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT";
        if (isCritical || process.env.NODE_ENV !== "production") {
            logger.error({ message: "Error setting cache", key, error: error.message, code: error.code });
        }
        // Don't throw - allow app to continue without cache
        return "OK";
    }
};

/**
 * Delete a single key from cache
 * @param {string} key - Cache key to delete
 * @returns {Promise<number>} - Number of keys deleted
 */
const del = async (key) => {
    if (!isRedisConnected()) {
        // Only log in debug mode or development
        if (process.env.LOG_LEVEL === "debug" || process.env.NODE_ENV !== "production") {
            logger.debug({ message: "Redis not connected, skipping cache delete", key });
        }
        return 0;
    }

    try {
        return await withTimeout(redisClient.del(key), 5000, "DEL");
    } catch (error) {
        // Only log errors in production if critical (connection issues)
        const isCritical = error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT";
        if (isCritical || process.env.NODE_ENV !== "production") {
            logger.error({ message: "Error deleting cache key", key, error: error.message, code: error.code });
        }
        return 0; // Return 0 to not break application flow
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
    if (!isRedisConnected()) {
        logger.debug({ message: "Redis not connected, skipping cache flush" });
        return "OK"; // Return success to not break application flow
    }

    try {
        return await withTimeout(redisClient.flushDb(), 10000, "FLUSHDB");
    } catch (error) {
        logger.error({ message: "Error flushing cache", error: error.message });
        // Don't throw - allow app to continue
        return "OK";
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
        // Start with cursor "0" (beginning of database) - Redis v5 requires string
        let cursor = "0";
        let totalDeleted = 0;
        const maxIterations = 1000; // Safety limit to prevent infinite loops
        let iterations = 0;

        if (!isRedisConnected()) {
            // Only log in debug mode or development
            if (process.env.LOG_LEVEL === "debug" || process.env.NODE_ENV !== "production") {
                logger.debug({ message: "Redis not connected, skipping cache pattern delete", pattern });
            }
            return 0;
        }

        do {
            // SCAN command - node-redis v5 requires cursor as string and returns { cursor, keys }
            // Ensure cursor is always a string for Redis v5 compatibility
            const scanResult = await withTimeout(
                redisClient.scan(String(cursor), {
                    MATCH: pattern,
                    COUNT: 100, // Scan 100 keys at a time
                }),
                5000,
                "SCAN"
            );

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

            // Normalize cursor - Redis returns "0" (string) when done
            // Keep as string for Redis v5 compatibility
            const cursorValue = String(nextCursor);

            // Delete keys if any found
            if (keys && Array.isArray(keys) && keys.length > 0) {
                // Delete all keys in batch with timeout
                // redisClient.del() accepts array of keys in redis v5
                const deleted = await withTimeout(
                    redisClient.del(keys),
                    5000,
                    "DEL (batch)"
                );
                totalDeleted += deleted || 0;

                // Only log in debug mode or development
                if (process.env.LOG_LEVEL === "debug" || process.env.NODE_ENV !== "production") {
                    logger.debug(`Deleted ${deleted} keys matching pattern "${pattern}" (iteration ${iterations + 1}, total: ${totalDeleted})`);
                }
            }

            // Update cursor for next iteration (keep as string)
            cursor = cursorValue;
            iterations++;

            // Safety check to prevent infinite loops
            if (iterations >= maxIterations) {
                logger.warn(`delByPattern reached max iterations (${maxIterations}) for pattern: ${pattern}. Stopping to prevent infinite loop.`);
                break;
            }

            // Continue scanning if cursor is not "0" ("0" means scan is complete)
        } while (cursor !== "0" && cursor !== 0);

        if (totalDeleted > 0) {
            // Only log info in development, debug in production
            if (process.env.NODE_ENV === "production") {
                logger.debug(`Successfully deleted ${totalDeleted} cache keys matching pattern: ${pattern}`);
            } else {
                logger.info(`Successfully deleted ${totalDeleted} cache keys matching pattern: ${pattern}`);
            }
        } else {
            // Only log in debug mode
            if (process.env.LOG_LEVEL === "debug" || process.env.NODE_ENV !== "production") {
                logger.debug(`No cache keys found matching pattern: ${pattern}`);
            }
        }

        return totalDeleted;
    } catch (error) {
        // Check if Redis is actually connected BEFORE logging error
        if (!isRedisConnected()) {
            // Redis is not connected - this is expected if Redis is disabled
            // Don't log as error - this is normal when Redis is not configured
            return 0;
        }

        // Only log detailed errors in development, or if it's a critical error
        const isCriticalError = error.code === "ECONNREFUSED" ||
                                error.code === "ETIMEDOUT" ||
                                error.message.includes("timeout") ||
                                error.message.includes("Connection") ||
                                error.message.includes("ECONNRESET");

        if (isCriticalError || process.env.NODE_ENV !== "production") {
            logger.error({
                message: "Error deleting cache by pattern",
                pattern,
                error: error.message,
                code: error.code,
                errno: error.errno,
                syscall: error.syscall,
                name: error.name,
                redisConnected: isRedisConnected(),
                redisOpen: redisClient.isOpen,
                stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
            });
        } else {
            // In production, only log warnings for non-critical cache errors
            logger.debug({
                message: "Cache deletion failed (non-critical)",
                pattern,
                error: error.message,
            });
        }
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
