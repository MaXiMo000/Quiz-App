import logger from "../utils/logger.js";

const requestLogger = (req, res, next) => {
  const { method, url, ip, headers } = req;
  const userAgent = headers["user-agent"];

  logger.info(
    `Incoming Request: ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`
  );

  res.on("finish", () => {
    logger.info(
      `Request Completed: ${method} ${url} - Status: ${res.statusCode}`
    );
  });

  next();
};

export default requestLogger;
