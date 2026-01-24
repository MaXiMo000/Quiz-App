import UserQuiz from "../models/User.js";
import Quiz from "../models/Quiz.js";
import Report from "../models/Report.js";
import logger from "../utils/logger.js";
import mongoose from "mongoose";

// Achievement system data - Expanded with many more achievements
const ACHIEVEMENTS = {
    // ========== STREAK ACHIEVEMENTS ==========
    "streak_3": { title: "🔥 3-Day Streak", description: "Completed quizzes for 3 consecutive days", rarity: "common" },
    "streak_7": { title: "🔥 7-Day Streak", description: "Completed quizzes for 7 consecutive days", rarity: "rare" },
    "streak_14": { title: "🔥 2-Week Warrior", description: "Completed quizzes for 14 consecutive days", rarity: "epic" },
    "streak_30": { title: "🔥 Monthly Master", description: "Completed quizzes for 30 consecutive days", rarity: "legendary" },
    "streak_60": { title: "🔥 Two-Month Champion", description: "Completed quizzes for 60 consecutive days", rarity: "legendary" },
    "streak_90": { title: "🔥 Quarter-Year Legend", description: "Completed quizzes for 90 consecutive days", rarity: "legendary" },
    "streak_100": { title: "🔥 Century Streak", description: "Completed quizzes for 100 consecutive days", rarity: "legendary" },

    // ========== QUIZ COUNT ACHIEVEMENTS ==========
    "quizzes_10": { title: "📚 Quiz Explorer", description: "Completed 10 quizzes", rarity: "common" },
    "quizzes_25": { title: "📚 Quiz Enthusiast", description: "Completed 25 quizzes", rarity: "common" },
    "quizzes_50": { title: "📚 Knowledge Seeker", description: "Completed 50 quizzes", rarity: "rare" },
    "quizzes_100": { title: "📚 Quiz Master", description: "Completed 100 quizzes", rarity: "epic" },
    "quizzes_250": { title: "📚 Quiz Legend", description: "Completed 250 quizzes", rarity: "legendary" },
    "quizzes_500": { title: "📚 Quiz Grandmaster", description: "Completed 500 quizzes", rarity: "legendary" },
    "quizzes_1000": { title: "📚 Quiz Immortal", description: "Completed 1000 quizzes", rarity: "legendary" },

    // ========== SCORE ACHIEVEMENTS ==========
    "score_80": { title: "🎯 High Scorer", description: "Achieved 80%+ average score", rarity: "rare" },
    "score_85": { title: "🎯 Excellent Scorer", description: "Achieved 85%+ average score", rarity: "rare" },
    "score_90": { title: "🎯 Expert Scorer", description: "Achieved 90%+ average score", rarity: "epic" },
    "score_95": { title: "🎯 Perfect Scorer", description: "Achieved 95%+ average score", rarity: "legendary" },
    "score_98": { title: "🎯 Near Perfect", description: "Achieved 98%+ average score", rarity: "legendary" },
    "score_99": { title: "🎯 Almost Flawless", description: "Achieved 99%+ average score", rarity: "legendary" },

    // ========== PERFECT SCORE ACHIEVEMENTS ==========
    "perfect_10": { title: "💯 Perfect Ten", description: "Scored 100% on 10 quizzes", rarity: "epic" },
    "perfect_25": { title: "💯 Perfect Quarter", description: "Scored 100% on 25 quizzes", rarity: "epic" },
    "perfect_50": { title: "💯 Perfect Half-Century", description: "Scored 100% on 50 quizzes", rarity: "legendary" },
    "perfect_100": { title: "💯 Perfect Century", description: "Scored 100% on 100 quizzes", rarity: "legendary" },
    "perfect_250": { title: "💯 Perfect Legend", description: "Scored 100% on 250 quizzes", rarity: "legendary" },

    // ========== LEVEL ACHIEVEMENTS ==========
    "level_10": { title: "⭐ Rising Star", description: "Reached level 10", rarity: "rare" },
    "level_25": { title: "⭐ Shining Star", description: "Reached level 25", rarity: "epic" },
    "level_50": { title: "⭐ Legendary Star", description: "Reached level 50", rarity: "legendary" },
    "level_75": { title: "⭐ Superstar", description: "Reached level 75", rarity: "legendary" },
    "level_100": { title: "⭐ Centurion", description: "Reached level 100", rarity: "legendary" },
    "level_150": { title: "⭐ Elite Champion", description: "Reached level 150", rarity: "legendary" },
    "level_200": { title: "⭐ Ultimate Master", description: "Reached level 200", rarity: "legendary" },

    // ========== CATEGORY ACHIEVEMENTS (85%+) ==========
    "category_math": { title: "🧮 Math Genius", description: "Achieved 85%+ average in Mathematics category", rarity: "rare" },
    "category_science": { title: "🔬 Science Expert", description: "Achieved 85%+ average in Science category", rarity: "rare" },
    "category_history": { title: "📜 History Buff", description: "Achieved 85%+ average in History category", rarity: "rare" },
    "category_literature": { title: "📚 Literature Scholar", description: "Achieved 85%+ average in Literature category", rarity: "rare" },
    "category_geography": { title: "🌍 Geography Master", description: "Achieved 85%+ average in Geography category", rarity: "rare" },
    "category_programming": { title: "💻 Code Wizard", description: "Achieved 85%+ average in Programming category", rarity: "epic" },
    "category_sports": { title: "⚽ Sports Fanatic", description: "Achieved 85%+ average in Sports category", rarity: "rare" },
    "category_entertainment": { title: "🎬 Entertainment Expert", description: "Achieved 85%+ average in Entertainment category", rarity: "rare" },
    "category_art": { title: "🎨 Art Connoisseur", description: "Achieved 85%+ average in Art category", rarity: "rare" },
    "category_food": { title: "🍳 Culinary Master", description: "Achieved 85%+ average in Food & Cooking category", rarity: "rare" },
    "category_nature": { title: "🌿 Nature Lover", description: "Achieved 85%+ average in Nature category", rarity: "rare" },
    "category_business": { title: "💼 Business Pro", description: "Achieved 85%+ average in Business category", rarity: "epic" },
    "category_health": { title: "⚕️ Health Guru", description: "Achieved 85%+ average in Health & Medicine category", rarity: "rare" },

    // ========== CATEGORY MASTERY ACHIEVEMENTS (95%+) ==========
    "master_math": { title: "🧮 Math Master", description: "Achieved 95%+ average in Mathematics category", rarity: "epic" },
    "master_science": { title: "🔬 Science Master", description: "Achieved 95%+ average in Science category", rarity: "epic" },
    "master_programming": { title: "💻 Programming Master", description: "Achieved 95%+ average in Programming category", rarity: "legendary" },
    "master_business": { title: "💼 Business Master", description: "Achieved 95%+ average in Business category", rarity: "legendary" },

    // ========== TIME-BASED ACHIEVEMENTS ==========
    "early_bird": { title: "🌅 Early Bird", description: "Completed 5+ quizzes before 8 AM", rarity: "rare" },
    "early_bird_20": { title: "🌅 Dawn Champion", description: "Completed 20+ quizzes before 8 AM", rarity: "epic" },
    "night_owl": { title: "🦉 Night Owl", description: "Completed 5+ quizzes after 10 PM", rarity: "rare" },
    "night_owl_20": { title: "🦉 Midnight Warrior", description: "Completed 20+ quizzes after 10 PM", rarity: "epic" },
    "weekend_warrior": { title: "🏖️ Weekend Warrior", description: "Completed 10+ quizzes on weekends", rarity: "rare" },
    "daily_grind": { title: "⚡ Daily Grind", description: "Completed 5+ quizzes in a single day", rarity: "epic" },
    "marathon": { title: "🏃 Marathon Runner", description: "Completed 10+ quizzes in a single day", rarity: "legendary" },

    // ========== CONSISTENCY ACHIEVEMENTS ==========
    "consistent_5": { title: "📊 Consistent Performer", description: "Scored the same percentage 5 times in a row", rarity: "epic" },
    "improvement_10": { title: "📈 Rising Star", description: "Improved score in 10 consecutive quizzes", rarity: "epic" },
    "no_fail_20": { title: "🛡️ Unbreakable", description: "Scored 80%+ in 20 consecutive quizzes", rarity: "legendary" },

    // ========== SPEED ACHIEVEMENTS ==========
    "speed_demon": { title: "⚡ Speed Demon", description: "Completed 5 quizzes in under 2 minutes each", rarity: "epic" },
    "lightning": { title: "⚡ Lightning Fast", description: "Completed 10 quizzes averaging under 90 seconds", rarity: "legendary" },

    // ========== CATEGORY DIVERSITY ACHIEVEMENTS ==========
    "jack_of_all": { title: "🎭 Jack of All Trades", description: "Completed quizzes in 10+ different categories", rarity: "epic" },
    "master_of_all": { title: "👑 Master of All", description: "Achieved 85%+ in 10+ different categories", rarity: "legendary" },

    // ========== SPECIAL ACHIEVEMENTS ==========
    "first_quiz": { title: "🎯 First Steps", description: "Completed your first quiz", rarity: "common" },
    "week_complete": { title: "📅 Week Complete", description: "Completed at least one quiz every day for a week", rarity: "rare" },
    "month_complete": { title: "📅 Month Complete", description: "Completed at least one quiz every day for a month", rarity: "legendary" },
    "comeback": { title: "💪 Comeback King", description: "Scored 100% after scoring below 50%", rarity: "epic" },

    // ========== NEAR IMPOSSIBLE ACHIEVEMENTS ==========
    "streak_365": { title: "🔥 Year Warrior", description: "Completed quizzes for 365 consecutive days", rarity: "legendary", nearImpossible: true },
    "quizzes_5000": { title: "📚 Quiz Deity", description: "Completed 5000 quizzes", rarity: "legendary", nearImpossible: true },
    "score_100": { title: "🎯 Flawless Average", description: "Achieved 100% average score (minimum 50 quizzes)", rarity: "legendary", nearImpossible: true },
    "perfect_500": { title: "💯 Perfect God", description: "Scored 100% on 500 quizzes", rarity: "legendary", nearImpossible: true },
    "perfect_1000": { title: "💯 Perfect Immortal", description: "Scored 100% on 1000 quizzes", rarity: "legendary", nearImpossible: true },
    "level_500": { title: "⭐ Celestial Being", description: "Reached level 500", rarity: "legendary", nearImpossible: true },
    "level_1000": { title: "⭐ Divine Entity", description: "Reached level 1000", rarity: "legendary", nearImpossible: true },
    "master_all": { title: "👑 Master of Everything", description: "Achieved 95%+ in all available categories", rarity: "legendary", nearImpossible: true },
    "perfect_year": { title: "💯 Perfect Year", description: "Scored 100% on at least one quiz every day for a year", rarity: "legendary", nearImpossible: true },
    "no_fail_100": { title: "🛡️ Invincible", description: "Scored 90%+ in 100 consecutive quizzes", rarity: "legendary", nearImpossible: true },
    "speed_god": { title: "⚡ Speed God", description: "Completed 50 quizzes averaging under 60 seconds", rarity: "legendary", nearImpossible: true },
    "marathon_legend": { title: "🏃 Marathon Legend", description: "Completed 50+ quizzes in a single day", rarity: "legendary", nearImpossible: true },
    "streak_1000": { title: "🔥 Millennium Streak", description: "Completed quizzes for 1000 consecutive days", rarity: "legendary", nearImpossible: true },
    "quizzes_10000": { title: "📚 Quiz Immortal", description: "Completed 10000 quizzes", rarity: "legendary", nearImpossible: true },
    "perfect_streak_30": { title: "💯 Perfect Month", description: "Scored 100% on at least one quiz every day for 30 days", rarity: "legendary", nearImpossible: true },
    "perfect_streak_100": { title: "💯 Perfect Century Streak", description: "Scored 100% on at least one quiz every day for 100 days", rarity: "legendary", nearImpossible: true }
};

