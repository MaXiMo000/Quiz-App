import mongoose from "mongoose";
import cron from "node-cron";
import { createServer } from "http";
import logger from "./utils/logger.js";
import initRedis, { getRedisClient } from './config/redis.js';
import app from './app.js';
import { initializeRealTimeQuiz } from "./controllers/realTimeQuizController.js";
import { resetDailyChallenges } from "./controllers/gamificationController.js";

// Initialize Redis
initRedis();

const PORT = process.env.PORT || 4000;

const server = createServer(app);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    logger.info("✅ Connected to MongoDB");

    server.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    logger.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
};

initializeRealTimeQuiz(server);

// Daily Challenge Reset Scheduler
cron.schedule('0 * * * *', async () => {
    logger.info('🔄 Running hourly daily challenge reset check...');
    try {
        await resetDailyChallenges();
    } catch (error) {
        logger.error('❌ Error in scheduled reset:', error);
    }
});

const gracefulShutdown = async () => {
    logger.info("Shutting down gracefully...");
    server.close(async () => {
        logger.info("HTTP server closed.");
        try {
            await mongoose.disconnect();
            logger.info("MongoDB connection closed.");
            const redisClient = getRedisClient();
            if (redisClient && typeof redisClient.quit === "function") {
                await redisClient.quit();
                logger.info("Redis connection closed.");
            }
        } catch (err) {
            logger.error("Error during graceful shutdown", err);
        } finally {
            process.exit(0);
        }
    });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

startServer();