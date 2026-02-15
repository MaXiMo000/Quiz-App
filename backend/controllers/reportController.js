import Report from "../models/Report.js";
import moment from "moment";
import UserQuiz from "../models/User.js";
import XPLog from "../models/XPLog.js";
import mongoose from "mongoose";
import { createInitialReviewSchedules } from "../services/reviewScheduler.js";
import logger from "../utils/logger.js";
import AppError from "../utils/AppError.js";
import {
    sendSuccess,
    sendError,
    sendNotFound,
    sendValidationError,
    sendCreated
} from "../utils/responseHelper.js";

export async function getReports(req, res) {
    logger.info("Fetching all reports");
    try {
        const reports = await Report.find();
        logger.info(`Successfully fetched ${reports.length} reports`);
        return sendSuccess(res, reports, `Successfully fetched ${reports.length} reports`);
    } catch (error) {
        logger.error({ message: "Error fetching reports", error: error.message, stack: error.stack });
        throw new AppError("Failed to fetch reports", 500);
    }
}

export const unlockThemesForLevel = (user) => {
    const unlockThemeAtLevels = {
        2: "Light",
        3: "Dark",
        4: "material-light",
        5: "Galaxy",
        6: "material-dark",
        7: "Forest",
        8: "dracula",
        10: "Sunset",
        12: "nord",
        14: "solarized-light",
        15: "Neon",
        16: "solarized-dark",
        18: "monokai",
        20: "one-dark",
        22: "gruvbox-dark",
        24: "gruvbox-light",
        26: "oceanic",
        28: "synthwave",
        30: "night-owl",
        32: "tokyo-night",
        34: "ayu-light",
        36: "catppuccin-mocha",
        38: "catppuccin-latte",
        40: "rose-pine",
        42: "everforest",
        44: "kanagawa",
        46: "github-dark",
        48: "github-light"
    };

    for (const [threshold, themeName] of Object.entries(unlockThemeAtLevels)) {
        if (user.level >= Number(threshold) && !user.unlockedThemes.includes(themeName)) {
            user.unlockedThemes.push(themeName);
        }
    }
};

