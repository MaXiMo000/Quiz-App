import Report from "../models/Report.js";
import moment from "moment";
import UserQuiz from "../models/User.js";
import XPLog from "../models/XPLog.js";
import mongoose from "mongoose";
import { unlockThemesForLevel } from "../utils/themeUtils.js";
import AppError from "../utils/AppError.js";

export async function getReports(req, res, next) {
    try {
        const reports = await Report.find();
        res.json(reports);
    } catch (error) {
        next(error);
    }
}

export async function createReport(req, res, next) {
    try {
        const { username, quizName, score, total, questions } = req.body;
        const userId = req.user?.id; // Get user ID from JWT token

        if (!username || !quizName || !questions || questions.length === 0) {
            return next(new AppError("Missing required fields", 400));
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
                console.error("Invalid user ID format:", userId);
            }
        }
        
        // Fallback to username lookup if user not found by ID
        if (!user) {
            // Try different name matching strategies for Google OAuth users
            user = await UserQuiz.findOne({ name: username });
            
            if (!user) {
                // Try case-insensitive search
                user = await UserQuiz.findOne({ 
                    name: { $regex: new RegExp(`^${username}$`, 'i') } 
                });
            }
            
            if (!user) {
                // Try trimmed version
                user = await UserQuiz.findOne({ name: username.trim() });
            }
            
        }
        
        if (!user) {
            return next(new AppError(`User not found with identifier: ${userId || username}`, 404));
        }

        // ✅ Ensure totalXP field exists for all users (especially Google OAuth users)
        if (typeof user.totalXP === 'undefined' || user.totalXP === null) {
            user.totalXP = user.xp || 0;
        }

        // 🏅 Award badges
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

        await new XPLog({ user: user._id, xp: xpGained, source: 'quiz' }).save();

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

            await new XPLog({ user: user._id, xp: quizBonusXP, source: 'streak' }).save();
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

        res.status(201).json({ message: "Report saved and bonuses applied!", report });
    } catch (error) {
        next(error);
    }
}

export const getReportsUser = async (req, res, next) => {
    try {
        const username = req.query.username;
        const reports = await Report.find(username ? { username } : {}).lean();
        res.json(reports);
    } catch (error) {
        next(error);
    }
};

export const getReportsUserID = async (req, res, next) => {
    try {
        const { id } = req.params;
        const report = await Report.findById(id);

        if (!report) {
            return next(new AppError("Report not found", 404));
        }

        res.json(report);
    } catch (error) {
        next(error);
    }
};

export const deleteReport = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            return next(new AppError("Report ID is required", 400));
        }

        const reportItem = await Report.findById(id);

        if (!reportItem) {
            return next(new AppError("Report not found", 404));
        }

        await Report.findByIdAndDelete(id);
        return res.status(200).json({ message: "Report deleted successfully!" });

    } catch (error) {
        next(error);
    }
};

// ✅ Get Top Scorers of the Week
export async function getTopScorers(req, res, next) {
    try {
        const { period } = req.query;
        let startDate;

        if (period === "week") {
            startDate = moment().subtract(7, "days").startOf("day").toDate();
        } else if (period === "month") {
            startDate = moment().subtract(30, "days").startOf("day").toDate();
        } else {
            return next(new AppError("Invalid period. Use 'week' or 'month'.", 400));
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

        res.json(topScorers);
    } catch (error) {
        next(error);
    }
}