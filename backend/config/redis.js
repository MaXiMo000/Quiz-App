import redis from "redis";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

// Redis Cloud configuration
const redisConfig = {
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT) || 6379,
    tls: process.env.REDIS_SSL === "true" ? {} : undefined
  }
};

// Use Redis URL if available (for Redis Cloud)
let redisClient;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL
  });
} else {
  redisClient = redis.createClient(redisConfig);
}

redisClient.on("error", (err) => logger.error("Redis Client Error", err));

const connectRedis = async () => {
    try {
        // Connect redis client
        await redisClient.connect();
        logger.info("Redis client connected successfully to Redis Cloud.");

        // Test the redis connection
        await redisClient.ping();
        logger.info("Redis ping successful - connection is working!");

        logger.info("Redis Cloud caching is fully functional!");

    } catch (err) {
        logger.error("Failed to connect to Redis Cloud", err);
        logger.error("Please check your Redis Cloud credentials and network connection");
        process.exit(1);
    }
};

export { redisClient, connectRedis };