export async function createReport(req, res) {
    logger.info(`Creating report for user ${req.body.username}`);
    try {
        const { username, quizName, score, total, questions } = req.body;
        const userId = req.user?.id; // Get user ID from JWT token

        if (!username || !quizName || !questions || questions.length === 0) {
            logger.warn("Missing required fields for report creation");
            const errors = {};
            if (!username) errors.username = "Username is required";
            if (!quizName) errors.quizName = "Quiz name is required";
            if (!questions || questions.length === 0) errors.questions = "Questions are required";
            return sendValidationError(res, errors);
        }

        const report = new Report({ username, quizName, score, total, questions });
        await report.save();

        // ✅ Use user ID from JWT token first, fallback to username lookup
        let user;
        if (userId) {
            // Validate ObjectId format
            if (mongoose.Types.ObjectId.isValid(userId)) {
                user = await UserQuiz.findById(userId);
            } else {
                logger.error(`Invalid user ID format: ${userId}`);
            }
        }

        // Fallback to username lookup if user not found by ID
        if (!user) {
            // Try different name matching strategies for Google OAuth users
            user = await UserQuiz.findOne({ name: username });

            if (!user) {
                // Try case-insensitive search
                // SECURITY: Escape special regex characters to prevent ReDoS attacks
                const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                user = await UserQuiz.findOne({
                    name: { $regex: new RegExp(`^${escapedUsername}$`, "i") }
                });
            }

            if (!user) {
                // Try trimmed version
                user = await UserQuiz.findOne({ name: username.trim() });
            }

        }

        if (!user) {
            logger.error(`User not found - userId: ${userId}, username: ${username}`);
            return sendNotFound(res, "User");
        }

        // ✅ Ensure totalXP field exists for all users (especially Google OAuth users)
        if (typeof user.totalXP === "undefined" || user.totalXP === null) {
            user.totalXP = user.xp || 0;
        }

        // 🏅 Award badges
        if (!user.badges) {
            user.badges = [];
        }
        let earnedBadges = [];
        if (score === total && !user.badges.includes("Perfect Score")) {
            user.badges.push("Perfect Score");
            earnedBadges.push("Perfect Score");
        }

        const validQuestions = questions.filter(q => typeof q.answerTime === "number");
        if (validQuestions.length > 0) {
            const avgTime = validQuestions.reduce((sum, q) => sum + q.answerTime, 0) / validQuestions.length;
            if (avgTime < 10 && !user.badges.includes("Speed Genius")) {
                user.badges.push("Speed Genius");
                earnedBadges.push("Speed Genius");
            }
        }

        // ✅ Create achievement notifications for earned badges
        if (earnedBadges.length > 0) {
            try {
                const { createActivity } = await import("../routes/activityRoutes.js");
                const { createNotification } = await import("../controllers/notificationController.js");

                for (const badgeName of earnedBadges) {
                    await createActivity(user._id, "achievement_earned", {
                        achievementName: badgeName,
                        quizName
                    });

                    await createNotification(user._id, "achievement", "Achievement Earned!", `You earned the "${badgeName}" badge!`, {
                        achievementName: badgeName,
                        quizName
                    });
                }
            } catch (error) {
                logger.error({ message: "Error creating achievement activity/notification", error: error.message });
            }
        }

        // 🎯 XP for score
        const xpGained = score * 10;
        let totalXPGained = xpGained;

        // Create XPLog entry with UTC date to match streak queries
        const today = new Date();
        const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const todayMidnight = new Date(todayUTC);
        todayMidnight.setUTCHours(0, 0, 0, 0);
        await new XPLog({ user: user._id, xp: xpGained, source: "quiz", date: todayMidnight }).save();

        // 🔥 Daily quiz streak bonus - use UTC dates for consistency with streakController
        // Note: Streak updates are primarily handled by updateDailyActivity endpoint
        // This is kept for backward compatibility but updateDailyActivity should be the source of truth
        const lastQuiz = user.lastQuizDate ? new Date(user.lastQuizDate) : null;
        let lastQuizMidnight = null;
        if (lastQuiz) {
            lastQuizMidnight = new Date(Date.UTC(lastQuiz.getUTCFullYear(), lastQuiz.getUTCMonth(), lastQuiz.getUTCDate()));
            lastQuizMidnight.setUTCHours(0, 0, 0, 0);
        }

        // Check if this is a new day for quiz taking
        const isNewQuizDay = !lastQuizMidnight || todayMidnight.getTime() !== lastQuizMidnight.getTime();

        if (isNewQuizDay) {
            // Check if it's consecutive day for streak
            const oneDayAgo = new Date(todayMidnight.getTime() - 24 * 60 * 60 * 1000);

            if (lastQuizMidnight && lastQuizMidnight.getTime() === oneDayAgo.getTime()) {
                user.quizStreak = (user.quizStreak || 0) + 1;
            } else {
                user.quizStreak = 1;
            }

            user.lastQuizDate = new Date();

            const quizBonusXP = 20;
            totalXPGained += quizBonusXP;

            // Create streak bonus XPLog entry with UTC date
            await new XPLog({ user: user._id, xp: quizBonusXP, source: "streak", date: todayMidnight }).save();
        }

        // 🎓 Update XP and level using proper totalXP method
        const oldLevel = user.level;
        user.xp += totalXPGained;
        user.totalXP = (user.totalXP || 0) + totalXPGained;

        // Recalculate level from current XP (don't subtract, just check thresholds)
        let currentLevelXP = user.xp;
        let xpForNext = user.level * 100;
        while (currentLevelXP >= xpForNext) {
            currentLevelXP -= xpForNext;
            user.level += 1;
            xpForNext = user.level * 100;
            unlockThemesForLevel(user);
        }
        user.xp = currentLevelXP; // Set remaining XP for current level

        await user.save();

        // ✅ Create level up notification and activity
        if (user.level > oldLevel) {
            try {
                const { createActivity } = await import("../routes/activityRoutes.js");
                const { createNotification } = await import("../controllers/notificationController.js");

                await createActivity(user._id, "level_up", {
                    level: user.level,
                    oldLevel
                });

                await createNotification(user._id, "level_up", "Level Up!", `Congratulations! You reached level ${user.level}!`, {
                    level: user.level,
                    oldLevel
                });
            } catch (error) {
                logger.error({ message: "Error creating level up activity/notification", error: error.message });
            }
        }

        // 📚 Create review schedules for spaced repetition
        try {
            // Find the quiz to get the questions
            const Quiz = (await import("../models/Quiz.js")).default;
            const quiz = await Quiz.findOne({ title: quizName });
            if (quiz && quiz.questions && quiz.questions.length > 0) {
                await createInitialReviewSchedules(user._id, quiz._id, quiz.questions);
                logger.info(`Created review schedules for user ${user._id} and quiz ${quiz._id}`);
            }
        } catch (reviewError) {
            logger.error({ message: "Error creating review schedules", error: reviewError.message, stack: reviewError.stack });
            // Don't fail the report creation if review schedule creation fails
        }

        // ✅ Create activity and notification for quiz completion
        try {
            const { createActivity } = await import("../controllers/activityController.js");
            const { createNotification } = await import("../controllers/notificationController.js");

            await createActivity(user._id, "quiz_completed", {
                quizId: report._id,
                quizName,
                score,
                total
            });

            await createNotification(user._id, "quiz_completed", "Quiz Completed!", `You completed "${quizName}" with a score of ${score}/${total}`, {
                quizId: report._id,
                quizName,
                score,
                total
            });
        } catch (error) {
            logger.error({ message: "Error creating activity/notification for quiz completion", error: error.message });
            // Don't fail report creation if activity/notification creation fails
        }

        logger.info(`Report saved and bonuses applied for user ${username}`);
        return sendCreated(res, report, "Report saved and bonuses applied!");
    } catch (error) {
        logger.error({ message: "Error saving report", error: error.message, stack: error.stack });
        throw new AppError("Failed to save report", 500);
    }
}



