import logger from "../utils/logger.js";
import AppError from "../utils/AppError.js";

/**
 * ✨ Enhanced Error Handler ✨
 * Provides consistent error responses with better error handling
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Log error details
  logger.error(
    `Error on ${req.method} ${req.url} - ${err.message}`,
    {
      stack: err.stack,
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        user: req.user?.id || "anonymous",
      },
      error: {
        name: err.name,
        message: err.message,
        statusCode: err.statusCode,
        isOperational: err.isOperational,
      },
    }
  );

  // Determine status code
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    // Extract validation errors
    const errors = Object.values(err.errors || {}).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(statusCode).json({
      status: "error",
      statusCode,
      message,
      errors
    });
  }

  if (err.name === "CastError" || err.name === "ObjectId") {
    statusCode = 400;
    message = "Invalid ID format";
  }

  if (err.name === "MongoServerError" && err.code === 11000) {
    statusCode = 409;
    message = "Duplicate entry. This resource already exists.";
    const field = Object.keys(err.keyPattern || {})[0];
    return res.status(statusCode).json({
      status: "error",
      statusCode,
      message,
      errors: field ? [{ field, message: `${field} already exists` }] : null
    });
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token has expired";
  }

  // Don't leak error details in production for non-operational errors
  if (!err.isOperational && process.env.NODE_ENV === "production") {
    message = "Something went wrong. Please try again later.";
  }

  // Send error response
  const response = {
    status: "error",
    statusCode,
    message,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      error: err.name
    })
  };

  res.status(statusCode).json(response);
};

export default errorHandler;
