import express from "express";
import { registerUser, loginUser, getAllUsers, updateUserRole, updateUserTheme, logoutUser, saveCustomTheme, getCustomThemes, deleteCustomTheme, bookmarkQuiz, removeBookmark, getBookmarkedQuizzes } from "../controllers/userController.js";
import { getStreakAndGoals, updateDailyGoals, updateDailyActivity } from "../controllers/streakController.js";
import { verifyToken } from "../middleware/auth.js";
import { roleUpdateLimiter } from "../middleware/rateLimiting.js";
import mongoose from "mongoose";
import { validate, registerSchema, loginSchema } from "../middleware/validation.js";
import cache, { clearCacheByPattern } from "../middleware/cache.js";

import passport from "passport";
import "../config/passport.js";
import UserQuiz from "../models/User.js"; // Assuming you have a User model
import logger from "../utils/logger.js";

const router = express.Router();

router.post("/register", validate(registerSchema), clearCacheByPattern("/api/users"), registerUser);
router.post("/login", validate(loginSchema), clearCacheByPattern("/api/users"), clearCacheByPattern("/api/dashboard"), loginUser);
// Logout endpoint - handles both authenticated and unauthenticated requests
router.post("/logout", async (req, res, next) => {
    // If no token, just return success (user already logged out or session expired)
    if (!req.headers.authorization) {
        return res.json({ message: "Already logged out" });
    }
    // Otherwise, verify token and proceed with normal logout
    verifyToken(req, res, next);
}, logoutUser);

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

/**
 * Normalize IP address (convert IPv6 loopback to IPv4, handle IPv4-mapped IPv6)
 * @param {string} ip - IP address to normalize
 * @returns {string} - Normalized IP address
 */
const normalizeIP = (ip) => {
    if (!ip || typeof ip !== 'string') return ip;

    // Convert IPv6 loopback (::1) to IPv4 loopback (127.0.0.1) for consistency
    if (ip === '::1' || ip === '::') {
        return '127.0.0.1';
    }

    // Extract IPv4 from IPv4-mapped IPv6 (::ffff:192.168.1.1 -> 192.168.1.1)
    const ipv4MappedMatch = ip.match(/^::ffff:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/);
    if (ipv4MappedMatch) {
        return ip.replace(/^::ffff:/, '');
    }

    return ip;
};

/**
 * Validate IP address format (IPv4 or IPv6)
 * @param {string} ip - IP address to validate
 * @returns {boolean} - True if valid IP format
 */
const isValidIP = (ip) => {
    if (!ip || typeof ip !== 'string') return false;

    // Normalize first (convert ::1 to 127.0.0.1, etc.)
    const normalized = normalizeIP(ip);

    // IPv4 regex: 0.0.0.0 to 255.255.255.255
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // IPv6 regex (simplified - covers most common formats)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

    // Check for IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
    const ipv4MappedRegex = /^::ffff:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    return ipv4Regex.test(normalized) || ipv6Regex.test(ip) || ipv4MappedRegex.test(ip);
};

/**
 * Extract IP address from request, handling proxies correctly
 * SECURITY: Prioritizes req.ip (validated by Express) over headers (can be spoofed)
 * @param {Object} req - Express request object
 * @returns {string} - IP address (validated)
 */
