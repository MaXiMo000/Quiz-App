import redis from "redis";
import ioredis from "ioredis";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

const redisClient = redis.createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

redisClient.on("error", (err) => logger.error("Redis Client Error", err));

const ioredisClient = new ioredis({
    password: process.env.REDIS_PASSWORD,
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    db: 0,
});

const connectRedis = async () => {
    try {
        await redisClient.connect();
        logger.info("Redis client connected successfully.");
    } catch (err) {
        logger.error("Failed to connect to Redis", err);
        process.exit(1);
    }
};

export { redisClient, ioredisClient, connectRedis };
