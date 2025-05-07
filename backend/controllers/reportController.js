import Report from "../models/Report.js";
import moment from "moment";
import UserQuiz from "../models/User.js";
import XPLog from "../models/XPLog.js";

export async function getReports(req, res) {
    const reports = await Report.find();
    res.json(reports);
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
        10: "nord",
        12: "solarized-light",
        14: "solarized-dark",
        16: "monokai",
        18: "one-dark",
        20: "gruvbox-dark",
        22: "gruvbox-light",
        24: "oceanic",
        26: "synthwave",
        28: "night-owl",
        30: "tokyo-night",
        32: "ayu-light"
    };

    for (const [threshold, themeName] of Object.entries(unlockThemeAtLevels)) {
        if (user.level >= Number(threshold) && !user.unlockedThemes.includes(themeName)) {
            user.unlockedThemes.push(themeName);
        }
    }
};

export async function createReport(req, res) {
    try {
        const { username, quizName, score, total, questions } = req.body;

        if (!username || !quizName || !questions || questions.length === 0) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const report = new Report({ username, quizName, score, total, questions });
        await report.save();

        const user = await UserQuiz.findOne({ name: username });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
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

        await new XPLog({ user: user._id, xp: xpGained }).save();

        // 🔥 Daily quiz streak bonus
        const today = new Date().setHours(0, 0, 0, 0);
        const lastQuiz = user.lastQuizDate ? new Date(user.lastQuizDate).setHours(0, 0, 0, 0) : null;

        if (lastQuiz !== today) {
            if (lastQuiz === today - 86400000) {
                user.quizStreak += 1;
            } else {
                user.quizStreak = 1;
            }

            user.lastQuizDate = new Date();

            const quizBonusXP = 20;
            totalXPGained += quizBonusXP;

            await new XPLog({ user: user._id, xp: quizBonusXP }).save();
        }

        console.log("XP before:", user.xp, "Level:", user.level, "Needed:", user.level * 100);

        // 🎓 Update XP and level using totalXP method
        user.xp += totalXPGained;
        user.totalXP = (user.totalXP || 0) + totalXPGained;

        // Recalculate level from XP
        let xpForNext = user.level * 100;
        while (user.xp >= xpForNext) {
            user.xp -= xpForNext;
            user.level += 1;
            xpForNext = user.level * 100;

            unlockThemesForLevel(user);
        }

        console.log("XP after:", user.xp, "Level:", user.level, "Needed:", user.level * 100);

        await user.save();

        res.status(201).json({ message: "Report saved and bonuses applied!", report });
    } catch (error) {
        console.error("Error saving report:", error);
        res.status(500).json({ message: "Error saving report", error: error.message });
    }
}



export const getReportsUser = async (req, res) => {
    try {
        const username = req.query.username;
        const reports = await Report.find(username ? { username } : {}).lean();
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving reports", error });
    }
};

export const getReportsUserID = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await Report.findById(id);

        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }

        res.json(report);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving report", error });
    }
};

export const deleteReport = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: "Report ID is required" });
        }

        const reportItem = await Report.findById(id);

        if (!reportItem) {
            return res.status(404).json({ message: "Report not found" });
        }

        await Report.findByIdAndDelete(id);
        return res.status(200).json({ message: "Report deleted successfully!" });

    } catch (error) {
        console.error("Error deleting Report:", error);
        res.status(500).json({ message: "Error deleting Report", error: error.message });
    }
};

// ✅ Get Top Scorers of the Week
export async function getTopScorers(req, res) {
    try {
        const { period } = req.query;
        let startDate;

        if (period === "week") {
            startDate = moment().subtract(7, "days").startOf("day").toDate();
        } else if (period === "month") {
            startDate = moment().subtract(30, "days").startOf("day").toDate();
        } else {
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

        res.json(topScorers);
    } catch (error) {
        console.error("Error fetching top scorers:", error);
        res.status(500).json({ message: "Internal Server Error", error });
    }
}