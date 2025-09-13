// backend/controllers/leaderboardController.js (new)
import XPLog from "../models/XPLog.js";
import UserQuiz from "../models/User.js";
import logger from "../utils/logger.js";

export const getWeeklyXP = async (req, res) => {
    logger.info("Fetching weekly XP leaderboard");
    try {
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
                if (!user.badges) {
                    user.badges = [];
                }
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
        logger.info("Successfully fetched weekly XP leaderboard");
        res.json(leaderboard);
    } catch (error) {
        logger.error({ message: "Error fetching weekly XP leaderboard", error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};
export const getMonthlyXP = async (req, res) => {
    logger.info("Fetching monthly XP leaderboard");
    try {
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
                if (!user.badges) {
                    user.badges = [];
                }
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
        logger.info("Successfully fetched monthly XP leaderboard");
        res.json(leaderboard);
    } catch (error) {
        logger.error({ message: "Error fetching monthly XP leaderboard", error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};
export const getAllTimeXP = async (req, res) => {
    logger.info("Fetching all-time XP leaderboard");
    try {
        const result = await XPLog.aggregate([
            { $group: { _id: "$user", totalXP: { $sum: "$xp" } } },
            { $sort: { totalXP: -1 } },
            { $limit: 20 }
        ]);
        const leaderboard = [];
        for (let i = 0; i < result.length; i++) {
            const user = await UserQuiz.findById(result[i]._id);
            if (user) {
                if (!user.badges) {
                    user.badges = [];
                }
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
        logger.info("Successfully fetched all-time XP leaderboard");
        res.json(leaderboard);
    } catch (error) {
        logger.error({ message: "Error fetching all-time XP leaderboard", error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};
