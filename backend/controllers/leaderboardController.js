// backend/controllers/leaderboardController.js (new)
import XPLog from "../models/XPLog.js";
import UserQuiz from "../models/User.js";
import { withCachingAndLogging, controllerConfigs, cacheKeyGenerators } from "../utils/controllerUtils.js";
import logger from "../utils/logger.js";
const _getWeeklyXP = async (req, res) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    // Aggregate total XP per user for last 7 days
    const result = await XPLog.aggregate([
        { $match: { date: { $gte: weekAgo } } },
        { $group: { _id: "$user", totalXP: { $sum: "$xp" } } },
        { $sort: { totalXP: -1 } },
        { $limit: 20 }
    ]);
    // Attach username and update badges
    const leaderboard = [];
    for (let i = 0; i < result.length; i++) {
        const user = await UserQuiz.findById(result[i]._id);
        if (user) {
            leaderboard.push({ username: user.name, xp: result[i].totalXP });
            if (i === 0 && !user.badges.includes("Weekly Champion")) {
                user.badges.push("Weekly Champion");
            }
            if (i < 10 && !user.badges.includes("Weekly Top 10")) {
                user.badges.push("Weekly Top 10");
            }
            await user.save();
        }
    }
    res.json(leaderboard);
};

export const getWeeklyXP = withCachingAndLogging(_getWeeklyXP, {
    ...controllerConfigs.analytics,
    operation: 'Get Weekly XP Leaderboard',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: () => `leaderboard:weekly:${new Date().toISOString().split('T')[0]}`
});
const _getMonthlyXP = async (req, res) => {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const result = await XPLog.aggregate([
        { $match: { date: { $gte: monthAgo } } },
        { $group: { _id: "$user", totalXP: { $sum: "$xp" } } },
        { $sort: { totalXP: -1 } },
        { $limit: 20 }
    ]);
    const leaderboard = [];
    for (let i = 0; i < result.length; i++) {
        const user = await UserQuiz.findById(result[i]._id);
        if (user) {
            leaderboard.push({ username: user.name, xp: result[i].totalXP });
            if (i === 0 && !user.badges.includes("Monthly Champion")) {
                user.badges.push("Monthly Champion");
            }
            if (i < 10 && !user.badges.includes("Monthly Top 10")) {
                user.badges.push("Monthly Top 10");
            }
            await user.save();
        }
    }
    res.json(leaderboard);
};

export const getMonthlyXP = withCachingAndLogging(_getMonthlyXP, {
    ...controllerConfigs.analytics,
    operation: 'Get Monthly XP Leaderboard',
    cacheTTL: 600, // 10 minutes
    cacheKeyGenerator: () => `leaderboard:monthly:${new Date().toISOString().substring(0, 7)}`
});
const _getAllTimeXP = async (req, res) => {
    const result = await XPLog.aggregate([
        { $group: { _id: "$user", totalXP: { $sum: "$xp" } } },
        { $sort: { totalXP: -1 } },
        { $limit: 20 }
    ]);
    const leaderboard = [];
    for (let i = 0; i < result.length; i++) {
        const user = await UserQuiz.findById(result[i]._id);
        if (user) {
            leaderboard.push({ username: user.name, xp: result[i].totalXP });
            if (i === 0 && !user.badges.includes("All-Time Champion")) {
                user.badges.push("All-Time Champion");
            }
            if (i < 10 && !user.badges.includes("All-Time Top 10")) {
                user.badges.push("All-Time Top 10");
            }
            await user.save();
        }
    }
    res.json(leaderboard);
};

export const getAllTimeXP = withCachingAndLogging(_getAllTimeXP, {
    ...controllerConfigs.analytics,
    operation: 'Get All-Time XP Leaderboard',
    cacheTTL: 900, // 15 minutes
    cacheKeyGenerator: () => 'leaderboard:all-time'
});