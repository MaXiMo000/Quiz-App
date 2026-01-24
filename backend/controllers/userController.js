import UserQuiz from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import XPLog from "../models/XPLog.js";
import { unlockThemesForLevel } from "../utils/themeUtils.js";
import logger from "../utils/logger.js";

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

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("🚫 JWT_SECRET is missing from environment variables! This is required for security.");
}

// Register user
export const registerUser = async (req, res) => {
    logger.info(`Attempting to register user with email: ${req.body.email}`);
    try {
        const { name, email, password } = req.body;

        const existingUser = await UserQuiz.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            logger.warn(`Registration failed: User already exists with email: ${email}`);
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(12); // Increased salt rounds for better security
        const hashedPassword = await bcrypt.hash(password, salt);

        // ✅ Extract IP address during registration (with validation)
        const rawIP = getClientIP(req);
        const clientIP = normalizeIP(rawIP); // Normalize IPv6 loopback to IPv4
        const userAgent = req.headers['user-agent'] || 'unknown';

        const newUser = new UserQuiz({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword
        });

        // SECURITY: Save IP address if valid (not 'unknown' or invalid format)
        if (clientIP && clientIP !== 'unknown' && isValidIP(clientIP)) {
            newUser.lastLoginIP = clientIP;

            // Initialize login IP history with registration IP
            newUser.loginIPHistory = [{
                ip: clientIP,
                loginDate: new Date(),
                userAgent: userAgent
            }];

            logger.info(`Saved IP address ${clientIP}${rawIP !== clientIP ? ` (normalized from ${rawIP})` : ''} for registration for user ${newUser._id} (${email})`);
        } else {
            logger.warn(`Invalid or unknown IP address detected for registration: ${clientIP} (raw: ${rawIP}, email: ${email})`);
            newUser.lastLoginIP = 'unknown';
        }

        await newUser.save();

        logger.info(`User registered successfully with email: ${email}`);
        res.status(201).json({ success: true, message: "User registered successfully!" });
    } catch (error) {
        logger.error({ message: "Error during user registration", error: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Login user
export const loginUser = async (req, res) => {
    logger.info(`Attempting to login user with email: ${req.body.email}`);
    try {
        const { email, password } = req.body;
        const user = await UserQuiz.findOne({ email });
        if (!user) {
            logger.warn(`Login failed: User not found with email: ${email}`);
            return res.status(400).json({ error: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn(`Login failed: Invalid credentials for email: ${email}`);
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // ✅ Check daily login streak
        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
        const lastLoginMidnight = lastLogin ? new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate()) : null;

        // ✅ Save IP address on EVERY login (with validation)
        // This tracks IP changes even within the same day (VPN changes, mobile network switches, etc.)
        const rawIP = getClientIP(req);
        const clientIP = normalizeIP(rawIP); // Normalize IPv6 loopback to IPv4
        const userAgent = req.headers['user-agent'] || 'unknown';

        // SECURITY: Only save if IP is valid (not 'unknown' or invalid format)
        if (clientIP && clientIP !== 'unknown' && isValidIP(clientIP)) {
            // Initialize loginIPHistory if it doesn't exist
            if (!user.loginIPHistory) {
                user.loginIPHistory = [];
            }

            // Get the last login IP from history (if exists)
            const lastLoginEntry = user.loginIPHistory[user.loginIPHistory.length - 1];
            const lastLoginIP = lastLoginEntry?.ip;
            const lastLoginDate = lastLoginEntry?.loginDate ? new Date(lastLoginEntry.loginDate) : null;
            const lastLoginMidnight = lastLoginDate ? new Date(lastLoginDate.getFullYear(), lastLoginDate.getMonth(), lastLoginDate.getDate()) : null;

            // Only add to history if:
            // 1. It's a new day (different from last login day), OR
            // 2. IP has changed from last login (even on same day - important for security)
            const shouldAddToHistory = !lastLoginMidnight ||
                                       todayMidnight.getTime() !== lastLoginMidnight.getTime() ||
                                       (lastLoginIP && lastLoginIP !== clientIP);

            // Always update lastLoginIP (current IP)
            user.lastLoginIP = clientIP;

            if (shouldAddToHistory) {
                // Add to login IP history (keep last 10 logins)
                user.loginIPHistory.push({
                    ip: clientIP,
                    loginDate: new Date(),
                    userAgent: userAgent
                });

                // Keep only last 10 login IPs for security tracking
                if (user.loginIPHistory.length > 10) {
                    user.loginIPHistory = user.loginIPHistory.slice(-10);
                }

                logger.info(`Saved IP address ${clientIP}${rawIP !== clientIP ? ` (normalized from ${rawIP})` : ''} for login for user ${user._id} (${email})`);

                // SECURITY: Check for suspicious IP changes (different IP from last login)
                if (user.loginIPHistory.length > 1) {
                    const previousIP = user.loginIPHistory[user.loginIPHistory.length - 2]?.ip;
                    if (previousIP && previousIP !== clientIP && previousIP !== 'unknown') {
                        logger.info(`IP address changed for user ${user._id}: ${previousIP} -> ${clientIP}`);
                    }
                }
            } else {
                // Same IP, same day - just update lastLoginIP, don't add to history
                logger.debug(`Same IP (${clientIP}) on same day for user ${user._id} - skipping history entry`);
            }
        } else {
            logger.warn(`Invalid or unknown IP address detected for login: ${clientIP} (raw: ${rawIP}, user: ${user._id}, email: ${email})`);
            // Still save as 'unknown' for tracking purposes
            user.lastLoginIP = 'unknown';
        }

        // Check if this is a new day (different from last login day)
        const isNewDay = !lastLoginMidnight || todayMidnight.getTime() !== lastLoginMidnight.getTime();

        if (isNewDay) {
            // Check if it's consecutive day for streak
            const oneDayAgo = new Date(todayMidnight.getTime() - 24 * 60 * 60 * 1000);

            if (lastLoginMidnight && lastLoginMidnight.getTime() === oneDayAgo.getTime()) {
                // Continued streak
                user.loginStreak += 1;
            } else {
                // Reset streak or first login
                user.loginStreak = 1;
            }

            user.lastLogin = new Date();

            // ✅ Award XP bonus (only on new day)
            const loginBonusXP = 50;
            user.xp += loginBonusXP;
            user.totalXP = (user.totalXP || 0) + loginBonusXP;
            await new XPLog({ user: user._id, xp: loginBonusXP, source: "login" }).save();

            // ✅ Level-up logic (keep total XP, only subtract current level XP)
            let currentLevelXP = user.xp;
            let xpForNext = user.level * 100;
            while (currentLevelXP >= xpForNext) {
                currentLevelXP -= xpForNext;
                user.level += 1;
                xpForNext = user.level * 100;
                unlockThemesForLevel(user);
            }
            user.xp = currentLevelXP; // Set remaining XP for current level
        } else {
            // Update lastLogin timestamp even if same day (for accurate tracking)
            user.lastLogin = new Date();
        }

        // ≫≫ THEME UNLOCKING ≪≪
        unlockThemesForLevel(user);

        // ✅ Update online status and last seen on login
        user.isOnline = true;
        user.lastSeen = new Date();

        await user.save();

        // ✅ Generate token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        logger.info(`User logged in successfully: ${email} from IP: ${getClientIP(req)}`);
        // ✅ Return user with XP, level, streak
        res.json({
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                xp: user.xp || 0,
                level: user.level || 0,
                loginStreak: user.loginStreak || 0,
                quizStreak: user.quizStreak || 0,
                badges: user.badges || [],
                unlockedThemes: user.unlockedThemes || [],
                selectedTheme: user.selectedTheme || "Default",
                isOnline: user.isOnline || false,
                lastSeen: user.lastSeen || new Date(),
            },
        });
    } catch (error) {
        logger.error({ message: "Error during user login", error: error.message, stack: error.stack });
        res.status(500).json({ error: "Server Error" });
    }
};


// Get all users (admin-only)
export const getAllUsers = async (req, res) => {
    logger.info("Fetching all users");
    try {
        const users = await UserQuiz.find();
        logger.info(`Successfully fetched ${users.length} users`);
        res.json(users);
    } catch (error) {
        logger.error({ message: "Error fetching all users", error: error.message, stack: error.stack });
        res.status(500).json({ error: "Server Error" });
    }
};

export const updateUserRole = async (req, res) => {
    logger.info(`Updating role for user ${req.body.userId} to ${req.body.role}`);
    try {
        const { userId, role } = req.body;
        const user = await UserQuiz.findById(userId);

        if (!user) {
            logger.warn(`User not found: ${userId} when updating role`);
            return res.status(404).json({ message: "User not found" });
        }
        user.role = role;
        await user.save();
        // Issue new token with updated role
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        logger.info(`Successfully updated role for user ${userId} to ${role}`);
        res.json({
            message: `Role updated to ${role}`,
            token, // ✅ must be this
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }catch (error) {
        logger.error({ message: `Error updating role for user ${req.body.userId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Logout user
export const logoutUser = async (req, res) => {
    logger.info(`User ${req.user?.id} attempting to logout`);
    try {
        if (!req.user?.id) {
            logger.warn("Logout attempted without valid user ID");
            return res.status(401).json({ message: "Not authenticated" });
        }

        const user = await UserQuiz.findById(req.user.id);
        if (!user) {
            logger.warn(`User not found for logout: ${req.user.id}`);
            return res.status(404).json({ message: "User not found" });
        }

        // ✅ Update online status and last seen on logout
        user.isOnline = false;
        user.lastSeen = new Date();
        await user.save();

        logger.info(`User ${req.user.id} logged out successfully`);
        res.json({
            message: "Logout successful",
            lastSeen: user.lastSeen
        });
    } catch (error) {
        logger.error({ message: "Error during logout", error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// ✅ Update selected theme
export const updateUserTheme = async (req, res) => {
    logger.info(`Updating theme for user ${req.params.id} to ${req.body.theme}`);
    try {
        const { id } = req.params;
        const { theme } = req.body;

        const user = await UserQuiz.findById(id);
        if (!user) {
            logger.warn(`User not found: ${id} when updating theme`);
            return res.status(404).json({ error: "User not found" });
        }

        // Allow "Default" theme without validation, validate others
        if (theme !== "Default" && !user.unlockedThemes.includes(theme)) {
            logger.warn(`User ${id} attempted to set theme to ${theme} which is not unlocked`);
            return res.status(400).json({ error: "Theme not unlocked yet" });
        }

        user.selectedTheme = theme;
        await user.save();

        logger.info(`Successfully updated theme for user ${id} to ${theme}`);
        res.json({ message: "Theme updated", selectedTheme: user.selectedTheme });
    } catch (err) {
        logger.error({ message: `Error updating theme for user ${req.params.id}`, error: err.message, stack: err.stack });
        res.status(500).json({ error: "Error updating theme" });
    }
};