const getClientIP = (req) => {
    let ip = null;

    // SECURITY: Prioritize req.ip when trust proxy is enabled
    // Express validates req.ip based on trust proxy settings, making it more secure
    if (req.ip && isValidIP(req.ip)) {
        ip = req.ip;
        logger.debug(`Using req.ip: ${ip}`);
        return ip;
    }

    // Check X-Real-IP header (set by trusted proxies like Nginx)
    // This is more reliable than X-Forwarded-For as it's set by the proxy, not the client
    if (req.headers['x-real-ip']) {
        const realIP = req.headers['x-real-ip'].trim();
        if (isValidIP(realIP)) {
            ip = realIP;
            logger.debug(`Using X-Real-IP: ${ip}`);
            return ip;
        } else {
            logger.warn(`Invalid IP format in X-Real-IP header: ${realIP}`);
        }
    }

    // Check X-Forwarded-For header (when behind proxy)
    // SECURITY WARNING: This header can be spoofed by clients if proxy isn't configured correctly
    // Only use if trust proxy is enabled and we're behind a known proxy
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // X-Forwarded-For can contain multiple IPs, take the first one (original client)
        const ips = forwarded.split(',').map(ip => ip.trim());
        const firstIP = ips[0];

        if (isValidIP(firstIP)) {
            // Only use if trust proxy is enabled (indicates we're behind a trusted proxy)
            if (req.app.get('trust proxy')) {
                ip = firstIP;
                logger.debug(`Using X-Forwarded-For (trust proxy enabled): ${ip}`);
                return ip;
            } else {
                logger.warn(`X-Forwarded-For header present but trust proxy not enabled. IP may be spoofed: ${firstIP}`);
            }
        } else {
            logger.warn(`Invalid IP format in X-Forwarded-For header: ${firstIP}`);
        }
    }

    // Fallback to connection remote address (most reliable, but may show proxy IP)
    const remoteAddr = req.connection?.remoteAddress || req.socket?.remoteAddress;
    if (remoteAddr) {
        // Remove IPv6 prefix if present (::ffff:192.168.1.1 -> 192.168.1.1)
        const cleanIP = remoteAddr.replace(/^::ffff:/, '');
        if (isValidIP(cleanIP)) {
            ip = cleanIP;
            logger.debug(`Using connection.remoteAddress: ${ip}`);
            return ip;
        }
    }

    // If no valid IP found, log warning and return 'unknown'
    logger.warn(`Could not extract valid IP address from request. Headers: ${JSON.stringify({
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip'],
        'req.ip': req.ip,
        'remoteAddress': req.connection?.remoteAddress || req.socket?.remoteAddress
    })}`);

    return 'unknown';
};

// Google OAuth Callback
router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/login" }),
    async (req, res) => {
        try {
            const { token, user: userData } = req.user;
            const userId = userData._id;

            // ✅ Save IP address for Google OAuth login (with validation)
            const rawIP = getClientIP(req);
            const clientIP = normalizeIP(rawIP); // Normalize IPv6 loopback to IPv4
            const userAgent = req.headers['user-agent'] || 'unknown';

            const user = await UserQuiz.findById(userId);
            if (user) {
                // ✅ Update online status and last seen
                user.isOnline = true;
                user.lastSeen = new Date();

                // SECURITY: Only save if IP is valid (not 'unknown' or invalid format)
                if (clientIP && clientIP !== 'unknown' && isValidIP(clientIP)) {
                    user.lastLoginIP = clientIP;

                    // Add to login IP history (keep last 10 logins)
                    if (!user.loginIPHistory) {
                        user.loginIPHistory = [];
                    }
                    user.loginIPHistory.push({
                        ip: clientIP,
                        loginDate: new Date(),
                        userAgent: userAgent
                    });

                    // Keep only last 10 login IPs for security tracking
                    if (user.loginIPHistory.length > 10) {
                        user.loginIPHistory = user.loginIPHistory.slice(-10);
                    }

                    await user.save();
                    logger.info(`Saved IP address ${clientIP}${rawIP !== clientIP ? ` (normalized from ${rawIP})` : ''} for Google OAuth login for user ${userId} (${user.email})`);

                    // SECURITY: Check for suspicious IP changes (different IP from last login)
                    if (user.loginIPHistory.length > 1) {
                        const previousIP = user.loginIPHistory[user.loginIPHistory.length - 2]?.ip;
                        if (previousIP && previousIP !== clientIP && previousIP !== 'unknown') {
                            logger.info(`IP address changed for user ${userId}: ${previousIP} -> ${clientIP}`);
                        }
                    }
                } else {
                    logger.warn(`Invalid or unknown IP address detected for Google OAuth login: ${clientIP} (raw: ${rawIP}, user: ${userId})`);
                    // Still save as 'unknown' for tracking purposes
                    user.lastLoginIP = 'unknown';
                    await user.save();
                }
            } else {
                logger.warn(`User not found when trying to save IP address for Google OAuth login: ${userId}`);
            }

            // 🔒 SECURITY: Store user data in session instead of URL
            // Only pass the token through URL, user data retrieved via API call
            const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";
            res.redirect(`${frontendURL}/google-auth?token=${token}`);
        } catch (error) {
            logger.error({ message: "Error saving IP address for Google OAuth login", error: error.message, stack: error.stack });
            // Still redirect even if IP save fails
            const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";
            res.redirect(`${frontendURL}/google-auth?token=${req.user?.token || ''}`);
        }
    }
);

