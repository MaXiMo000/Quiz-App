import { redisClient } from "../config/redis.js";

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
    let cursor = "0";
    do {
        const reply = await redisClient.scan(cursor, {
            MATCH: pattern,
            COUNT: "100",
        });
        cursor = reply.cursor;
        if (reply.keys.length > 0) {
            await redisClient.del(reply.keys);
        }
    } while (cursor !== "0");
};

export default {
  get,
  set,
  del,
  clearCache,
  flushAll,
  delByPattern,
};