// Get comprehensive dashboard data for a user
export const getDashboardData = async (req, res) => {
    logger.info(`Fetching dashboard data for user ${req.params.userId}`);
    try {
        const userId = req.params.userId;
        const requestingUserId = req.user.id;
        const requestingUserRole = req.user.role;
        const { timeRange = "week" } = req.query; // week, month, year

        // SECURITY: Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            logger.warn(`Invalid user ID format: ${userId}`);
            return res.status(400).json({ message: "Invalid user ID format" });
        }

        // SECURITY: Authorization check - users can only access their own dashboard unless admin
        if (requestingUserRole !== "admin" && requestingUserId !== userId) {
            logger.warn(`User ${requestingUserId} attempted to access dashboard for user ${userId}`);
            return res.status(403).json({ message: "Access denied. You can only access your own dashboard." });
        }

        // Get user data
        const user = await UserQuiz.findById(userId);
        if (!user) {
            logger.warn(`User not found with ID: ${userId}`);
            return res.status(404).json({ message: "User not found" });
        }

        // Get all user reports using the user's name (since reports use username)
        const reports = await Report.find({ username: user.name }).lean();

        // Calculate basic stats
        let quizFilter;
        if (user.role === "admin") {
            quizFilter = {};
        } else if (user.role === "premium") {
            // Premium: quizzes created by admin and by this user
            quizFilter = {
                $or: [
                    { "createdBy._id": null },
                    { "createdBy._id": user._id }
                ]
            };
        } else {
            // User: only quizzes created by admin
            quizFilter = { "createdBy._id": null };
        }
        const totalQuizzes = await Quiz.countDocuments(quizFilter);
        const completedQuizzes = reports.length;
        const averageScore = reports.length > 0
            ? Math.round(reports.reduce((sum, report) => sum + (report.score / report.total * 100), 0) / reports.length * 10) / 10
            : 0;

        // Calculate current streak
        const currentStreak = await calculateStreak(user.name);

        // Get weekly progress data
        const weeklyProgress = await getWeeklyProgress(user.name, timeRange);

        // Get category performance
        const categoryPerformance = await getCategoryPerformance(user.name);

        // Get recent achievements (enhanced system)
        const userAchievements = await getUserAchievements(user.name, user, reports, currentStreak);

        // Get study time data
        const studyTimeData = await getStudyTimeData(user.name, timeRange);

        // Get difficulty distribution
        const difficultyStats = await getDifficultyStats(user.name);

        // Get learning streak data
        const streakData = await getStreakData(user.name);

        logger.info(`Successfully fetched dashboard data for user ${userId}`);
        res.json({
            totalQuizzes,
            completedQuizzes,
            averageScore,
            currentStreak,
            weeklyProgress,
            categoryPerformance,
            recentAchievements: userAchievements.recent,
            studyTimeData,
            difficultyStats,
            streakData,
            userLevel: user.level || 1,
            userXP: Math.round(user.xp) || 0
        });

    } catch (error) {
        logger.error({ message: `Error fetching dashboard data for user ${req.params.userId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error fetching dashboard data", error: error.message });
    }
};

// Calculate user's current streak
const calculateStreak = async (username) => {
    try {
        const reports = await Report.find({ username })
            .sort({ createdAt: -1 })
            .limit(30)
            .lean(); // Check last 30 days

        if (reports.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;

        // Group reports by date
        const reportsByDate = {};
        reports.forEach(report => {
            const dateKey = new Date(report.createdAt).toDateString();
            reportsByDate[dateKey] = true;
        });

        // Count consecutive days from today backwards
        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today - (i * oneDayMs));
            const dateKey = checkDate.toDateString();

            if (reportsByDate[dateKey]) {
                streak++;
            } else if (i > 0) { // Allow for today to be empty
                break;
            }
        }

        return streak;
    } catch (error) {
        logger.error({ message: `Error calculating streak for user ${username}`, error: error.message, stack: error.stack });
        return 0;
    }
};

// Get weekly progress data
const getWeeklyProgress = async (username, timeRange) => {
    try {
        const days = timeRange === "year" ? 365 : timeRange === "month" ? 30 : 7;
        const progress = [];
        const today = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today - (i * oneDayMs));
            const startOfDay = new Date(date.setHours(0, 0, 0, 0));
            const endOfDay = new Date(date.setHours(23, 59, 59, 999));

            const reports = await Report.find({
                username,
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            });

            const dayAverage = reports.length > 0
                ? Math.round(reports.reduce((sum, report) => sum + (report.score / report.total * 100), 0) / reports.length)
                : 0;

            progress.push(dayAverage);
        }

        return progress;
    } catch (error) {
        logger.error({ message: `Error getting weekly progress for user ${username}`, error: error.message, stack: error.stack });
        return Array(7).fill(0);
    }
};

// Get category performance
const getCategoryPerformance = async (username) => {
    try {
        const reports = await Report.find({ username }).lean();
        const categoryStats = {};

        // Get all unique quiz names from reports
        const quizNames = [...new Set(reports.map(report => report.quizName))];

        // Fetch quiz categories from database
        const quizzes = await Quiz.find({ title: { $in: quizNames } }).select("title category").lean();
        const quizCategoryMap = {};
        quizzes.forEach(quiz => {
            quizCategoryMap[quiz.title] = quiz.category;
        });

        reports.forEach(report => {
            let category = "General"; // Default fallback

            // First, try to get category from database
            const dbCategory = quizCategoryMap[report.quizName];
            if (dbCategory && dbCategory.trim() !== "") {
                category = dbCategory;
            } else {
                // Fallback to name-based detection
                const quizName = report.quizName.toLowerCase();

                if (quizName.includes("science") || quizName.includes("biology") || quizName.includes("chemistry") ||
                    quizName.includes("physics") || quizName.includes("anatomy") || quizName.includes("botany") ||
                    quizName.includes("zoology") || quizName.includes("genetics") || quizName.includes("ecology")) {
                    category = "Science";
                } else if (quizName.includes("math") || quizName.includes("algebra") || quizName.includes("geometry") ||
                           quizName.includes("arithmetic") || quizName.includes("calculus") || quizName.includes("statistics") ||
                           quizName.includes("trigonometry") || quizName.includes("number") || quizName.includes("equation")) {
                    category = "Mathematics";
                } else if (quizName.includes("history") || quizName.includes("historical") || quizName.includes("ancient") ||
                           quizName.includes("world war") || quizName.includes("civilization") || quizName.includes("empire") ||
                           quizName.includes("revolution") || quizName.includes("medieval") || quizName.includes("dynasty")) {
                    category = "History";
                } else if (quizName.includes("literature") || quizName.includes("english") || quizName.includes("reading") ||
                           quizName.includes("poetry") || quizName.includes("novel") || quizName.includes("shakespeare") ||
                           quizName.includes("writing") || quizName.includes("grammar") || quizName.includes("author")) {
                    category = "Literature";
                } else if (quizName.includes("geography") || quizName.includes("country") || quizName.includes("capital") ||
                           quizName.includes("continent") || quizName.includes("ocean") || quizName.includes("mountain") ||
                           quizName.includes("river") || quizName.includes("city") || quizName.includes("flag")) {
                    category = "Geography";
                } else if (quizName.includes("programming") || quizName.includes("coding") || quizName.includes("javascript") ||
                           quizName.includes("python") || quizName.includes("html") || quizName.includes("css") ||
                           quizName.includes("react") || quizName.includes("node") || quizName.includes("database") ||
                           quizName.includes("algorithm") || quizName.includes("software") || quizName.includes("computer")) {
                    category = "Programming";
                } else if (quizName.includes("sport") || quizName.includes("football") || quizName.includes("basketball") ||
                           quizName.includes("soccer") || quizName.includes("tennis") || quizName.includes("cricket") ||
                           quizName.includes("baseball") || quizName.includes("olympics") || quizName.includes("athlete")) {
                    category = "Sports";
                } else if (quizName.includes("movie") || quizName.includes("film") || quizName.includes("music") ||
                           quizName.includes("celebrity") || quizName.includes("tv") || quizName.includes("show") ||
                           quizName.includes("actor") || quizName.includes("singer") || quizName.includes("band")) {
                    category = "Entertainment";
                } else if (quizName.includes("art") || quizName.includes("painting") || quizName.includes("artist") ||
                           quizName.includes("sculpture") || quizName.includes("museum") || quizName.includes("design") ||
                           quizName.includes("color") || quizName.includes("draw")) {
                    category = "Art";
                } else if (quizName.includes("food") || quizName.includes("cooking") || quizName.includes("recipe") ||
                           quizName.includes("cuisine") || quizName.includes("restaurant") || quizName.includes("ingredient") ||
                           quizName.includes("dish") || quizName.includes("nutrition")) {
                    category = "Food & Cooking";
                } else if (quizName.includes("nature") || quizName.includes("animal") || quizName.includes("plant") ||
                           quizName.includes("bird") || quizName.includes("tree") || quizName.includes("flower") ||
                           quizName.includes("wildlife") || quizName.includes("environment")) {
                    category = "Nature";
                } else if (quizName.includes("business") || quizName.includes("economics") || quizName.includes("finance") ||
                           quizName.includes("marketing") || quizName.includes("management") || quizName.includes("investment") ||
                           quizName.includes("accounting") || quizName.includes("entrepreneur")) {
                    category = "Business";
                } else if (quizName.includes("health") || quizName.includes("medical") || quizName.includes("medicine") ||
                           quizName.includes("doctor") || quizName.includes("disease") || quizName.includes("fitness") ||
                           quizName.includes("nutrition") || quizName.includes("wellness")) {
                    category = "Health & Medicine";
                } else {
                    // Dynamic category creation from quiz name
                    const words = quizName.split(" ");
                    const potentialCategory = words.find(word =>
                        word.length > 3 &&
                        !["quiz", "test", "the", "and", "for", "with", "about"].includes(word)
                    );

                    if (potentialCategory) {
                        category = potentialCategory.charAt(0).toUpperCase() + potentialCategory.slice(1);
                    }
                }
            }

            if (!categoryStats[category]) {
                categoryStats[category] = { total: 0, count: 0 };
            }

            const percentage = (report.score / report.total) * 100;
            categoryStats[category].total += percentage;
            categoryStats[category].count += 1;
        });

        const categoryPerformance = {};
        Object.keys(categoryStats).forEach(category => {
            categoryPerformance[category] = Math.round(
                categoryStats[category].total / categoryStats[category].count
            );
        });

        // Sort categories by performance (highest first) and limit to top 10
        const sortedCategories = Object.entries(categoryPerformance)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        const finalCategoryPerformance = {};
        sortedCategories.forEach(([category, score]) => {
            finalCategoryPerformance[category] = score;
        });

        // Add default categories if none exist
        if (Object.keys(finalCategoryPerformance).length === 0) {
            return {
                "General": 0,
                "Science": 0,
                "Mathematics": 0,
                "History": 0,
                "Literature": 0,
                "Geography": 0,
                "Programming": 0
            };
        }

        return finalCategoryPerformance;
    } catch (error) {
        logger.error({ message: `Error getting category performance for user ${username}`, error: error.message, stack: error.stack });
        return {};
    }
};

// Get study time data
const getStudyTimeData = async (username, timeRange) => {
    try {
        const days = timeRange === "year" ? 365 : timeRange === "month" ? 30 : 7;
        const labels = [];
        const data = [];
        const today = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today - (i * oneDayMs));
            const startOfDay = new Date(date.setHours(0, 0, 0, 0));
            const endOfDay = new Date(date.setHours(23, 59, 59, 999));

            const reports = await Report.find({
                username,
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            });

            labels.push(date.toLocaleDateString("en-US", {
                weekday: timeRange === "week" ? "short" : undefined,
                month: timeRange !== "week" ? "short" : undefined,
                day: "numeric"
            }));

            // Estimate study time (assuming 2 minutes per quiz on average)
            data.push(reports.length * 2);
        }

        return { labels, data };
    } catch (error) {
        logger.error({ message: `Error getting study time data for user ${username}`, error: error.message, stack: error.stack });
        return { labels: [], data: [] };
    }
};

// Get difficulty statistics
const getDifficultyStats = async (username) => {
    try {
        const reports = await Report.find({ username }).lean();
        const difficultyStats = { Easy: 0, Medium: 0, Hard: 0 };

        reports.forEach(report => {
            // Since reports don't have difficulty info, we'll estimate based on score
            const percentage = (report.score / report.total) * 100;
            if (percentage >= 80) {
                difficultyStats.Easy += 1;
            } else if (percentage >= 60) {
                difficultyStats.Medium += 1;
            } else {
                difficultyStats.Hard += 1;
            }
        });

        return difficultyStats;
    } catch (error) {
        logger.error({ message: `Error getting difficulty stats for user ${username}`, error: error.message, stack: error.stack });
        return { Easy: 0, Medium: 0, Hard: 0 };
    }
};

// Get streak data for the last 30 days
const getStreakData = async (username) => {
    try {
        const streakData = [];
        const today = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;

        for (let i = 29; i >= 0; i--) {
            const date = new Date(today - (i * oneDayMs));
            const startOfDay = new Date(date.setHours(0, 0, 0, 0));
            const endOfDay = new Date(date.setHours(23, 59, 59, 999));

            const reports = await Report.find({
                username,
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            });

            streakData.push({
                date: date.toISOString().split("T")[0],
                active: reports.length > 0,
                count: reports.length
            });
        }

        return streakData;
    } catch (error) {
        logger.error({ message: `Error getting streak data for user ${username}`, error: error.message, stack: error.stack });
        return [];
    }
};


// Get leaderboard position for user
export const getUserLeaderboardPosition = async (req, res) => {
    logger.info(`Fetching leaderboard position for user ${req.params.userId}`);
    try {
        const userId = req.params.userId;
        const requestingUserId = req.user.id;
        const requestingUserRole = req.user.role;

        // SECURITY: Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            logger.warn(`Invalid user ID format: ${userId}`);
            return res.status(400).json({ message: "Invalid user ID format" });
        }

        // SECURITY: Authorization check - users can only access their own position unless admin
        if (requestingUserRole !== "admin" && requestingUserId !== userId) {
            logger.warn(`User ${requestingUserId} attempted to access leaderboard position for user ${userId}`);
            return res.status(403).json({ message: "Access denied. You can only access your own leaderboard position." });
        }

        // Get all users sorted by XP
        const users = await UserQuiz.find({})
            .sort({ xp: -1 })
            .select("_id name xp")
            .lean();

        const position = users.findIndex(user => user._id.toString() === userId) + 1;
        const totalUsers = users.length;

        logger.info(`Successfully fetched leaderboard position for user ${userId}: ${position}/${totalUsers}`);
        res.json({
            position,
            totalUsers,
            percentile: Math.round(((totalUsers - position) / totalUsers) * 100)
        });

    } catch (error) {
        logger.error({ message: `Error getting leaderboard position for user ${req.params.userId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error getting leaderboard position", error: error.message });
    }
};

// Get user achievements with comprehensive system
const getUserAchievements = async (username, user, reports, currentStreak) => {
    const unlockedAchievements = [];
    const lockedAchievements = [];

    // Calculate stats
    const totalQuizzes = reports.length;
    const averageScore = reports.length > 0
        ? reports.reduce((sum, report) => (sum + (report.score / report.total * 100)), 0) / reports.length
        : 0;

    const perfectScores = reports.filter(r => (r.score / r.total) === 1).length;
    const userLevel = user.level || 1;

    // Calculate additional stats for new achievements
    const reportsByDate = {};
    const reportsByDayOfWeek = {};
    const consecutiveScores = [];
    let currentConsecutiveScore = null;
    let consecutiveCount = 0;
    let improvementCount = 0;
    let lastScore = null;
    let noFailCount = 0;
    let speedQuizzes = 0;
    let totalSpeedTime = 0;
    let dailyQuizCounts = {};
    let perfectStreakDays = 0;
    let lastPerfectDate = null;
    let perfectStreakCurrent = 0;

    reports.forEach((report, index) => {
        const reportDate = new Date(report.createdAt);
        const dateKey = reportDate.toDateString();
        const dayOfWeek = reportDate.getDay(); // 0 = Sunday, 6 = Saturday
        const hour = reportDate.getHours();
        const scorePercent = (report.score / report.total) * 100;

        // Track reports by date
        if (!reportsByDate[dateKey]) {
            reportsByDate[dateKey] = [];
        }
        reportsByDate[dateKey].push(report);

        // Track weekend quizzes
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            reportsByDayOfWeek[dayOfWeek] = (reportsByDayOfWeek[dayOfWeek] || 0) + 1;
        }

        // Track daily quiz counts
        dailyQuizCounts[dateKey] = (dailyQuizCounts[dateKey] || 0) + 1;

        // Calculate total time for speed achievements (estimate from answerTime)
        const totalTime = report.questions.reduce((sum, q) => sum + (q.answerTime || 0), 0) / 1000; // Convert to seconds
        if (totalTime > 0 && totalTime < 120) { // Under 2 minutes
            speedQuizzes++;
            totalSpeedTime += totalTime;
        }

        // Track consecutive scores
        if (currentConsecutiveScore === null || currentConsecutiveScore === scorePercent) {
            consecutiveCount++;
            currentConsecutiveScore = scorePercent;
        } else {
            if (consecutiveCount >= 5) {
                consecutiveScores.push(consecutiveCount);
            }
            consecutiveCount = 1;
            currentConsecutiveScore = scorePercent;
        }

        // Track improvement streak
        if (lastScore !== null && scorePercent > lastScore) {
            improvementCount++;
        } else {
            improvementCount = 0;
        }
        lastScore = scorePercent;

        // Track no-fail streak
        if (scorePercent >= 80) {
            noFailCount++;
        } else {
            noFailCount = 0;
        }

        // Track perfect score streaks
        if (scorePercent === 100) {
            const perfectDate = dateKey;
            if (lastPerfectDate === null || perfectDate === lastPerfectDate) {
                perfectStreakCurrent++;
            } else {
                // Check if consecutive days
                const lastDate = new Date(lastPerfectDate);
                const currentDate = new Date(perfectDate);
                const daysDiff = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
                if (daysDiff === 1) {
                    perfectStreakCurrent++;
                } else {
                    perfectStreakCurrent = 1;
                }
            }
            lastPerfectDate = perfectDate;
            perfectStreakDays = Math.max(perfectStreakDays, perfectStreakCurrent);
        }
    });

    // Check final consecutive score
    if (consecutiveCount >= 5) {
        consecutiveScores.push(consecutiveCount);
    }

    // Calculate weekend total
    const weekendTotal = (reportsByDayOfWeek[0] || 0) + (reportsByDayOfWeek[6] || 0);

    // Calculate max quizzes in a single day
    const maxDailyQuizzes = Math.max(...Object.values(dailyQuizCounts), 0);

    // Calculate average speed
    const avgSpeed = speedQuizzes > 0 ? totalSpeedTime / speedQuizzes : 0;

    // Calculate unique categories
    const uniqueCategories = new Set();
    reports.forEach(report => {
        const quizName = report.quizName.toLowerCase();
        // Use same category detection logic as before
        if (quizName.includes("math") || quizName.includes("algebra") || quizName.includes("geometry")) {
            uniqueCategories.add("Mathematics");
        } else if (quizName.includes("science") || quizName.includes("biology") || quizName.includes("chemistry")) {
            uniqueCategories.add("Science");
        } else if (quizName.includes("history")) {
            uniqueCategories.add("History");
        } else if (quizName.includes("literature") || quizName.includes("english")) {
            uniqueCategories.add("Literature");
        } else if (quizName.includes("geography")) {
            uniqueCategories.add("Geography");
        } else if (quizName.includes("programming") || quizName.includes("coding")) {
            uniqueCategories.add("Programming");
        } else if (quizName.includes("sport")) {
            uniqueCategories.add("Sports");
        } else if (quizName.includes("movie") || quizName.includes("music")) {
            uniqueCategories.add("Entertainment");
        } else if (quizName.includes("art")) {
            uniqueCategories.add("Art");
        } else if (quizName.includes("food") || quizName.includes("cooking")) {
            uniqueCategories.add("Food & Cooking");
        } else if (quizName.includes("nature")) {
            uniqueCategories.add("Nature");
        } else if (quizName.includes("business")) {
            uniqueCategories.add("Business");
        } else if (quizName.includes("health") || quizName.includes("medical")) {
            uniqueCategories.add("Health & Medicine");
        }
    });

    // Enhanced category detection with dynamic category creation
    const categoryScores = {};
    reports.forEach(report => {
        let category = "Other"; // Default for unmatched categories
        const quizName = report.quizName.toLowerCase();

        // Science categories
        if (quizName.includes("science") || quizName.includes("biology") || quizName.includes("chemistry") ||
            quizName.includes("physics") || quizName.includes("anatomy") || quizName.includes("botany") ||
            quizName.includes("zoology") || quizName.includes("genetics") || quizName.includes("ecology")) {
            category = "Science";
        }
        // Math categories
        else if (quizName.includes("math") || quizName.includes("algebra") || quizName.includes("geometry") ||
                 quizName.includes("arithmetic") || quizName.includes("calculus") || quizName.includes("statistics") ||
                 quizName.includes("trigonometry") || quizName.includes("number") || quizName.includes("equation")) {
            category = "Mathematics";
        }
        // History categories
        else if (quizName.includes("history") || quizName.includes("historical") || quizName.includes("ancient") ||
                 quizName.includes("world war") || quizName.includes("civilization") || quizName.includes("empire") ||
                 quizName.includes("revolution") || quizName.includes("medieval") || quizName.includes("dynasty")) {
            category = "History";
        }
        // Literature categories
        else if (quizName.includes("literature") || quizName.includes("english") || quizName.includes("reading") ||
                 quizName.includes("poetry") || quizName.includes("novel") || quizName.includes("shakespeare") ||
                 quizName.includes("writing") || quizName.includes("grammar") || quizName.includes("author")) {
            category = "Literature";
        }
        // Geography categories
        else if (quizName.includes("geography") || quizName.includes("country") || quizName.includes("capital") ||
                 quizName.includes("continent") || quizName.includes("ocean") || quizName.includes("mountain") ||
                 quizName.includes("river") || quizName.includes("city") || quizName.includes("flag")) {
            category = "Geography";
        }
        // Programming/Technology categories
        else if (quizName.includes("programming") || quizName.includes("coding") || quizName.includes("javascript") ||
                 quizName.includes("python") || quizName.includes("html") || quizName.includes("css") ||
                 quizName.includes("react") || quizName.includes("node") || quizName.includes("database") ||
                 quizName.includes("algorithm") || quizName.includes("software") || quizName.includes("computer")) {
            category = "Programming";
        }
        // Sports categories
        else if (quizName.includes("sport") || quizName.includes("football") || quizName.includes("basketball") ||
                 quizName.includes("soccer") || quizName.includes("tennis") || quizName.includes("cricket") ||
                 quizName.includes("baseball") || quizName.includes("olympics") || quizName.includes("athlete")) {
            category = "Sports";
        }
        // Entertainment categories
        else if (quizName.includes("movie") || quizName.includes("film") || quizName.includes("music") ||
                 quizName.includes("celebrity") || quizName.includes("tv") || quizName.includes("show") ||
                 quizName.includes("actor") || quizName.includes("singer") || quizName.includes("band")) {
            category = "Entertainment";
        }
        // Art categories
        else if (quizName.includes("art") || quizName.includes("painting") || quizName.includes("artist") ||
                 quizName.includes("sculpture") || quizName.includes("museum") || quizName.includes("design") ||
                 quizName.includes("color") || quizName.includes("draw")) {
            category = "Art";
        }
        // Food categories
        else if (quizName.includes("food") || quizName.includes("cooking") || quizName.includes("recipe") ||
                 quizName.includes("cuisine") || quizName.includes("restaurant") || quizName.includes("ingredient") ||
                 quizName.includes("dish") || quizName.includes("nutrition")) {
            category = "Food & Cooking";
        }
        // Nature categories
        else if (quizName.includes("nature") || quizName.includes("animal") || quizName.includes("plant") ||
                 quizName.includes("bird") || quizName.includes("tree") || quizName.includes("flower") ||
                 quizName.includes("wildlife") || quizName.includes("environment")) {
            category = "Nature";
        }
        // Business categories
        else if (quizName.includes("business") || quizName.includes("economics") || quizName.includes("finance") ||
                 quizName.includes("marketing") || quizName.includes("management") || quizName.includes("investment") ||
                 quizName.includes("accounting") || quizName.includes("entrepreneur")) {
            category = "Business";
        }
        // Health categories
        else if (quizName.includes("health") || quizName.includes("medical") || quizName.includes("medicine") ||
                 quizName.includes("doctor") || quizName.includes("disease") || quizName.includes("fitness") ||
                 quizName.includes("nutrition") || quizName.includes("wellness")) {
            category = "Health & Medicine";
        }
        // Dynamic category creation for unmatched quizzes
        else {
            // Extract potential category from quiz name
            const words = quizName.split(" ");
            const potentialCategory = words.find(word =>
                word.length > 3 &&
                !["quiz", "test", "the", "and", "for", "with", "about"].includes(word)
            );

            if (potentialCategory) {
                // Capitalize first letter and create dynamic category
                category = potentialCategory.charAt(0).toUpperCase() + potentialCategory.slice(1);
            } else {
                category = "General";
            }
        }

        if (!categoryScores[category]) categoryScores[category] = [];
        categoryScores[category].push((report.score / report.total) * 100);
    });

    // Calculate categories with 95%+ mastery
    const masterCategories = [];
    Object.keys(categoryScores).forEach(category => {
        const scores = categoryScores[category];
        if (scores.length >= 3) {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avg >= 95) {
                masterCategories.push(category);
            }
        }
    });

    // Calculate categories with 85%+ mastery
    const masteredCategories = [];
    Object.keys(categoryScores).forEach(category => {
        const scores = categoryScores[category];
        if (scores.length >= 3) {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avg >= 85) {
                masteredCategories.push(category);
            }
        }
    });

    // Check for comeback achievement
    let hasComeback = false;
    for (let i = reports.length - 1; i >= 0; i--) {
        const scorePercent = (reports[i].score / reports[i].total) * 100;
        if (scorePercent === 100) {
            // Check if there was a score below 50% before this
            for (let j = i - 1; j >= 0; j--) {
                const prevScorePercent = (reports[j].score / reports[j].total) * 100;
                if (prevScorePercent < 50) {
                    hasComeback = true;
                    break;
                }
            }
            if (hasComeback) break;
        }
    }

    // Check for first quiz
    const hasFirstQuiz = totalQuizzes >= 1;

    // Check for week/month complete (at least one quiz every day)
    const sortedDates = Object.keys(reportsByDate).sort();
    let weekComplete = false;
    let monthComplete = false;

    if (sortedDates.length >= 7) {
        const last7Days = sortedDates.slice(-7);
        const today = new Date();
        let consecutiveDays = 0;
        for (let i = 6; i >= 0; i--) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateKey = checkDate.toDateString();
            if (reportsByDate[dateKey] && reportsByDate[dateKey].length > 0) {
                consecutiveDays++;
            }
        }
        weekComplete = consecutiveDays === 7;
    }

    if (sortedDates.length >= 30) {
        const last30Days = sortedDates.slice(-30);
        const today = new Date();
        let consecutiveDays = 0;
        for (let i = 29; i >= 0; i--) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateKey = checkDate.toDateString();
            if (reportsByDate[dateKey] && reportsByDate[dateKey].length > 0) {
                consecutiveDays++;
            }
        }
        monthComplete = consecutiveDays === 30;
    }

    // Check for perfect year (365 days with at least one perfect score)
    let perfectYear = false;
    if (sortedDates.length >= 365) {
        const last365Days = sortedDates.slice(-365);
        const today = new Date();
        let perfectDays = 0;
        for (let i = 364; i >= 0; i--) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateKey = checkDate.toDateString();
            if (reportsByDate[dateKey]) {
                const hasPerfect = reportsByDate[dateKey].some(r => (r.score / r.total) === 1);
                if (hasPerfect) perfectDays++;
            }
        }
        perfectYear = perfectDays === 365;
    }

    // Check for perfect streak achievements
    let perfectStreak30 = false;
    let perfectStreak100 = false;

    // Calculate perfect streak from reports
    let currentPerfectStreak = 0;
    let maxPerfectStreak = 0;
    const sortedReports = [...reports].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const perfectByDate = {};

    sortedReports.forEach(report => {
        const dateKey = new Date(report.createdAt).toDateString();
        if ((report.score / report.total) === 1) {
            if (!perfectByDate[dateKey]) {
                perfectByDate[dateKey] = true;
            }
        }
    });

    const perfectDates = Object.keys(perfectByDate).sort();
    if (perfectDates.length > 0) {
        let streak = 1;
        for (let i = 1; i < perfectDates.length; i++) {
            const prevDate = new Date(perfectDates[i - 1]);
            const currDate = new Date(perfectDates[i]);
            const daysDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
            if (daysDiff === 1) {
                streak++;
            } else {
                maxPerfectStreak = Math.max(maxPerfectStreak, streak);
                streak = 1;
            }
        }
        maxPerfectStreak = Math.max(maxPerfectStreak, streak);
    }

    perfectStreak30 = maxPerfectStreak >= 30;
    perfectStreak100 = maxPerfectStreak >= 100;

    // Check each achievement
    Object.entries(ACHIEVEMENTS).forEach(([key, achievement]) => {
        let unlocked = false;

        // Streak achievements
        if (key.startsWith("streak_")) {
            const required = parseInt(key.split("_")[1]);
            unlocked = currentStreak >= required;
        }

        // Quiz count achievements
        else if (key.startsWith("quizzes_")) {
            const required = parseInt(key.split("_")[1]);
            unlocked = totalQuizzes >= required;
        }

        // Score achievements
        else if (key.startsWith("score_")) {
            const required = parseInt(key.split("_")[1]);
            unlocked = averageScore >= required;
        }

        // Category achievements (85%+)
        else if (key.startsWith("category_")) {
            const categoryKey = key.split("_")[1];
            let categoryName;

            // Map achievement keys to actual category names
            switch(categoryKey) {
                case "math": categoryName = "Mathematics"; break;
                case "science": categoryName = "Science"; break;
                case "history": categoryName = "History"; break;
                case "literature": categoryName = "Literature"; break;
                case "geography": categoryName = "Geography"; break;
                case "programming": categoryName = "Programming"; break;
                case "sports": categoryName = "Sports"; break;
                case "entertainment": categoryName = "Entertainment"; break;
                case "art": categoryName = "Art"; break;
                case "food": categoryName = "Food & Cooking"; break;
                case "nature": categoryName = "Nature"; break;
                case "business": categoryName = "Business"; break;
                case "health": categoryName = "Health & Medicine"; break;
                default: categoryName = categoryKey;
            }

            const scores = categoryScores[categoryName] || [];
            if (scores.length >= 3) { // Need at least 3 quizzes in category
                const categoryAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
                unlocked = categoryAvg >= 85;
            } else {
                unlocked = false;
            }
        }

        // Category mastery achievements (95%+)
        else if (key.startsWith("master_")) {
            const categoryKey = key.split("_")[1];
            let categoryName;

            switch(categoryKey) {
                case "math": categoryName = "Mathematics"; break;
                case "science": categoryName = "Science"; break;
                case "programming": categoryName = "Programming"; break;
                case "business": categoryName = "Business"; break;
                default: categoryName = categoryKey;
            }

            const scores = categoryScores[categoryName] || [];
            if (scores.length >= 3) {
                const categoryAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
                unlocked = categoryAvg >= 95;
            } else {
                unlocked = false;
            }
        }

        // Perfect score achievements
        else if (key.startsWith("perfect_")) {
            const required = parseInt(key.split("_")[1]);
            unlocked = perfectScores >= required;
        }

        // Level achievements
        else if (key.startsWith("level_")) {
            const required = parseInt(key.split("_")[1]);
            unlocked = userLevel >= required;
        }

        // Time-based achievements
        else if (key === "early_bird") {
            const earlyReports = reports.filter(report => {
                const hour = new Date(report.createdAt).getHours();
                return hour < 8;
            });
            unlocked = earlyReports.length >= 5;
        }
        else if (key === "early_bird_20") {
            const earlyReports = reports.filter(report => {
                const hour = new Date(report.createdAt).getHours();
                return hour < 8;
            });
            unlocked = earlyReports.length >= 20;
        }
        else if (key === "night_owl") {
            const lateReports = reports.filter(report => {
                const hour = new Date(report.createdAt).getHours();
                return hour >= 22;
            });
            unlocked = lateReports.length >= 5;
        }
        else if (key === "night_owl_20") {
            const lateReports = reports.filter(report => {
                const hour = new Date(report.createdAt).getHours();
                return hour >= 22;
            });
            unlocked = lateReports.length >= 20;
        }
        else if (key === "weekend_warrior") {
            unlocked = weekendTotal >= 10;
        }
        else if (key === "daily_grind") {
            unlocked = maxDailyQuizzes >= 5;
        }
        else if (key === "marathon") {
            unlocked = maxDailyQuizzes >= 10;
        }

        // Consistency achievements
        else if (key === "consistent_5") {
            unlocked = consecutiveScores.length > 0 && Math.max(...consecutiveScores) >= 5;
        }
        else if (key === "improvement_10") {
            unlocked = improvementCount >= 10;
        }
        else if (key === "no_fail_20") {
            unlocked = noFailCount >= 20;
        }

        // Speed achievements
        else if (key === "speed_demon") {
            unlocked = speedQuizzes >= 5;
        }
        else if (key === "lightning") {
            unlocked = speedQuizzes >= 10 && avgSpeed < 90;
        }

        // Category diversity achievements
        else if (key === "jack_of_all") {
            unlocked = uniqueCategories.size >= 10;
        }
        else if (key === "master_of_all") {
            unlocked = masteredCategories.length >= 10;
        }

        // Special achievements
        else if (key === "first_quiz") {
            unlocked = hasFirstQuiz;
        }
        else if (key === "week_complete") {
            unlocked = weekComplete;
        }
        else if (key === "month_complete") {
            unlocked = monthComplete;
        }
        else if (key === "comeback") {
            unlocked = hasComeback;
        }

        // Near impossible achievements
        else if (key === "streak_365") {
            unlocked = currentStreak >= 365;
        }
        else if (key === "quizzes_5000") {
            unlocked = totalQuizzes >= 5000;
        }
        else if (key === "score_100") {
            unlocked = averageScore >= 100 && totalQuizzes >= 50;
        }
        else if (key === "perfect_500") {
            unlocked = perfectScores >= 500;
        }
        else if (key === "perfect_1000") {
            unlocked = perfectScores >= 1000;
        }
        else if (key === "level_500") {
            unlocked = userLevel >= 500;
        }
        else if (key === "level_1000") {
            unlocked = userLevel >= 1000;
        }
        else if (key === "master_all") {
            // Get all available categories and check if user has 95%+ in all
            const allCategories = Object.keys(categoryScores);
            unlocked = allCategories.length >= 5 && masterCategories.length === allCategories.length;
        }
        else if (key === "perfect_year") {
            unlocked = perfectYear;
        }
        else if (key === "no_fail_100") {
            unlocked = noFailCount >= 100;
        }
        else if (key === "speed_god") {
            unlocked = speedQuizzes >= 50 && avgSpeed < 60;
        }
        else if (key === "marathon_legend") {
            unlocked = maxDailyQuizzes >= 50;
        }
        else if (key === "streak_1000") {
            unlocked = currentStreak >= 1000;
        }
        else if (key === "quizzes_10000") {
            unlocked = totalQuizzes >= 10000;
        }
        else if (key === "perfect_streak_30") {
            unlocked = perfectStreak30;
        }
        else if (key === "perfect_streak_100") {
            unlocked = perfectStreak100;
        }

        const achievementData = {
            id: key,
            ...achievement,
            unlocked,
            progress: getAchievementProgress(key, {
                totalQuizzes,
                averageScore,
                currentStreak,
                perfectScores,
                userLevel,
                reports,
                categoryScores,
                consecutiveScores,
                improvementCount,
                noFailCount,
                speedQuizzes,
                avgSpeed,
                maxDailyQuizzes,
                weekendTotal,
                uniqueCategories: uniqueCategories.size,
                masteredCategories: masteredCategories.length,
                masterCategories: masterCategories.length,
                perfectStreakDays,
                perfectYear,
                weekComplete,
                monthComplete,
                hasComeback,
                hasFirstQuiz
            })
        };

        if (unlocked) {
            unlockedAchievements.push(achievementData);
        } else {
            lockedAchievements.push(achievementData);
        }
    });

    // Sort achievements: regular first, then near-impossible
    const regularUnlocked = unlockedAchievements.filter(a => !a.nearImpossible);
    const nearImpossibleUnlocked = unlockedAchievements.filter(a => a.nearImpossible);
    const regularLocked = lockedAchievements.filter(a => !a.nearImpossible);
    const nearImpossibleLocked = lockedAchievements.filter(a => a.nearImpossible);

    return {
        unlocked: [...regularUnlocked, ...nearImpossibleUnlocked],
        locked: [...regularLocked, ...nearImpossibleLocked],
        recent: unlockedAchievements.slice(-5), // Last 5 unlocked
        total: unlockedAchievements.length
    };
};

