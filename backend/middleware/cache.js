import cacheService from "../services/cacheService.js";

const cache = async (req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }

  const key = req.originalUrl;
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
};

export const clearCacheByPattern = (pattern) => {
    return async (req, res, next) => {
        await cacheService.delByPattern(`${pattern}*`);
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

export default cache;
