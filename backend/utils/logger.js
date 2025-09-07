import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Use a simple path resolution that works in both environments
const __dirname = process.cwd();

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    ),
  }),
];

// Add file transports in production (only if logs directory exists)
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_FILE_LOGGING === 'true') {
  // Error log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(__dirname, '../logs/error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxSize: '20m',
      maxFiles: '14d',
    })
  );

  // Combined log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxSize: '20m',
      maxFiles: '14d',
    })
  );

  // HTTP request log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(__dirname, '../logs/http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxSize: '20m',
      maxFiles: '7d',
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
  // Do not exit on handled exceptions
  exitOnError: false,
});

// Create a stream object with a 'write' function for Morgan
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Custom logging methods
logger.request = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user ? req.user.id : null,
  };

  if (res.statusCode >= 400) {
    logger.warn('HTTP Request', logData);
  } else {
    logger.http('HTTP Request', logData);
  }
};

logger.error = (message, error = null, meta = {}) => {
  const errorData = {
    message,
    stack: error ? error.stack : null,
    ...meta,
  };
  winston.createLogger({ transports }).error(errorData);
};

logger.security = (message, meta = {}) => {
  logger.warn(`🔒 SECURITY: ${message}`, meta);
};

logger.performance = (operation, duration, meta = {}) => {
  logger.info(`⚡ PERFORMANCE: ${operation} took ${duration}ms`, meta);
};

logger.database = (operation, query, duration, meta = {}) => {
  logger.debug(`🗄️ DATABASE: ${operation}`, {
    query: typeof query === 'string' ? query : JSON.stringify(query),
    duration: `${duration}ms`,
    ...meta,
  });
};

logger.cache = (operation, key, hit = null, meta = {}) => {
  const hitStatus = hit !== null ? (hit ? 'HIT' : 'MISS') : '';
  logger.debug(`📦 CACHE: ${operation} ${hitStatus}`, {
    key,
    ...meta,
  });
};

logger.auth = (action, userId, success, meta = {}) => {
  const status = success ? 'SUCCESS' : 'FAILED';
  logger.info(`🔐 AUTH: ${action} ${status}`, {
    userId,
    ...meta,
  });
};

logger.business = (event, data = {}) => {
  logger.info(`💼 BUSINESS: ${event}`, data);
};

// Export the logger
export default logger;
