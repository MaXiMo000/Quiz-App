import Report from "../models/Report.js";
import moment from "moment";
import UserQuiz from "../models/User.js";

export async function getReports(req, res) {
    const reports = await Report.find();
    res.json(reports);
}

export async function createReport(req, res) {
    try {
        const { username, quizName, score, total, questions} = req.body;

        if (!username || !quizName || !questions || questions.length === 0) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const report = new Report({ username, quizName, score, total, questions});
        await report.save();

        const user = await UserQuiz.findOne({ name: username });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user) {
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
        await user.save();
        }
        res.status(201).json({ message: "Report saved and badges awarded!", report });
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