import IORedis from 'ioredis';
import IORedisMock from 'ioredis-mock';
import logger from '../utils/logger.js';

let redisClient;

const initRedis = () => {
    if (redisClient) {
        return redisClient;
    }

    if (process.env.NODE_ENV === 'test') {
        redisClient = new IORedisMock();
        logger.info('✅ Mock Redis client initialized for testing.');
    } else {
        const redisOptions = {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: process.env.REDIS_PORT || 6379,
            maxRetriesPerRequest: 3,
            connectTimeout: 10000,
        };
        redisClient = new IORedis(redisOptions);
    }

    redisClient.on('connect', () => logger.info('✅ Connected to Redis'));
    redisClient.on('ready', () => logger.info('✅ Redis is ready for commands.'));
    redisClient.on('error', (err) => logger.error('❌ Redis Connection Error:', err));
    redisClient.on('reconnecting', () => logger.warn('🔄 Reconnecting to Redis...'));
    redisClient.on('end', () => logger.error('❌ Connection to Redis has been closed.'));

    return redisClient;
};

export const getRedisClient = () => {
    if (!redisClient) {
        return initRedis();
    }
    return redisClient;
};

export default initRedis;
