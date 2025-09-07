import Redis from 'ioredis';
import logger from '../utils/logger.js';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  // Production optimizations
  enableReadyCheck: false,
  enableOfflineQueue: false,
  // SSL support for Redis Cloud
  tls: process.env.REDIS_SSL === 'true' ? {} : undefined,
};

// Create Redis client
const redis = new Redis(redisConfig);

// Handle Redis connection events
redis.on('connect', () => {
  logger.cache('Redis connected successfully');
});

redis.on('error', (err) => {
  logger.error('Redis connection error', err);
});

redis.on('close', () => {
  logger.cache('Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.cache('Redis reconnecting...');
});

// Test Redis connection
const testConnection = async () => {
  try {
    // Ensure connection is established first
    if (redis.status !== 'ready') {
      await redis.connect();
    }
    await redis.ping();
    logger.cache('Redis ping successful');
    return true;
  } catch (error) {
    logger.error('Redis ping failed', error);
    return false;
  }
};

export { redis, testConnection };
export default redis;
