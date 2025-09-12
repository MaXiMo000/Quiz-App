import logger from '../utils/logger.js';

/**
 * HTTP request logger middleware.
 * Logs incoming requests and their responses.
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  const userAgent = req.get('User-Agent') || 'N/A';

  // Log incoming request
  logger.info(`Incoming request: ${method} ${originalUrl} from ${ip} [${userAgent}]`);

  // Log request body for non-production environments, redacting sensitive fields
  if (process.env.NODE_ENV !== 'production' && req.body && Object.keys(req.body).length > 0) {
    const bodyToLog = { ...req.body };
    if (bodyToLog.password) bodyToLog.password = 'REDACTED';
    if (bodyToLog.token) bodyToLog.token = 'REDACTED';
    logger.debug(`Request Body: ${JSON.stringify(bodyToLog)}`);
  }

  // Log response details when the request is finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const message = `Response: ${method} ${originalUrl} => ${statusCode} [${duration}ms]`;

    if (statusCode >= 500) {
      logger.error(message);
    } else if (statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.info(message);
    }
  });

  next();
};

export default requestLogger;