export const getReportsUser = async (req, res) => {
    logger.info(`Fetching reports for user ${req.query.username || "all users"}`);
    try {
        const username = req.query.username;
        const reports = await Report.find(username ? { username } : {}).lean();
        logger.info(`Successfully fetched ${reports.length} reports for user ${username || "all users"}`);

        // Set cache-control headers to prevent browser caching and ensure fresh data
        // Use dynamic ETag to prevent 304 responses
        const etagValue = `"reports-${username}-${Date.now()}-${Math.random().toString(36).substring(7)}"`;
        res.set({
            'Cache-Control': 'private, no-cache, must-revalidate',
            'ETag': etagValue,
            'Last-Modified': new Date().toUTCString(),
            'Pragma': 'no-cache'
        });

        return sendSuccess(res, reports, `Successfully fetched ${reports.length} reports`);
    } catch (error) {
        logger.error({ message: `Error retrieving reports for user ${req.query.username || "all users"}`, error: error.message, stack: error.stack });
        throw new AppError("Failed to retrieve reports", 500);
    }
};

export const getReportsUserID = async (req, res) => {
    logger.info(`Fetching report by ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        const report = await Report.findById(id);

        if (!report) {
            logger.warn(`Report not found: ${id}`);
            return sendNotFound(res, "Report");
        }

        logger.info(`Successfully fetched report ${id}`);
        return sendSuccess(res, report, "Report fetched successfully");
    } catch (error) {
        logger.error({ message: `Error retrieving report ${req.params.id}`, error: error.message, stack: error.stack });
        throw new AppError("Failed to retrieve report", 500);
    }
};

export const deleteReport = async (req, res) => {
    logger.info(`Attempting to delete report with ID: ${req.params.id}`);
    try {
        const { id } = req.params;

        if (!id) {
            logger.warn("Report ID is required for deletion");
            return sendValidationError(res, { id: "Report ID is required" });
        }

        const reportItem = await Report.findById(id);

        if (!reportItem) {
            logger.warn(`Report not found for deletion with ID: ${id}`);
            return sendNotFound(res, "Report");
        }

        await Report.findByIdAndDelete(id);
        logger.info(`Report with ID ${id} deleted successfully`);

        // Ensure no caching headers are set on DELETE responses
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        return sendSuccess(res, null, "Report deleted successfully");

    } catch (error) {
        logger.error({ message: `Error deleting report with ID: ${req.params.id}`, error: error.message, stack: error.stack });
        throw new AppError("Failed to delete report", 500);
    }
};

// ✅ Get Top Scorers of the Week
export async function getTopScorers(req, res) {
    logger.info(`Fetching top scorers for period: ${req.query.period}`);
    try {
        const { period } = req.query;
        let startDate;

        if (period === "week") {
            startDate = moment().subtract(7, "days").startOf("day").toDate();
        } else if (period === "month") {
            startDate = moment().subtract(30, "days").startOf("day").toDate();
        } else {
            logger.warn(`Invalid period for top scorers: ${period}`);
            return sendValidationError(res, { period: "Invalid period. Use 'week' or 'month'." });
        }

        const topScorers = await Report.aggregate([
            {
                $match: { createdAt: { $gte: startDate } }
            },
            {
                $sort: { score: -1 }
            },
            {
                $group: {
                    _id: "$quizName",
                    topUsers: {
                        $push: {
                            username: "$username",
                            score: "$score",
                            total: "$total"  // Include the total score
                        }
                    }
                }
            },
            {
                $project: {
                    quizName: "$_id",
                    topUsers: { $slice: ["$topUsers", 5] },
                    _id: 0
                }
            }
        ]);

        logger.info(`Successfully fetched top scorers for period: ${period}`);
        return sendSuccess(res, topScorers, "Top scorers fetched successfully");
    } catch (error) {
        logger.error({ message: `Error fetching top scorers for period: ${req.query.period}`, error: error.message, stack: error.stack });
        throw new AppError("Failed to retrieve top scorers", 500);
    }
}
