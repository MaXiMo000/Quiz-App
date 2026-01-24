import { redisClient } from "../config/redis.js";
import logger from "../utils/logger.js";

const get = async (key) => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

const set = (key, value, expiration = 3600) => {
  return redisClient.set(key, JSON.stringify(value), { EX: expiration.toString() });
};

const del = (key) => {
  return redisClient.del(key);
};

const clearCache = (key) => {
    return redisClient.del(key);
};

const flushAll = () => {
    return redisClient.flushDb();
};

const delByPattern = async (pattern) => {
    try {
        let cursor = "0";
        let totalDeleted = 0;
        
        do {
            const reply = await redisClient.scan(cursor, {
                MATCH: pattern,
                COUNT: "100",
            });
            cursor = reply.cursor;
            if (reply.keys && reply.keys.length > 0) {
                const deleted = await redisClient.del(reply.keys);
                totalDeleted += deleted;
            }
        } while (cursor !== "0");
        
        if (totalDeleted > 0) {
            logger.debug(`Deleted ${totalDeleted} cache keys matching pattern: ${pattern}`);
        }
        return totalDeleted;
    } catch (error) {
        logger.error({ message: `Error deleting cache by pattern`, pattern, error: error.message, stack: error.stack });
        throw error;
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
