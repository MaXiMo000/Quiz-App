import winston from "winston";
import "winston-daily-rotate-file";
import fs from "fs";

const { combine, timestamp, json, colorize, align, printf } = winston.format;

// Check if we're in production (Render, Heroku, etc.)
// Note: RENDER env var is set by Render platform, so we check that separately
const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER;

// Create logs directory - always create in backend directory
// Use absolute path resolution to ensure we're in the right directory
const logsDir = "logs";
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`✅ Created logs directory: ${fs.realpathSync(logsDir)}`);
  } catch (error) {
    console.error(`❌ Failed to create logs directory: ${error.message}`);
  }
}

// Console transport for all environments
const consoleTransport = new winston.transports.Console({
  format: combine(
    colorize({ all: true }),
    align(),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
});

// File transports only for development
const fileTransports = [];
const exceptionHandlers = [];
const rejectionHandlers = [];

// Always create file transports (even in production, but only if not on Render)
// Render logs go to console, local production can still use files
if (!process.env.RENDER) {
  // File rotation transport
  const fileRotateTransport = new winston.transports.DailyRotateFile({
    filename: "logs/application-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    createSymlink: true, // Create current symlink
    symlinkName: "current.log"
  });

  fileTransports.push(fileRotateTransport);
  exceptionHandlers.push(new winston.transports.File({ filename: "logs/exception.log" }));
  rejectionHandlers.push(new winston.transports.File({ filename: "logs/rejection.log" }));
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? "warn" : "info"),
  format: combine(
    timestamp({
      format: "YYYY-MM-DD hh:mm:ss.SSS A",
    }),
    json()
  ),
  transports: [
    consoleTransport,
    ...fileTransports,
  ],
  exceptionHandlers: exceptionHandlers,
  rejectionHandlers: rejectionHandlers,
});

// Add production-specific logging
if (isProduction) {
  if (process.env.RENDER) {
    logger.info("🚀 Production logging enabled - logs will appear in Render console");
  } else {
    logger.info("🔧 Production mode - logs saved to files and console");
  }
  logger.info(`📊 Log level: ${logger.level}`);
} else {
  logger.info("🔧 Development logging enabled - logs saved to files and console");
}

// Log file transport status
if (fileTransports.length > 0) {
  try {
    const logsPath = fs.existsSync("logs") ? fs.realpathSync("logs") : "logs (will be created)";
    logger.info(`📁 Log files will be saved to: ${logsPath}`);
  } catch (error) {
    logger.info(`📁 Log files will be saved to: logs/`);
  }
} else {
  logger.info("📁 Log files disabled (console only - Render deployment)");
}

export default logger;
