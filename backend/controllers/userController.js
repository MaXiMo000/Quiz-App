import UserQuiz from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import XPLog from "../models/XPLog.js";
import { unlockThemesForLevel } from "../utils/themeUtils.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("🚫 JWT_SECRET is missing from environment variables! This is required for security.");
}

// Register user
export const registerUser = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await UserQuiz.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return next(new AppError("User already exists", 400));
        }

        const salt = await bcrypt.genSalt(12); // Increased salt rounds for better security
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new UserQuiz({ 
            name: name.trim(), 
            email: email.toLowerCase().trim(), 
            password: hashedPassword 
        });
        await newUser.save();

        res.status(201).json({ success: true, message: "User registered successfully!" });
    } catch (error) {
        next(error);
    }
};

// Login user
export const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await UserQuiz.findOne({ email });
        if (!user) {
            return next(new AppError("User not found", 404));
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return next(new AppError("Invalid credentials", 401));
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
            await new XPLog({ user: user._id, xp: loginBonusXP, source: 'login' }).save();

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

        // Ensure themes are unlocked for the current level one last time
        unlockThemesForLevel(user);

        await user.save();

        // ✅ Generate token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

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
        next(error);
    }
};


// Get all users (admin-only)
export const getAllUsers = async (req, res, next) => {
    try {
        const users = await UserQuiz.find();
        res.json(users);
    } catch (error) {
        next(error);
    }
};

export const updateUserRole = async (req, res, next) => {
    try {
        const { userId, role } = req.body;
        const user = await UserQuiz.findById(userId);

        if (!user) {
            return next(new AppError("User not found", 404));
        }
        user.role = role;
        await user.save();
        // Issue new token with updated role
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

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
    } catch (error) {
        next(error);
    }
};

// ✅ Update selected theme
export const updateUserTheme = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { theme } = req.body;

        const user = await UserQuiz.findById(id);
        if (!user) {
            return next(new AppError("User not found", 404));
        }

        // Allow "Default" theme without validation, validate others
        if (theme !== "Default" && !user.unlockedThemes.includes(theme)) {
            return next(new AppError("Theme not unlocked yet", 400));
        }

        user.selectedTheme = theme;
        await user.save();

        res.json({ message: "Theme updated", selectedTheme: user.selectedTheme });
    } catch (err) {
        next(err);
    }
};