// Get achievement progress
const getAchievementProgress = (achievementKey, stats) => {
    const {
        totalQuizzes,
        averageScore,
        currentStreak,
        perfectScores,
        userLevel,
        reports,
        categoryScores,
        consecutiveScores,
        improvementCount,
        noFailCount,
        speedQuizzes,
        avgSpeed,
        maxDailyQuizzes,
        weekendTotal,
        uniqueCategories,
        masteredCategories,
        masterCategories,
        perfectStreakDays,
        perfectYear,
        weekComplete,
        monthComplete,
        hasComeback,
        hasFirstQuiz
    } = stats;

    if (achievementKey.startsWith("streak_")) {
        const required = parseInt(achievementKey.split("_")[1]);
        return Math.min(100, (currentStreak / required) * 100);
    }

    if (achievementKey.startsWith("quizzes_")) {
        const required = parseInt(achievementKey.split("_")[1]);
        return Math.min(100, (totalQuizzes / required) * 100);
    }

    if (achievementKey.startsWith("score_")) {
        const required = parseInt(achievementKey.split("_")[1]);
        return Math.min(100, (averageScore / required) * 100);
    }

    if (achievementKey.startsWith("perfect_")) {
        const required = parseInt(achievementKey.split("_")[1]);
        return Math.min(100, (perfectScores / required) * 100);
    }

    if (achievementKey.startsWith("level_")) {
        const required = parseInt(achievementKey.split("_")[1]);
        return Math.min(100, (userLevel / required) * 100);
    }

    if (achievementKey.startsWith("category_") && categoryScores) {
        const categoryKey = achievementKey.split("_")[1];
        let categoryName;

        switch(categoryKey) {
            case "math": categoryName = "Mathematics"; break;
            case "science": categoryName = "Science"; break;
            case "history": categoryName = "History"; break;
            case "literature": categoryName = "Literature"; break;
            case "geography": categoryName = "Geography"; break;
            case "programming": categoryName = "Programming"; break;
            case "sports": categoryName = "Sports"; break;
            case "entertainment": categoryName = "Entertainment"; break;
            case "art": categoryName = "Art"; break;
            case "food": categoryName = "Food & Cooking"; break;
            case "nature": categoryName = "Nature"; break;
            case "business": categoryName = "Business"; break;
            case "health": categoryName = "Health & Medicine"; break;
            default: categoryName = categoryKey;
        }

        const scores = categoryScores[categoryName] || [];
        if (scores.length === 0) return 0;

        const categoryAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return Math.min(100, (categoryAvg / 85) * 100);
    }

    if (achievementKey.startsWith("master_") && categoryScores) {
        const categoryKey = achievementKey.split("_")[1];
        let categoryName;

        switch(categoryKey) {
            case "math": categoryName = "Mathematics"; break;
            case "science": categoryName = "Science"; break;
            case "programming": categoryName = "Programming"; break;
            case "business": categoryName = "Business"; break;
            default: categoryName = categoryKey;
        }

        const scores = categoryScores[categoryName] || [];
        if (scores.length === 0) return 0;

        const categoryAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return Math.min(100, (categoryAvg / 95) * 100);
    }

    if (achievementKey === "early_bird" && reports) {
        const earlyReports = reports.filter(report => {
            const hour = new Date(report.createdAt).getHours();
            return hour < 8;
        });
        return Math.min(100, (earlyReports.length / 5) * 100);
    }

    if (achievementKey === "early_bird_20" && reports) {
        const earlyReports = reports.filter(report => {
            const hour = new Date(report.createdAt).getHours();
            return hour < 8;
        });
        return Math.min(100, (earlyReports.length / 20) * 100);
    }

    if (achievementKey === "night_owl" && reports) {
        const lateReports = reports.filter(report => {
            const hour = new Date(report.createdAt).getHours();
            return hour >= 22;
        });
        return Math.min(100, (lateReports.length / 5) * 100);
    }

    if (achievementKey === "night_owl_20" && reports) {
        const lateReports = reports.filter(report => {
            const hour = new Date(report.createdAt).getHours();
            return hour >= 22;
        });
        return Math.min(100, (lateReports.length / 20) * 100);
    }

    if (achievementKey === "weekend_warrior") {
        return Math.min(100, (weekendTotal / 10) * 100);
    }

    if (achievementKey === "daily_grind") {
        return Math.min(100, (maxDailyQuizzes / 5) * 100);
    }

    if (achievementKey === "marathon") {
        return Math.min(100, (maxDailyQuizzes / 10) * 100);
    }

    if (achievementKey === "consistent_5") {
        const maxConsecutive = consecutiveScores.length > 0 ? Math.max(...consecutiveScores) : 0;
        return Math.min(100, (maxConsecutive / 5) * 100);
    }

    if (achievementKey === "improvement_10") {
        return Math.min(100, (improvementCount / 10) * 100);
    }

    if (achievementKey === "no_fail_20") {
        return Math.min(100, (noFailCount / 20) * 100);
    }

    if (achievementKey === "speed_demon") {
        return Math.min(100, (speedQuizzes / 5) * 100);
    }

    if (achievementKey === "lightning") {
        if (speedQuizzes < 10) return (speedQuizzes / 10) * 50;
        if (avgSpeed >= 90) return 50;
        return Math.min(100, 50 + ((90 - avgSpeed) / 90) * 50);
    }

    if (achievementKey === "jack_of_all") {
        return Math.min(100, (uniqueCategories / 10) * 100);
    }

    if (achievementKey === "master_of_all") {
        return Math.min(100, (masteredCategories / 10) * 100);
    }

    if (achievementKey === "first_quiz") {
        return hasFirstQuiz ? 100 : (totalQuizzes > 0 ? 100 : 0);
    }

    if (achievementKey === "week_complete") {
        return weekComplete ? 100 : 0;
    }

    if (achievementKey === "month_complete") {
        return monthComplete ? 100 : 0;
    }

    if (achievementKey === "comeback") {
        return hasComeback ? 100 : 0;
    }

    // Near impossible achievements progress
    if (achievementKey === "streak_365") {
        return Math.min(100, (currentStreak / 365) * 100);
    }

    if (achievementKey === "quizzes_5000") {
        return Math.min(100, (totalQuizzes / 5000) * 100);
    }

    if (achievementKey === "score_100") {
        if (totalQuizzes < 50) return (totalQuizzes / 50) * 50;
        return Math.min(100, (averageScore / 100) * 100);
    }

    if (achievementKey === "perfect_500") {
        return Math.min(100, (perfectScores / 500) * 100);
    }

    if (achievementKey === "perfect_1000") {
        return Math.min(100, (perfectScores / 1000) * 100);
    }

    if (achievementKey === "level_500") {
        return Math.min(100, (userLevel / 500) * 100);
    }

    if (achievementKey === "level_1000") {
        return Math.min(100, (userLevel / 1000) * 100);
    }

    if (achievementKey === "master_all") {
        const allCategories = Object.keys(categoryScores || {});
        if (allCategories.length < 5) return 0;
        return Math.min(100, (masterCategories / allCategories.length) * 100);
    }

    if (achievementKey === "perfect_year") {
        return perfectYear ? 100 : 0;
    }

    if (achievementKey === "no_fail_100") {
        return Math.min(100, (noFailCount / 100) * 100);
    }

    if (achievementKey === "speed_god") {
        if (speedQuizzes < 50) return (speedQuizzes / 50) * 50;
        if (avgSpeed >= 60) return 50;
        return Math.min(100, 50 + ((60 - avgSpeed) / 60) * 50);
    }

    if (achievementKey === "marathon_legend") {
        return Math.min(100, (maxDailyQuizzes / 50) * 100);
    }

    if (achievementKey === "streak_1000") {
        return Math.min(100, (currentStreak / 1000) * 100);
    }

    if (achievementKey === "quizzes_10000") {
        return Math.min(100, (totalQuizzes / 10000) * 100);
    }

    if (achievementKey === "perfect_streak_30") {
        // Use perfectStreakDays (maxPerfectStreak) for progress calculation
        return Math.min(100, (perfectStreakDays / 30) * 100);
    }

    if (achievementKey === "perfect_streak_100") {
        // Use perfectStreakDays (maxPerfectStreak) for progress calculation
        return Math.min(100, (perfectStreakDays / 100) * 100);
    }

    return 0;
};

