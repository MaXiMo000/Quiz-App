import redis from "redis";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

// Redis Cloud configuration with timeout and reconnection settings
// Production-ready with proper error handling and reconnection logic
const redisConfig = {
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
    tls: process.env.REDIS_SSL === "true" ? {} : undefined,
    connectTimeout: 10000, // 10 seconds connection timeout
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error("Redis reconnection failed after 10 attempts - giving up");
        return new Error("Redis reconnection limit exceeded");
      }
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms, then 5000ms max
      const delay = Math.min(100 * Math.pow(2, retries), 5000);
      // Only log reconnection attempts in production if critical (first 3 attempts)
      if (process.env.NODE_ENV === "production" && retries <= 3) {
        logger.warn(`Redis reconnecting (attempt ${retries + 1}) in ${delay}ms...`);
      } else if (process.env.NODE_ENV !== "production") {
        logger.warn(`Redis reconnecting (attempt ${retries + 1}) in ${delay}ms...`);
      }
      return delay;
    }
  },
  // Command timeout - operations will fail after this time
  commandTimeout: 5000, // 5 seconds per command
  // Keep connection alive
  pingInterval: 30000, // Ping every 30 seconds to keep connection alive
};

// Use Redis URL if available (for Redis Cloud)
let redisClient;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
      connectTimeout: 10000,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error("Redis reconnection failed after 10 attempts - giving up");
          return new Error("Redis reconnection limit exceeded");
        }
        const delay = Math.min(100 * Math.pow(2, retries), 5000);
        // Only log reconnection attempts in production if critical (first 3 attempts)
        if (process.env.NODE_ENV === "production" && retries <= 3) {
          logger.warn(`Redis reconnecting (attempt ${retries + 1}) in ${delay}ms...`);
        } else if (process.env.NODE_ENV !== "production") {
          logger.warn(`Redis reconnecting (attempt ${retries + 1}) in ${delay}ms...`);
        }
        return delay;
      }
    },
    commandTimeout: 5000,
    pingInterval: 30000,
  });
} else {
  redisClient = redis.createClient(redisConfig);
}

// Enhanced error handling
redisClient.on("error", (err) => {
  logger.error("Redis Client Error", {
    message: err.message,
    code: err.code,
    errno: err.errno,
    syscall: err.syscall
  });
});

redisClient.on("connect", () => {
  logger.info("Redis client connecting...");
});

redisClient.on("ready", () => {
  logger.info("Redis client ready");
});

redisClient.on("reconnecting", () => {
  // Only log reconnection in development or if LOG_LEVEL is debug
  if (process.env.LOG_LEVEL === "debug" || process.env.NODE_ENV !== "production") {
    logger.warn("Redis client reconnecting...");
  }
});

redisClient.on("end", () => {
  logger.warn("Redis client connection ended");
});

// Connection health check
let isConnected = false;
let connectionCheckInterval = null;

const checkConnection = async () => {
  try {
    if (redisClient.isOpen) {
      await Promise.race([
        redisClient.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Ping timeout")), 3000)
        )
      ]);
      if (!isConnected) {
        isConnected = true;
        // Only log in development or debug mode
        if (process.env.LOG_LEVEL === "debug" || process.env.NODE_ENV !== "production") {
          logger.info("Redis connection health check passed");
        }
      }
    } else {
      if (isConnected) {
        isConnected = false;
        // Only log in development or debug mode
        if (process.env.LOG_LEVEL === "debug" || process.env.NODE_ENV !== "production") {
          logger.warn("Redis connection lost - will attempt to reconnect");
        }
      }
    }
  } catch (error) {
    if (isConnected) {
      isConnected = false;
      logger.warn("Redis connection health check failed", { error: error.message });
    }
  }
};

const connectRedis = async () => {
    try {
        // Check if Redis URL or config is provided
        if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
            logger.warn("Redis configuration not found - caching and sessions will use MemoryStore");
            logger.warn("Set REDIS_URL or REDIS_HOST/REDIS_PASSWORD in environment variables for production");
            isConnected = false;
            return;
        }

        // Connect redis client with timeout
        await Promise.race([
          redisClient.connect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout after 10 seconds")), 10000)
          )
        ]);

        logger.info("Redis client connected successfully.");

        // Test the redis connection with timeout
        await Promise.race([
          redisClient.ping(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Ping timeout after 5 seconds")), 5000)
          )
        ]);

        logger.info("Redis ping successful - connection is working!");
        isConnected = true;

        // Start periodic connection health checks (every 30 seconds)
        if (connectionCheckInterval) {
          clearInterval(connectionCheckInterval);
        }
        connectionCheckInterval = setInterval(checkConnection, 30000);

        logger.info("Redis caching is fully functional!");

    } catch (err) {
        logger.error("Failed to connect to Redis", {
          message: err.message,
          code: err.code,
          errno: err.errno,
          syscall: err.syscall
        });

        // In production, provide helpful error message
        if (process.env.NODE_ENV === "production" || process.env.RENDER) {
            logger.error("Redis connection failed in production - check your REDIS_URL or REDIS_HOST/REDIS_PASSWORD");
            logger.warn("Application will continue without Redis cache (sessions may not persist across restarts)");
        } else {
            logger.warn("Application will continue without Redis cache (development mode)");
        }

        isConnected = false;
        // Don't throw - allow app to run without cache
        throw err; // Re-throw so caller knows connection failed
    }
};

// Export connection status check
const isRedisConnected = () => isConnected && redisClient.isOpen;

export { redisClient, connectRedis, isRedisConnected };
