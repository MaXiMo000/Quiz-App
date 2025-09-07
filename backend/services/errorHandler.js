import logger from '../utils/logger.js';

/**
 * Global error handler service
 * Centralizes error handling and logging
 */
class ErrorHandler {
  /**
   * Handle and log application errors
   * @param {Error} error - The error object
   * @param {Object} context - Additional context information
   * @returns {Object} - Formatted error response
   */
  static handleError(error, context = {}) {
    // Log the error
    logger.error('Application Error', error, {
      ...context,
      timestamp: new Date().toISOString(),
    });

    // Determine error type and response
    if (error.name === 'ValidationError') {
      return this.handleValidationError(error);
    }

    if (error.name === 'CastError') {
      return this.handleCastError(error);
    }

    if (error.code === 11000) {
      return this.handleDuplicateKeyError(error);
    }

    if (error.name === 'JsonWebTokenError') {
      return this.handleJWTError(error);
    }

    if (error.name === 'TokenExpiredError') {
      return this.handleJWTExpiredError(error);
    }

    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return this.handleMongoError(error);
    }

    // Default error handling
    return this.handleGenericError(error);
  }

  /**
   * Handle validation errors
   * @param {Error} error - Validation error
   * @returns {Object} - Formatted error response
   */
  static handleValidationError(error) {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));

    return {
      success: false,
      error: 'Validation Error',
      message: 'Invalid input data',
      details: errors,
      statusCode: 400
    };
  }

  /**
   * Handle cast errors (invalid ObjectId, etc.)
   * @param {Error} error - Cast error
   * @returns {Object} - Formatted error response
   */
  static handleCastError(error) {
    return {
      success: false,
      error: 'Invalid ID',
      message: `Invalid ${error.path}: ${error.value}`,
      statusCode: 400
    };
  }

  /**
   * Handle duplicate key errors
   * @param {Error} error - Duplicate key error
   * @returns {Object} - Formatted error response
   */
  static handleDuplicateKeyError(error) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    
    return {
      success: false,
      error: 'Duplicate Entry',
      message: `${field} '${value}' already exists`,
      statusCode: 409
    };
  }

  /**
   * Handle JWT errors
   * @param {Error} error - JWT error
   * @returns {Object} - Formatted error response
   */
  static handleJWTError(error) {
    return {
      success: false,
      error: 'Authentication Error',
      message: 'Invalid token',
      statusCode: 401
    };
  }

  /**
   * Handle JWT expired errors
   * @param {Error} error - JWT expired error
   * @returns {Object} - Formatted error response
   */
  static handleJWTExpiredError(error) {
    return {
      success: false,
      error: 'Authentication Error',
      message: 'Token expired',
      statusCode: 401
    };
  }

  /**
   * Handle MongoDB errors
   * @param {Error} error - MongoDB error
   * @returns {Object} - Formatted error response
   */
  static handleMongoError(error) {
    return {
      success: false,
      error: 'Database Error',
      message: 'A database error occurred',
      statusCode: 500
    };
  }

  /**
   * Handle generic errors
   * @param {Error} error - Generic error
   * @returns {Object} - Formatted error response
   */
  static handleGenericError(error) {
    return {
      success: false,
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Something went wrong' 
        : error.message,
      statusCode: 500
    };
  }

  /**
   * Create a custom error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorType - Error type
   * @returns {Error} - Custom error object
   */
  static createError(message, statusCode = 500, errorType = 'CustomError') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.name = errorType;
    return error;
  }

  /**
   * Handle async errors in Express routes
   * @param {Function} fn - Async function to wrap
   * @returns {Function} - Express middleware function
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Express error handling middleware
   * @param {Error} err - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static expressErrorHandler(err, req, res, next) {
    const errorResponse = this.handleError(err, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user ? req.user.id : null,
    });

    res.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * Handle uncaught exceptions
   */
  static handleUncaughtException() {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      process.exit(1);
    });
  }

  /**
   * Handle unhandled promise rejections
   */
  static handleUnhandledRejection() {
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', reason, { promise });
      process.exit(1);
    });
  }

  /**
   * Initialize error handling
   */
  static initialize() {
    this.handleUncaughtException();
    this.handleUnhandledRejection();
  }
}

export default ErrorHandler;