router.get("/", verifyToken, cache, getAllUsers); // Protected route

// 🔒 SECURITY: New endpoint to get current user data securely
// IMPORTANT: This must come BEFORE /:id route to avoid "me" being treated as an ID
router.get("/me", verifyToken, async (req, res) => {
    try {

        if (!req.user?.id) {
            logger.info("❌ No user ID in token");
            return res.status(401).json({ error: "Invalid token - no user ID" });
        }

        // Check if user ID is valid MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
            logger.info("❌ Invalid ObjectId format:", req.user.id);
            return res.status(400).json({ error: "Invalid user ID format" });
        }

        // First try to find user WITH password to see if user exists at all
        const userWithPassword = await UserQuiz.findById(req.user.id);

        if (!userWithPassword) {
            logger.info("❌ User not found in database:", req.user.id);
            return res.status(404).json({ error: "User not found" });
        }

        // Now get user without password
        const user = await UserQuiz.findById(req.user.id).select("-password");
        // SECURITY: Only log user ID, not email (PII)
        logger.info("✅ User found:", user?._id);

        // ✅ Update lastSeen (heartbeat) - update every 5 minutes to avoid excessive DB writes
        const now = new Date();
        const lastSeen = user.lastSeen ? new Date(user.lastSeen) : null;
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        if (!lastSeen || lastSeen < fiveMinutesAgo) {
            user.lastSeen = now;
            // Also ensure isOnline is true if user is making authenticated requests
            if (!user.isOnline) {
                user.isOnline = true;
            }
            await user.save();
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            xp: user.xp || 0,
            totalXP: user.totalXP || 0,
            level: user.level || 1,
            loginStreak: user.loginStreak || 0,
            quizStreak: user.quizStreak || 0,
            badges: user.badges || [],
            unlockedThemes: user.unlockedThemes || [],
            selectedTheme: user.selectedTheme || "Default",
            customThemes: user.customThemes || [],
            isOnline: user.isOnline || false,
            lastSeen: user.lastSeen || new Date(),
        });
    } catch (err) {
        logger.error("❌ /me endpoint error:", err);
        logger.error("❌ Error stack:", err.stack);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

// Streak & Goals routes (must come before /:id to avoid conflicts)
router.get("/streak/goals", verifyToken, getStreakAndGoals);
router.put("/streak/goals", verifyToken, clearCacheByPattern("/api/users"), updateDailyGoals);
router.post("/streak/activity", verifyToken, clearCacheByPattern("/api/users"), clearCacheByPattern("/api/users/streak"), updateDailyActivity);

// Bookmark routes (must come before /:id to avoid conflicts)
router.post("/bookmarks", verifyToken, clearCacheByPattern("/api/users"), bookmarkQuiz);
router.delete("/bookmarks", verifyToken, clearCacheByPattern("/api/users"), removeBookmark);
router.get("/bookmarks", verifyToken, getBookmarkedQuizzes);

router.patch("/update-role", roleUpdateLimiter, verifyToken, clearCacheByPattern("/api/users"), updateUserRole);
router.post("/:id/theme", verifyToken, clearCacheByPattern("/api/users"), updateUserTheme);
router.post("/:id/custom-theme", verifyToken, clearCacheByPattern("/api/users"), saveCustomTheme);
router.get("/:id/custom-themes", verifyToken, getCustomThemes);
router.delete("/:id/custom-theme", verifyToken, clearCacheByPattern("/api/users"), deleteCustomTheme);

// This catch-all route MUST come last to avoid matching specific routes like /bookmarks, /me, /streak, etc.
router.get("/:id", verifyToken, cache, async (req, res) => {
    try {
        const user = await UserQuiz.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            xp: user.xp || 0,
            totalXP: user.totalXP || 0,
            level: user.level || 1,
            loginStreak: user.loginStreak || 0,
            quizStreak: user.quizStreak || 0,
            badges: user.badges || [],
            unlockedThemes: user.unlockedThemes || [],
            selectedTheme: user.selectedTheme || "Default",
            customThemes: user.customThemes || [],
            isOnline: user.isOnline || false,
            lastSeen: user.lastSeen || new Date(),
        });
    } catch (err) {
        logger.error({ message: `Error fetching user ${req.params.id}`, error: err.message });
        res.status(500).json({ error: "User not found" });
    }
});

export default router;
