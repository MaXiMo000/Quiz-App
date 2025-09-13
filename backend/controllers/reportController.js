import Report from "../models/Report.js";
import moment from "moment";
import UserQuiz from "../models/User.js";
import XPLog from "../models/XPLog.js";
import mongoose from "mongoose";
import { createInitialReviewSchedules } from "../services/reviewScheduler.js";
import logger from "../utils/logger.js";

export async function getReports(req, res) {
    logger.info("Fetching all reports");
    try {
        const reports = await Report.find();
        logger.info(`Successfully fetched ${reports.length} reports`);
        res.json(reports);
    } catch (error) {
        logger.error({ message: "Error fetching reports", error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error fetching reports", error });
    }
}

export const unlockThemesForLevel = (user) => {
    const unlockThemeAtLevels = {
        2: "Light",
        3: "Dark",
        5: "Galaxy",
        7: "Forest",
        10: "Sunset",
        15: "Neon",
        4: "material-light",
        6: "material-dark",
        8: "dracula",
        12: "nord",
        14: "solarized-light",
        16: "solarized-dark",
        18: "monokai",
        20: "one-dark",
        22: "gruvbox-dark",
        24: "gruvbox-light",
        26: "oceanic",
        28: "synthwave",
        30: "night-owl",
        32: "tokyo-night",
        34: "ayu-light"
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
            return res.status(400).json({ message: "Missing required fields" });
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
                user = await UserQuiz.findOne({
                    name: { $regex: new RegExp(`^${username}$`, "i") }
                });
            }

            if (!user) {
                // Try trimmed version
                user = await UserQuiz.findOne({ name: username.trim() });
            }

        }

        if (!user) {
            logger.error(`User not found - userId: ${userId}, username: ${username}`);
            return res.status(404).json({ message: "User not found" });
        }

        // ✅ Ensure totalXP field exists for all users (especially Google OAuth users)
        if (typeof user.totalXP === "undefined" || user.totalXP === null) {
            user.totalXP = user.xp || 0;
        }

        // 🏅 Award badges
        if (!user.badges) {
            user.badges = [];
        }
        if (score === total && !user.badges.includes("Perfect Score")) {
            user.badges.push("Perfect Score");
        }

        const validQuestions = questions.filter(q => typeof q.answerTime === "number");
        if (validQuestions.length > 0) {
            const avgTime = validQuestions.reduce((sum, q) => sum + q.answerTime, 0) / validQuestions.length;
            if (avgTime < 10 && !user.badges.includes("Speed Genius")) {
                user.badges.push("Speed Genius");
            }
        }

        // 🎯 XP for score
        const xpGained = score * 10;
        let totalXPGained = xpGained;

        await new XPLog({ user: user._id, xp: xpGained, source: "quiz" }).save();

        // 🔥 Daily quiz streak bonus
        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const lastQuiz = user.lastQuizDate ? new Date(user.lastQuizDate) : null;
        const lastQuizMidnight = lastQuiz ? new Date(lastQuiz.getFullYear(), lastQuiz.getMonth(), lastQuiz.getDate()) : null;

        // Check if this is a new day for quiz taking
        const isNewQuizDay = !lastQuizMidnight || todayMidnight.getTime() !== lastQuizMidnight.getTime();

        if (isNewQuizDay) {
            // Check if it's consecutive day for streak
            const oneDayAgo = new Date(todayMidnight.getTime() - 24 * 60 * 60 * 1000);

            if (lastQuizMidnight && lastQuizMidnight.getTime() === oneDayAgo.getTime()) {
                user.quizStreak += 1;
            } else {
                user.quizStreak = 1;
            }

            user.lastQuizDate = new Date();

            const quizBonusXP = 20;
            totalXPGained += quizBonusXP;

            await new XPLog({ user: user._id, xp: quizBonusXP, source: "streak" }).save();
        }

        // 🎓 Update XP and level using proper totalXP method
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

        logger.info(`Report saved and bonuses applied for user ${username}`);
        res.status(201).json({ message: "Report saved and bonuses applied!", report });
    } catch (error) {
        logger.error({ message: "Error saving report", error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error saving report", error: error.message });
    }
}



export const getReportsUser = async (req, res) => {
    logger.info(`Fetching reports for user ${req.query.username || "all users"}`);
    try {
        const username = req.query.username;
        const reports = await Report.find(username ? { username } : {}).lean();
        logger.info(`Successfully fetched ${reports.length} reports for user ${username || "all users"}`);
        res.json(reports);
    } catch (error) {
        logger.error({ message: `Error retrieving reports for user ${req.query.username || "all users"}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error retrieving reports", error });
    }
};

export const getReportsUserID = async (req, res) => {
    logger.info(`Fetching report by ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        const report = await Report.findById(id);

        if (!report) {
            logger.warn(`Report not found: ${id}`);
            return res.status(404).json({ message: "Report not found" });
        }

        logger.info(`Successfully fetched report ${id}`);
        res.json(report);
    } catch (error) {
        logger.error({ message: `Error retrieving report ${req.params.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error retrieving report", error });
    }
};

export const deleteReport = async (req, res) => {
    logger.info(`Attempting to delete report with ID: ${req.params.id}`);
    try {
        const { id } = req.params;

        if (!id) {
            logger.warn("Report ID is required for deletion");
            return res.status(400).json({ message: "Report ID is required" });
        }

        const reportItem = await Report.findById(id);

        if (!reportItem) {
            logger.warn(`Report not found for deletion with ID: ${id}`);
            return res.status(404).json({ message: "Report not found" });
        }

        await Report.findByIdAndDelete(id);
        logger.info(`Report with ID ${id} deleted successfully`);
        return res.status(200).json({ message: "Report deleted successfully!" });

    } catch (error) {
        logger.error({ message: `Error deleting report with ID: ${req.params.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error deleting Report", error: error.message });
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
            return res.status(400).json({ message: "Invalid period. Use 'week' or 'month'." });
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
        res.json(topScorers);
    } catch (error) {
        logger.error({ message: `Error fetching top scorers for period: ${req.query.period}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Internal Server Error", error });
    }
}
