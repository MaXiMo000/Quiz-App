import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("🚫 JWT_SECRET is missing from environment variables! This is required for security.");
}

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        logger.info("❌ No Bearer token provided");
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // SECURITY: Only log user ID, not email (PII)
        // Only log successful verification in debug mode to reduce noise
        if (process.env.LOG_LEVEL === "debug") {
            logger.debug({ message: "Token decoded successfully", userId: decoded.id });
        }
        req.user = decoded;
        next();
    } catch (err) {
        // Only log JWT failures in debug mode or if it's not a common error (expired/invalid)
        // This reduces log noise from normal invalid token attempts
        if (process.env.LOG_LEVEL === "debug" ||
            (err.name !== "TokenExpiredError" && err.name !== "JsonWebTokenError")) {
            logger.debug({
                message: "JWT verification failed",
                error: err.message,
                errorName: err.name
            });
        }
        return res.status(403).json({ message: "Invalid or expired token." });
    }
};

/**
 * Requires the caller to be an admin.
 *
 * verifyToken only proves somebody is logged in. Several controllers already
 * did `req.user.role === "admin"` inline, but the routes under /api/debug did
 * no ownership or role check at all -- so any authenticated user could read
 * any other user's profile by id, reset any user's XP, level and streaks, and
 * trigger a bulk repair whose response listed every affected user's name and
 * email address.
 *
 * Use after verifyToken, which is what populates req.user.
 */
export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }
    if (req.user.role !== "admin") {
        logger.warn({ message: "Non-admin blocked from an admin-only route", userId: req.user.id, path: req.originalUrl });
        return res.status(403).json({ message: "Access denied. Admin only." });
    }
    next();
};