// Get user achievements endpoint
export const getUserAchievementsEndpoint = async (req, res) => {
    logger.info(`Fetching achievements for user ${req.params.userId}`);
    try {
        const userId = req.params.userId;

        // Check if req.user exists (should be set by verifyToken middleware)
        if (!req.user || !req.user.id) {
            logger.warn(`Unauthorized access attempt to achievements endpoint`);
            return res.status(401).json({ message: "Unauthorized. Please log in." });
        }

        const requestingUserId = req.user.id;
        const requestingUserRole = req.user.role;

        // SECURITY: Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            logger.warn(`Invalid user ID format: ${userId}`);
            return res.status(400).json({ message: "Invalid user ID format" });
        }

        // SECURITY: Authorization check - users can only access their own achievements unless admin
        if (requestingUserRole !== "admin" && requestingUserId !== userId) {
            logger.warn(`User ${requestingUserId} attempted to access achievements for user ${userId}`);
            return res.status(403).json({ message: "Access denied. You can only access your own achievements." });
        }

        const user = await UserQuiz.findById(userId);
        if (!user) {
            logger.warn(`User not found with ID: ${userId} when fetching achievements`);
            return res.status(404).json({ message: "User not found" });
        }

        const reports = await Report.find({ username: user.name }).lean();
        const currentStreak = await calculateStreak(user.name);

        const achievements = await getUserAchievements(user.name, user, reports, currentStreak);

        logger.info(`Successfully fetched ${achievements.unlocked.length} unlocked achievements for user ${userId}`);
        res.json(achievements);
    } catch (error) {
        logger.error({ message: `Error fetching achievements for user ${req.params.userId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error fetching achievements", error: error.message });
    }
};

// Get all available categories from database
export const getAllCategories = async (req, res) => {
    logger.info("Fetching all available categories");
    try {
        // Get all unique categories from quizzes
        const categories = await Quiz.distinct("category", { category: { $exists: true, $ne: null, $nin: [""] } });

        // Sort categories alphabetically
        const sortedCategories = categories.sort();
        logger.info(`Successfully fetched ${sortedCategories.length} categories`);
        res.json({
            categories: sortedCategories,
            count: sortedCategories.length
        });
    } catch (error) {
        logger.error({ message: "Error fetching categories", error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error fetching categories", error: error.message });
    }
};
