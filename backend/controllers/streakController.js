import UserQuiz from '../models/User.js';
import XPLog from '../models/XPLog.js';
import logger from '../utils/logger.js';

/**
 * Get user's study streak and daily goals progress
 */
export const getStreakAndGoals = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await UserQuiz.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate current streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastQuizDate = user.lastQuizDate ? new Date(user.lastQuizDate) : null;
        const lastQuizMidnight = lastQuizDate ? new Date(lastQuizDate.setHours(0, 0, 0, 0)) : null;

        let currentStreak = user.quizStreak || 0;
        const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        // Check if streak should continue or reset
        if (lastQuizMidnight) {
            if (lastQuizMidnight.getTime() === today.getTime()) {
                // Quiz taken today - streak continues
                currentStreak = Math.max(currentStreak, 1);
            } else if (lastQuizMidnight.getTime() === oneDayAgo.getTime()) {
                // Quiz taken yesterday - streak continues
                currentStreak = Math.max(currentStreak, user.quizStreak || 1);
            } else {
                // Gap in streak - reset if more than 1 day ago
                currentStreak = 0;
            }
        }

        // Get today's activity
        const todayStart = new Date(today);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        // Get today's XP from XPLog
        const todayXP = await XPLog.aggregate([
            {
                $match: {
                    user: user._id,
                    createdAt: { $gte: todayStart, $lte: todayEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    totalXP: { $sum: '$xp' }
                }
            }
        ]);

        const todayXPAmount = todayXP.length > 0 ? todayXP[0].totalXP : 0;

        // Get daily goals (default if not set)
        const dailyGoals = user.dailyGoals || {
            quizzes: 3,
            xp: 200,
            timeMinutes: 30
        };

        // Calculate progress
        const quizzesToday = user.dailyActivity?.quizzesToday || 0;
        const timeSpentToday = user.dailyActivity?.timeSpentMinutes || 0;

        const goalsProgress = {
            quizzes: {
                current: quizzesToday,
                target: dailyGoals.quizzes,
                percentage: Math.min(100, Math.round((quizzesToday / dailyGoals.quizzes) * 100))
            },
            xp: {
                current: todayXPAmount,
                target: dailyGoals.xp,
                percentage: Math.min(100, Math.round((todayXPAmount / dailyGoals.xp) * 100))
            },
            time: {
                current: timeSpentToday,
                target: dailyGoals.timeMinutes,
                percentage: Math.min(100, Math.round((timeSpentToday / dailyGoals.timeMinutes) * 100))
            }
        };

        // Get streak history (last 30 days)
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const streakHistory = await XPLog.aggregate([
            {
                $match: {
                    user: user._id,
                    createdAt: { $gte: thirtyDaysAgo },
                    source: { $in: ['quiz', 'challenge', 'tournament'] }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    xp: { $sum: '$xp' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            }
        ]);

        // Format streak history for calendar
        const calendarData = {};
        streakHistory.forEach(item => {
            const date = new Date(item._id.year, item._id.month - 1, item._id.day);
            const dateKey = date.toISOString().split('T')[0];
            calendarData[dateKey] = {
                hasActivity: true,
                quizCount: item.count,
                xp: item.xp
            };
        });

        // Get longest streak
        const longestStreak = user.stats?.longestStreak || currentStreak;

        res.json({
            currentStreak,
            longestStreak,
            lastQuizDate: user.lastQuizDate,
            dailyGoals,
            goalsProgress,
            calendarData,
            todayActivity: {
                quizzes: quizzesToday,
                xp: todayXPAmount,
                timeMinutes: timeSpentToday
            }
        });
    } catch (error) {
        logger.error('Error fetching streak and goals:', error);
        res.status(500).json({ error: 'Failed to fetch streak and goals data' });
    }
};

/**
 * Update daily goals
 */
export const updateDailyGoals = async (req, res) => {
    try {
        const userId = req.user.id;
        const { quizzes, xp, timeMinutes } = req.body;

        const user = await UserQuiz.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Validate goals
        const dailyGoals = {
            quizzes: Math.max(1, Math.min(20, quizzes || 3)),
            xp: Math.max(50, Math.min(2000, xp || 200)),
            timeMinutes: Math.max(5, Math.min(300, timeMinutes || 30))
        };

        user.dailyGoals = dailyGoals;
        await user.save();

        res.json({
            message: 'Daily goals updated successfully',
            dailyGoals
        });
    } catch (error) {
        logger.error('Error updating daily goals:', error);
        res.status(500).json({ error: 'Failed to update daily goals' });
    }
};

/**
 * Update daily activity (called when quiz is completed)
 */
export const updateDailyActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { timeSpentSeconds } = req.body;

        const user = await UserQuiz.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Initialize daily activity if not exists
        if (!user.dailyActivity) {
            user.dailyActivity = {
                date: today,
                quizzesToday: 0,
                timeSpentMinutes: 0
            };
        }

        // Check if it's a new day
        const lastActivityDate = user.dailyActivity.date ? new Date(user.dailyActivity.date) : null;
        const lastActivityMidnight = lastActivityDate ? new Date(lastActivityDate.setHours(0, 0, 0, 0)) : null;
        const todayMidnight = new Date(today);

        if (!lastActivityMidnight || lastActivityMidnight.getTime() !== todayMidnight.getTime()) {
            // New day - reset counters
            user.dailyActivity = {
                date: today,
                quizzesToday: 1,
                timeSpentMinutes: Math.round(timeSpentSeconds / 60)
            };
        } else {
            // Same day - increment
            user.dailyActivity.quizzesToday += 1;
            user.dailyActivity.timeSpentMinutes += Math.round(timeSpentSeconds / 60);
        }

        // Update quiz streak
        const lastQuizDate = user.lastQuizDate ? new Date(user.lastQuizDate) : null;
        const lastQuizMidnight = lastQuizDate ? new Date(lastQuizDate.setHours(0, 0, 0, 0)) : null;
        const oneDayAgo = new Date(todayMidnight.getTime() - 24 * 60 * 60 * 1000);

        if (!lastQuizMidnight || lastQuizMidnight.getTime() === oneDayAgo.getTime()) {
            // Consecutive day - increment streak
            user.quizStreak = (user.quizStreak || 0) + 1;
        } else if (lastQuizMidnight.getTime() !== todayMidnight.getTime()) {
            // Not consecutive - reset streak
            user.quizStreak = 1;
        }

        // Update longest streak if needed
        if (!user.stats) {
            user.stats = {};
        }
        if (!user.stats.longestStreak || user.quizStreak > user.stats.longestStreak) {
            user.stats.longestStreak = user.quizStreak;
        }

        user.lastQuizDate = new Date();
        await user.save();

        res.json({
            message: 'Daily activity updated',
            dailyActivity: user.dailyActivity,
            currentStreak: user.quizStreak
        });
    } catch (error) {
        logger.error('Error updating daily activity:', error);
        res.status(500).json({ error: 'Failed to update daily activity' });
    }
};
