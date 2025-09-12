import { getRedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';

const DEFAULT_EXPIRATION = 3600; // 1 hour in seconds

const getRedis = () => {
    // This function ensures we have a redis client instance to work with.
    // It will be initialized on first use if not already.
    return getRedisClient();
}

/**
 * Get a value from the cache.
 * @param {string} key - The cache key.
 * @returns {Promise<any>} The cached value, or null if not found.
 */
const get = async (key) => {
  const redisClient = getRedis();
  if (!redisClient) {
    logger.warn('Redis client not available, skipping cache get.');
    return null;
  }
  try {
    const data = await redisClient.get(key);
    if (data) {
      logger.debug(`Cache HIT for key: ${key}`);
      return JSON.parse(data);
    }
    logger.debug(`Cache MISS for key: ${key}`);
    return null;
  } catch (err) {
    logger.error(`Error getting from cache for key: ${key}`, err);
    return null;
  }
};

/**
 * Set a value in the cache.
 * @param {string} key - The cache key.
 * @param {any} value - The value to cache (must be JSON serializable).
 * @param {number} [expiration=${DEFAULT_EXPIRATION}] - The cache expiration time in seconds.
 * @returns {Promise<boolean>} - True if set successfully, false otherwise.
 */
const set = async (key, value, expiration = DEFAULT_EXPIRATION) => {
    const redisClient = getRedis();
    if (!redisClient) {
    logger.warn('Redis client not available, skipping cache set.');
    return false;
  }
  try {
    await redisClient.setex(key, expiration, JSON.stringify(value));
    logger.debug(`Cache SET for key: ${key}`);
    return true;
  } catch (err) {
    logger.error(`Error setting cache for key: ${key}`, err);
    return false;
  }
};

/**
 * Delete a value from the cache.
 * @param {string} key - The cache key to delete.
 * @returns {Promise<boolean>} - True if deleted successfully, false otherwise.
 */
const del = async (key) => {
    const redisClient = getRedis();
    if (!redisClient) {
    logger.warn('Redis client not available, skipping cache del.');
    return false;
  }
  try {
    await redisClient.del(key);
    logger.debug(`Cache DEL for key: ${key}`);
    return true;
  } catch (err) {
    logger.error(`Error deleting cache for key: ${key}`, err);
    return false;
  }
};

/**
 * Clear the entire cache.
 * NOTE: Use with caution, especially in production.
 * @returns {Promise<boolean>} - True if flushed successfully, false otherwise.
 */
const flush = async () => {
    const redisClient = getRedis();
    if (!redisClient) {
        logger.warn('Redis client not available, skipping cache flush.');
        return false;
    }
    try {
        await redisClient.flushall();
        logger.info('Cache flushed successfully.');
        return true;
    } catch (err) {
        logger.error('Error flushing cache', err);
        return false;
    }
}

const cacheService = {
  get,
  set,
  del,
  flush,
  getClient: getRedis,
};

export default cacheService;
