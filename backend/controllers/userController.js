import UserQuiz from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import XPLog from "../models/XPLog.js";
import { unlockThemesForLevel } from "../utils/themeUtils.js";
import logger from "../utils/logger.js";

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

        const newUser = new UserQuiz({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword
        });
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

            // ✅ Award XP bonus
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
        }

        // ≫≫ THEME UNLOCKING ≪≪
        unlockThemesForLevel(user);

        await user.save();

        // ✅ Generate token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        logger.info(`User logged in successfully: ${email}`);
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
