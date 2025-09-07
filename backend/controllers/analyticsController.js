import Report from "../models/Report.js";
import { withCachingAndLogging, controllerConfigs, cacheKeyGenerators } from "../utils/controllerUtils.js";
import logger from "../utils/logger.js";

// GET /api/analytics/question-stats
const _getQuestionStats = async (req, res) => {
    try {
        logger.info('Getting question statistics', { 
            context: 'AnalyticsController', 
            operation: 'Get Question Stats',
            userId: req.user?.id 
        });

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
        
        logger.info('Successfully retrieved question statistics', { 
            context: 'AnalyticsController', 
            operation: 'Get Question Stats',
            count: result.length,
            userId: req.user?.id 
        });
        
        res.json(result);
    } catch (error) {
        logger.error('Error getting question statistics', { 
            context: 'AnalyticsController', 
            operation: 'Get Question Stats',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getQuestionStats = withCachingAndLogging(_getQuestionStats, {
    ...controllerConfigs.analytics,
    operation: 'Get Question Stats',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `analytics:question-stats:${req.user?.id || 'anonymous'}`
});

// GET /api/analytics/score-trends
const _getScoreTrends = async (req, res) => {
    try {
        logger.info('Getting score trends', { 
            context: 'AnalyticsController', 
            operation: 'Get Score Trends',
            userId: req.user?.id 
        });

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
        
        logger.info('Successfully retrieved score trends', { 
            context: 'AnalyticsController', 
            operation: 'Get Score Trends',
            count: result.length,
            userId: req.user?.id 
        });
        
        res.json(result);
    } catch (error) {
        logger.error('Error getting score trends', { 
            context: 'AnalyticsController', 
            operation: 'Get Score Trends',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getScoreTrends = withCachingAndLogging(_getScoreTrends, {
    ...controllerConfigs.analytics,
    operation: 'Get Score Trends',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `analytics:score-trends:${req.user?.id || 'anonymous'}`
});

// GET /api/analytics/topic-heatmap
const _getTopicHeatmap = async (req, res) => {
    try {
        logger.info('Getting topic heatmap', { 
            context: 'AnalyticsController', 
            operation: 'Get Topic Heatmap',
            userId: req.user?.id 
        });

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
        
        logger.info('Successfully retrieved topic heatmap', { 
            context: 'AnalyticsController', 
            operation: 'Get Topic Heatmap',
            count: result.length,
            userId: req.user?.id 
        });
        
        res.json(result);
    } catch (error) {
        logger.error('Error getting topic heatmap', { 
            context: 'AnalyticsController', 
            operation: 'Get Topic Heatmap',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getTopicHeatmap = withCachingAndLogging(_getTopicHeatmap, {
    ...controllerConfigs.analytics,
    operation: 'Get Topic Heatmap',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `analytics:topic-heatmap:${req.user?.id || 'anonymous'}`
});