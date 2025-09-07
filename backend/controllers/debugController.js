import UserQuiz from "../models/User.js";
import XPLog from "../models/XPLog.js";
import mongoose from "mongoose";
import { withCachingAndLogging, controllerConfigs, cacheKeyGenerators } from "../utils/controllerUtils.js";
import logger from "../utils/logger.js";

// Debug endpoint to check user XP and recent XP logs
const _debugUserXP = async (req, res) => {
    const { userId } = req.params;
    
    logger.info('Debugging user XP', { 
        context: 'DebugController', 
        operation: 'Debug User XP',
        targetUserId: userId,
        requesterId: req.user?.id 
    });
    
    // Get user data
    const user = await UserQuiz.findById(userId);
    if (!user) {
        logger.warn('User not found for XP debug', { 
            context: 'DebugController', 
            operation: 'Debug User XP',
            targetUserId: userId,
            requesterId: req.user?.id 
        });
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
    const xpMismatch = calculatedTotalXP !== (user.totalXP || 0);

    logger.info('XP debug completed', { 
        context: 'DebugController', 
        operation: 'Debug User XP',
        targetUserId: userId,
        userXP: user.xp,
        totalXP: user.totalXP,
        calculatedTotalXP,
        xpMismatch,
        xpLogsCount: xpLogs.length,
        requesterId: req.user?.id 
    });

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
        xpMismatch,
        debug: {
            currentTime: new Date(),
            userCreated: user.createdAt,
            xpLogsCount: xpLogs.length
        }
    });
};

export const debugUserXP = withCachingAndLogging(_debugUserXP, {
    ...controllerConfigs.public,
    operation: 'Debug User XP',
    cacheTTL: 0, // No caching for debug operations
    logFields: ['params.userId']
});

// Reset user XP (for testing purposes only - remove in production)
const _resetUserXP = async (req, res) => {
    const { userId } = req.params;
    
    logger.warn('Resetting user XP', { 
        context: 'DebugController', 
        operation: 'Reset User XP',
        targetUserId: userId,
        requesterId: req.user?.id 
    });
    
    const user = await UserQuiz.findById(userId);
    if (!user) {
        logger.warn('User not found for XP reset', { 
            context: 'DebugController', 
            operation: 'Reset User XP',
            targetUserId: userId,
            requesterId: req.user?.id 
        });
        return res.status(404).json({ error: "User not found" });
    }

    const oldXP = user.xp;
    const oldTotalXP = user.totalXP;
    const oldLevel = user.level;

    // Reset XP data
    user.xp = 0;
    user.totalXP = 0;
    user.level = 1;
    user.loginStreak = 0;
    user.quizStreak = 0;
    user.lastLogin = null;
    user.lastQuizDate = null;

    await user.save();

    logger.warn('User XP reset completed', { 
        context: 'DebugController', 
        operation: 'Reset User XP',
        targetUserId: userId,
        oldXP,
        oldTotalXP,
        oldLevel,
        requesterId: req.user?.id 
    });

    // Optionally clear XP logs (uncomment if needed)
    // await XPLog.deleteMany({ user: userId });

    res.json({ message: "User XP reset successfully", user });
};

export const resetUserXP = withCachingAndLogging(_resetUserXP, {
    ...controllerConfigs.public,
    operation: 'Reset User XP',
    cacheTTL: 0, // No caching for reset operations
    logFields: ['params.userId']
});

// Fix Google OAuth users missing fields
const _fixGoogleOAuthUsers = async (req, res) => {
    logger.info('Fixing Google OAuth users missing fields', { 
        context: 'DebugController', 
        operation: 'Fix Google OAuth Users',
        requesterId: req.user?.id 
    });
    
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

        if (typeof user.totalXP === 'undefined' || user.totalXP === null) {
            user.totalXP = user.xp || 0;
            needsSave = true;
        }

        if (typeof user.quizStreak === 'undefined' || user.quizStreak === null) {
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

    logger.info('Google OAuth users fix completed', { 
        context: 'DebugController', 
        operation: 'Fix Google OAuth Users',
        totalFound: usersToFix.length,
        fixedCount,
        requesterId: req.user?.id 
    });

    res.json({ 
        message: `Fixed ${fixedCount} users successfully`,
        totalFound: usersToFix.length,
        fixedUsers: usersToFix.map(u => ({ name: u.name, email: u.email }))
    });
};

export const fixGoogleOAuthUsers = withCachingAndLogging(_fixGoogleOAuthUsers, {
    ...controllerConfigs.public,
    operation: 'Fix Google OAuth Users',
    cacheTTL: 0, // No caching for fix operations
    requireAuth: true // Only admins should run fixes
});
