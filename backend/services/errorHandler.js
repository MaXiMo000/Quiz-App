import logger from "../utils/logger.js";

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  logger.error(
    `Error on ${req.method} ${req.url} - ${err.message}`,
    {
      stack: err.stack,
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
      },
    }
  );

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
  });
};

export default errorHandler;
