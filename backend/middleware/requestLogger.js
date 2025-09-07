import logger from '../utils/logger.js';

/**
 * Request logging middleware
 * Logs all HTTP requests with detailed information
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log the incoming request
  logger.info(`📥 ${req.method} ${req.originalUrl}`, {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user.id : null,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    headers: {
      'content-type': req.get('Content-Type'),
      'authorization': req.get('Authorization') ? '[REDACTED]' : undefined,
    }
  });

  // Override res.json to log the response
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const duration = Date.now() - start;
    
    // Log the response
    logger.request(req, res, duration);
    
    // Log performance if response is slow
    if (duration > 1000) {
      logger.performance(`${req.method} ${req.originalUrl}`, duration, {
        statusCode: res.statusCode,
        userId: req.user ? req.user.id : null,
      });
    }

    // Call the original res.json
    return originalJson(data);
  };

  // Override res.send for non-JSON responses
  const originalSend = res.send.bind(res);
  res.send = function(data) {
    const duration = Date.now() - start;
    
    // Log the response
    logger.request(req, res, duration);
    
    // Call the original res.send
    return originalSend(data);
  };

  next();
};

/**
 * Error logging middleware
 * Logs all errors with stack traces and context
 */
export const errorLogger = (err, req, res, next) => {
  logger.error('Unhandled Error', err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user.id : null,
    body: req.body,
    query: req.query,
    stack: err.stack,
  });

  next(err);
};

/**
 * Security event logging middleware
 * Logs security-related events
 */
export const securityLogger = (req, res, next) => {
  // Log suspicious activities
  const suspiciousPatterns = [
    /script/i,
    /<script/i,
    /javascript:/i,
    /onload=/i,
    /onerror=/i,
    /union.*select/i,
    /drop.*table/i,
    /insert.*into/i,
    /delete.*from/i,
  ];

  const checkSuspicious = (obj, path = '') => {
    if (typeof obj === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(obj)) {
          logger.security(`Suspicious input detected in ${path}`, {
            input: obj,
            pattern: pattern.toString(),
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            userId: req.user ? req.user.id : null,
          });
          break;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        checkSuspicious(value, `${path}.${key}`);
      }
    }
  };

  // Check request body and query for suspicious content
  checkSuspicious(req.body, 'body');
  checkSuspicious(req.query, 'query');

  next();
};

/**
 * Rate limiting logger
 * Logs rate limiting events
 */
export const rateLimitLogger = (req, res, next) => {
  const originalSend = res.send.bind(res);
  
  res.send = function(data) {
    // Check if this is a rate limit response
    if (res.statusCode === 429) {
      logger.security('Rate limit exceeded', {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: req.user ? req.user.id : null,
        path: req.originalUrl,
        method: req.method,
      });
    }
    
    return originalSend(data);
  };

  next();
};

export default {
  requestLogger,
  errorLogger,
  securityLogger,
  rateLimitLogger,
};
