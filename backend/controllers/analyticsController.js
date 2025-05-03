import Report from "../models/Report.js";

// GET /api/analytics/question-stats
export async function getQuestionStats(req, res) {
try {
    const pipeline = [
    { $unwind: "$questions" },
    {
        $group: {
        _id: "$questions.questionText",
        total: { $sum: 1 },
        correct: {
            $sum: {
            $cond: [
                { $eq: ["$questions.userAnswer", "$questions.correctAnswer"] },
                1,
                0
            ]
            }
        },
        totalTime: { $sum: "$questions.answerTime" }
        }
    },
    {
        $project: {
        _id: 0,
        question: "$_id",
        correctPercent: { $multiply: [{ $divide: ["$correct", "$total"] }, 100] },
        avgTime: { $divide: ["$totalTime", "$total"] }
        }
    }
    ];

    const result = await Report.aggregate(pipeline);
    res.json(result);
} catch (error) {
    console.error("Error computing question stats:", error);
    res.status(500).json({ message: "Internal Server Error" });
}
}

// GET /api/analytics/score-trends
export async function getScoreTrends(req, res) {
try {
    const pipeline = [
    {
        $project: {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        score: 1
        }
    },
    {
        $group: {
        _id: "$date",
        avgScore: { $avg: "$score" }
        }
    },
    { $sort: { _id: 1 } },
    {
        $project: {
        _id: 0,
        date: "$_id",
        avgScore: 1
        }
    }
    ];

    const result = await Report.aggregate(pipeline);
    res.json(result);
} catch (error) {
    console.error("Error getting trends:", error);
    res.status(500).json({ message: "Internal Server Error" });
}
}

// GET /api/analytics/topic-heatmap
export async function getTopicHeatmap(req, res) {
try {
    const pipeline = [
    { $unwind: "$questions" },
    {
        $addFields: {
        topic: {
            $switch: {
            branches: [
                { case: { $regexMatch: { input: "$questions.questionText", regex: /physics/i } }, then: "Physics" },
                { case: { $regexMatch: { input: "$questions.questionText", regex: /chemistry/i } }, then: "Chemistry" },
                { case: { $regexMatch: { input: "$questions.questionText", regex: /math/i } }, then: "Math" }
            ],
            default: "General"
            }
        },
        correctFlag: {
            $cond: [
            { $eq: ["$questions.userAnswer", "$questions.correctAnswer"] },
            1,
            0
            ]
        }
        }
    },
    {
        $group: {
        _id: "$topic",
        total: { $sum: 1 },
        correct: { $sum: "$correctFlag" }
        }
    },
    {
        $project: {
        _id: 0,
        tag: "$_id",
        accuracy: { $multiply: [{ $divide: ["$correct", "$total"] }, 100] }
        }
    }
    ];

    const result = await Report.aggregate(pipeline);
    res.json(result);
} catch (error) {
    console.error("Error generating heatmap:", error);
    res.status(500).json({ message: "Internal Server Error" });
}
}