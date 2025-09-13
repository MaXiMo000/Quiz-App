import UserQuiz from "../models/User.js";
import XPLog from "../models/XPLog.js";
import logger from "../utils/logger.js";

// Debug endpoint to check user XP and recent XP logs
export const debugUserXP = async (req, res) => {
    logger.info(`Debugging XP for user ${req.params.userId}`);
    try {
        const { userId } = req.params;

        // Get user data
        const user = await UserQuiz.findById(userId);
        if (!user) {
            logger.warn(`User not found with ID: ${userId} for XP debug`);
            return res.status(404).json({ error: "User not found" });
        }

        // Get recent XP logs for this user
        const xpLogs = await XPLog.find({ user: userId })
            .sort({ date: -1 })
            .limit(10);

        // Calculate total XP from logs
        const totalXPFromLogs = await XPLog.aggregate([
            { $match: { user: userId } },
            { $group: { _id: null, totalXP: { $sum: "$xp" } } }
        ]);

        const calculatedTotalXP = totalXPFromLogs[0]?.totalXP || 0;

        logger.info(`Successfully debugged XP for user ${userId}`);
        res.json({
            user: {
                _id: user._id,
                name: user.name,
                xp: user.xp,
                totalXP: user.totalXP,
                level: user.level,
                loginStreak: user.loginStreak,
                quizStreak: user.quizStreak,
                lastLogin: user.lastLogin,
                lastQuizDate: user.lastQuizDate
            },
            recentXPLogs: xpLogs,
            calculatedTotalXP,
            xpMismatch: calculatedTotalXP !== (user.totalXP || 0),
            debug: {
                currentTime: new Date(),
                userCreated: user.createdAt,
                xpLogsCount: xpLogs.length
            }
        });
    } catch (error) {
        logger.error({ message: `Error debugging XP for user ${req.params.userId}`, error: error.message, stack: error.stack });
        res.status(500).json({ error: "Server error", details: error.message });
    }
};

// Reset user XP (for testing purposes only - remove in production)
export const resetUserXP = async (req, res) => {
    logger.warn(`Attempting to reset XP for user ${req.params.userId}`);
    try {
        const { userId } = req.params;

        const user = await UserQuiz.findById(userId);
        if (!user) {
            logger.error(`User not found with ID: ${userId} for XP reset`);
            return res.status(404).json({ error: "User not found" });
        }

        // Reset XP data
        user.xp = 0;
        user.totalXP = 0;
        user.level = 1;
        user.loginStreak = 0;
        user.quizStreak = 0;
        user.lastLogin = null;
        user.lastQuizDate = null;

        await user.save();

        // Optionally clear XP logs (uncomment if needed)
        // await XPLog.deleteMany({ user: userId });

        logger.warn(`Successfully reset XP for user ${userId}`);
        res.json({ message: "User XP reset successfully", user });
    } catch (error) {
        logger.error({ message: `Error resetting XP for user ${req.params.userId}`, error: error.message, stack: error.stack });
        res.status(500).json({ error: "Server error", details: error.message });
    }
};

// Fix Google OAuth users missing fields
export const fixGoogleOAuthUsers = async (req, res) => {
    logger.info("Attempting to fix Google OAuth users with missing fields");
    try {
        // Find users that might be Google OAuth users (no password field or missing totalXP)
        const usersToFix = await UserQuiz.find({
            $or: [
                { totalXP: { $exists: false } },
                { totalXP: null },
                { quizStreak: { $exists: false } },
                { lastLogin: { $exists: false } },
                { lastQuizDate: { $exists: false } }
            ]
        });

        let fixedCount = 0;
        for (const user of usersToFix) {
            let needsSave = false;

            if (typeof user.totalXP === "undefined" || user.totalXP === null) {
                user.totalXP = user.xp || 0;
                needsSave = true;
            }

            if (typeof user.quizStreak === "undefined" || user.quizStreak === null) {
                user.quizStreak = 0;
                needsSave = true;
            }

            if (!user.lastLogin) {
                user.lastLogin = null;
                needsSave = true;
            }

            if (!user.lastQuizDate) {
                user.lastQuizDate = null;
                needsSave = true;
            }

            if (needsSave) {
                await user.save();
                fixedCount++;
            }
        }

        logger.info(`Fixed ${fixedCount} Google OAuth users successfully`);
        res.json({
            message: `Fixed ${fixedCount} users successfully`,
            totalFound: usersToFix.length,
            fixedUsers: usersToFix.map(u => ({ name: u.name, email: u.email }))
        });
    } catch (error) {
        logger.error({ message: "Error fixing Google OAuth users", error: error.message, stack: error.stack });
        res.status(500).json({ error: "Server error", details: error.message });
    }
};
