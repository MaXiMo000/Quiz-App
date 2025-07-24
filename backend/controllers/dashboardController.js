import UserQuiz from '../models/User.js';
import Quiz from '../models/Quiz.js';
import Report from '../models/Report.js';
import XPLog from '../models/XPLog.js';

// Achievement system data
const ACHIEVEMENTS = {
    'streak_3': { title: '🔥 3-Day Streak', description: 'Completed quizzes for 3 consecutive days', rarity: 'common' },
    'streak_7': { title: '🔥 7-Day Streak', description: 'Completed quizzes for 7 consecutive days', rarity: 'rare' },
    'streak_14': { title: '🔥 2-Week Warrior', description: 'Completed quizzes for 14 consecutive days', rarity: 'epic' },
    'streak_30': { title: '🔥 Monthly Master', description: 'Completed quizzes for 30 consecutive days', rarity: 'legendary' },
    'quizzes_10': { title: '📚 Quiz Explorer', description: 'Completed 10 quizzes', rarity: 'common' },
    'quizzes_50': { title: '📚 Knowledge Seeker', description: 'Completed 50 quizzes', rarity: 'rare' },
    'quizzes_100': { title: '📚 Quiz Master', description: 'Completed 100 quizzes', rarity: 'epic' },
    'quizzes_250': { title: '📚 Quiz Legend', description: 'Completed 250 quizzes', rarity: 'legendary' },
    'score_80': { title: '🎯 High Scorer', description: 'Achieved 80%+ average score', rarity: 'rare' },
    'score_90': { title: '🎯 Expert Scorer', description: 'Achieved 90%+ average score', rarity: 'epic' },
    'score_95': { title: '🎯 Perfect Scorer', description: 'Achieved 95%+ average score', rarity: 'legendary' },
    'category_math': { title: '🧮 Math Genius', description: 'Achieved 85%+ average in Mathematics category', rarity: 'rare' },
    'category_science': { title: '🔬 Science Expert', description: 'Achieved 85%+ average in Science category', rarity: 'rare' },
    'category_history': { title: '📜 History Buff', description: 'Achieved 85%+ average in History category', rarity: 'rare' },
    'category_literature': { title: '📚 Literature Scholar', description: 'Achieved 85%+ average in Literature category', rarity: 'rare' },
    'category_geography': { title: '🌍 Geography Master', description: 'Achieved 85%+ average in Geography category', rarity: 'rare' },
    'category_programming': { title: '💻 Code Wizard', description: 'Achieved 85%+ average in Programming category', rarity: 'epic' },
    'category_sports': { title: '⚽ Sports Fanatic', description: 'Achieved 85%+ average in Sports category', rarity: 'rare' },
    'category_entertainment': { title: '🎬 Entertainment Expert', description: 'Achieved 85%+ average in Entertainment category', rarity: 'rare' },
    'category_art': { title: '🎨 Art Connoisseur', description: 'Achieved 85%+ average in Art category', rarity: 'rare' },
    'category_food': { title: '🍳 Culinary Master', description: 'Achieved 85%+ average in Food & Cooking category', rarity: 'rare' },
    'category_nature': { title: '🌿 Nature Lover', description: 'Achieved 85%+ average in Nature category', rarity: 'rare' },
    'category_business': { title: '💼 Business Pro', description: 'Achieved 85%+ average in Business category', rarity: 'epic' },
    'category_health': { title: '⚕️ Health Guru', description: 'Achieved 85%+ average in Health & Medicine category', rarity: 'rare' },
    'perfect_10': { title: '💯 Perfect Ten', description: 'Scored 100% on 10 quizzes', rarity: 'epic' },
    'early_bird': { title: '🌅 Early Bird', description: 'Completed 5+ quizzes before 8 AM', rarity: 'rare' },
    'night_owl': { title: '🦉 Night Owl', description: 'Completed 5+ quizzes after 10 PM', rarity: 'rare' },
    'level_10': { title: '⭐ Rising Star', description: 'Reached level 10', rarity: 'rare' },
    'level_25': { title: '⭐ Shining Star', description: 'Reached level 25', rarity: 'epic' },
    'level_50': { title: '⭐ Legendary Star', description: 'Reached level 50', rarity: 'legendary' }
};

// Get comprehensive dashboard data for a user
export const getDashboardData = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { timeRange = 'week' } = req.query; // week, month, year

        // Get user data
        const user = await UserQuiz.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log('Found user:', { id: user._id, name: user.name });

        // Get all user reports using the user's name (since reports use username)
        const reports = await Report.find({ username: user.name });
        console.log(`Found ${reports.length} reports for user ${user.name}`);
        
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

        console.log('Basic stats:', { totalQuizzes, completedQuizzes, averageScore });

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
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
    }
};

// Calculate user's current streak
const calculateStreak = async (username) => {
    try {
        const reports = await Report.find({ username })
            .sort({ createdAt: -1 })
            .limit(30); // Check last 30 days

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
        console.error('Error calculating streak:', error);
        return 0;
    }
};

// Get weekly progress data
const getWeeklyProgress = async (username, timeRange) => {
    try {
        const days = timeRange === 'year' ? 365 : timeRange === 'month' ? 30 : 7;
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
        console.error('Error getting weekly progress:', error);
        return Array(7).fill(0);
    }
};

// Get category performance
const getCategoryPerformance = async (username) => {
    try {
        const reports = await Report.find({ username });
        const categoryStats = {};

        reports.forEach(report => {
            let category = 'Other';
            const quizName = report.quizName.toLowerCase();
            
            // Use same enhanced category detection logic
            if (quizName.includes('science') || quizName.includes('biology') || quizName.includes('chemistry') || 
                quizName.includes('physics') || quizName.includes('anatomy') || quizName.includes('botany') || 
                quizName.includes('zoology') || quizName.includes('genetics') || quizName.includes('ecology')) {
                category = 'Science';
            } else if (quizName.includes('math') || quizName.includes('algebra') || quizName.includes('geometry') || 
                       quizName.includes('arithmetic') || quizName.includes('calculus') || quizName.includes('statistics') || 
                       quizName.includes('trigonometry') || quizName.includes('number') || quizName.includes('equation')) {
                category = 'Mathematics';
            } else if (quizName.includes('history') || quizName.includes('historical') || quizName.includes('ancient') || 
                       quizName.includes('world war') || quizName.includes('civilization') || quizName.includes('empire') || 
                       quizName.includes('revolution') || quizName.includes('medieval') || quizName.includes('dynasty')) {
                category = 'History';
            } else if (quizName.includes('literature') || quizName.includes('english') || quizName.includes('reading') || 
                       quizName.includes('poetry') || quizName.includes('novel') || quizName.includes('shakespeare') || 
                       quizName.includes('writing') || quizName.includes('grammar') || quizName.includes('author')) {
                category = 'Literature';
            } else if (quizName.includes('geography') || quizName.includes('country') || quizName.includes('capital') || 
                       quizName.includes('continent') || quizName.includes('ocean') || quizName.includes('mountain') || 
                       quizName.includes('river') || quizName.includes('city') || quizName.includes('flag')) {
                category = 'Geography';
            } else if (quizName.includes('programming') || quizName.includes('coding') || quizName.includes('javascript') || 
                       quizName.includes('python') || quizName.includes('html') || quizName.includes('css') || 
                       quizName.includes('react') || quizName.includes('node') || quizName.includes('database') || 
                       quizName.includes('algorithm') || quizName.includes('software') || quizName.includes('computer')) {
                category = 'Programming';
            } else if (quizName.includes('sport') || quizName.includes('football') || quizName.includes('basketball') || 
                       quizName.includes('soccer') || quizName.includes('tennis') || quizName.includes('cricket') || 
                       quizName.includes('baseball') || quizName.includes('olympics') || quizName.includes('athlete')) {
                category = 'Sports';
            } else if (quizName.includes('movie') || quizName.includes('film') || quizName.includes('music') || 
                       quizName.includes('celebrity') || quizName.includes('tv') || quizName.includes('show') || 
                       quizName.includes('actor') || quizName.includes('singer') || quizName.includes('band')) {
                category = 'Entertainment';
            } else if (quizName.includes('art') || quizName.includes('painting') || quizName.includes('artist') || 
                       quizName.includes('sculpture') || quizName.includes('museum') || quizName.includes('design') || 
                       quizName.includes('color') || quizName.includes('draw')) {
                category = 'Art';
            } else if (quizName.includes('food') || quizName.includes('cooking') || quizName.includes('recipe') || 
                       quizName.includes('cuisine') || quizName.includes('restaurant') || quizName.includes('ingredient') || 
                       quizName.includes('dish') || quizName.includes('nutrition')) {
                category = 'Food & Cooking';
            } else if (quizName.includes('nature') || quizName.includes('animal') || quizName.includes('plant') || 
                       quizName.includes('bird') || quizName.includes('tree') || quizName.includes('flower') || 
                       quizName.includes('wildlife') || quizName.includes('environment')) {
                category = 'Nature';
            } else if (quizName.includes('business') || quizName.includes('economics') || quizName.includes('finance') || 
                       quizName.includes('marketing') || quizName.includes('management') || quizName.includes('investment') || 
                       quizName.includes('accounting') || quizName.includes('entrepreneur')) {
                category = 'Business';
            } else if (quizName.includes('health') || quizName.includes('medical') || quizName.includes('medicine') || 
                       quizName.includes('doctor') || quizName.includes('disease') || quizName.includes('fitness') || 
                       quizName.includes('nutrition') || quizName.includes('wellness')) {
                category = 'Health & Medicine';
            } else {
                // Dynamic category creation
                const words = quizName.split(' ');
                const potentialCategory = words.find(word => 
                    word.length > 3 && 
                    !['quiz', 'test', 'the', 'and', 'for', 'with', 'about'].includes(word)
                );
                
                if (potentialCategory) {
                    category = potentialCategory.charAt(0).toUpperCase() + potentialCategory.slice(1);
                } else {
                    category = 'General';
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

        // Add default categories if none exist
        if (Object.keys(categoryPerformance).length === 0) {
            return {
                'General': 0,
                'Science': 0,
                'Mathematics': 0,
                'History': 0,
                'Literature': 0,
                'Geography': 0,
                'Programming': 0
            };
        }

        return categoryPerformance;
    } catch (error) {
        console.error('Error getting category performance:', error);
        return {};
    }
};

// Get study time data
const getStudyTimeData = async (username, timeRange) => {
    try {
        const days = timeRange === 'year' ? 365 : timeRange === 'month' ? 30 : 7;
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

            labels.push(date.toLocaleDateString('en-US', { 
                weekday: timeRange === 'week' ? 'short' : undefined,
                month: timeRange !== 'week' ? 'short' : undefined,
                day: 'numeric'
            }));

            // Estimate study time (assuming 2 minutes per quiz on average)
            data.push(reports.length * 2);
        }

        return { labels, data };
    } catch (error) {
        console.error('Error getting study time data:', error);
        return { labels: [], data: [] };
    }
};

// Get difficulty statistics
const getDifficultyStats = async (username) => {
    try {
        const reports = await Report.find({ username });
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
        console.error('Error getting difficulty stats:', error);
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
                date: date.toISOString().split('T')[0],
                active: reports.length > 0,
                count: reports.length
            });
        }

        return streakData;
    } catch (error) {
        console.error('Error getting streak data:', error);
        return [];
    }
};

// Helper function to get badge descriptions
const getBadgeDescription = (badge) => {
    const descriptions = {
        'Beginner': 'Completed your first quiz',
        'Quiz Master': 'Completed 10 quizzes',
        'Streak Champion': 'Maintained a 7-day streak',
        'High Achiever': 'Scored 90%+ on a quiz',
        'Knowledge Seeker': 'Completed 50 quizzes',
        'Learning Enthusiast': 'Active for 30 days',
        'Perfect Score': 'Got 100% on a quiz'
    };
    return descriptions[badge] || 'Achievement unlocked!';
};

// Get leaderboard position for user
export const getUserLeaderboardPosition = async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Get all users sorted by XP
        const users = await UserQuiz.find({})
            .sort({ xp: -1 })
            .select('_id name xp');

        const position = users.findIndex(user => user._id.toString() === userId) + 1;
        const totalUsers = users.length;

        res.json({
            position,
            totalUsers,
            percentile: Math.round(((totalUsers - position) / totalUsers) * 100)
        });

    } catch (error) {
        console.error('Error getting leaderboard position:', error);
        res.status(500).json({ message: 'Error getting leaderboard position', error: error.message });
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
    
    // Enhanced category detection with dynamic category creation
    const categoryScores = {};
    reports.forEach(report => {
        let category = 'Other'; // Default for unmatched categories
        const quizName = report.quizName.toLowerCase();
        
        // Science categories
        if (quizName.includes('science') || quizName.includes('biology') || quizName.includes('chemistry') || 
            quizName.includes('physics') || quizName.includes('anatomy') || quizName.includes('botany') || 
            quizName.includes('zoology') || quizName.includes('genetics') || quizName.includes('ecology')) {
            category = 'Science';
        }
        // Math categories
        else if (quizName.includes('math') || quizName.includes('algebra') || quizName.includes('geometry') || 
                 quizName.includes('arithmetic') || quizName.includes('calculus') || quizName.includes('statistics') || 
                 quizName.includes('trigonometry') || quizName.includes('number') || quizName.includes('equation')) {
            category = 'Mathematics';
        }
        // History categories
        else if (quizName.includes('history') || quizName.includes('historical') || quizName.includes('ancient') || 
                 quizName.includes('world war') || quizName.includes('civilization') || quizName.includes('empire') || 
                 quizName.includes('revolution') || quizName.includes('medieval') || quizName.includes('dynasty')) {
            category = 'History';
        }
        // Literature categories
        else if (quizName.includes('literature') || quizName.includes('english') || quizName.includes('reading') || 
                 quizName.includes('poetry') || quizName.includes('novel') || quizName.includes('shakespeare') || 
                 quizName.includes('writing') || quizName.includes('grammar') || quizName.includes('author')) {
            category = 'Literature';
        }
        // Geography categories
        else if (quizName.includes('geography') || quizName.includes('country') || quizName.includes('capital') || 
                 quizName.includes('continent') || quizName.includes('ocean') || quizName.includes('mountain') || 
                 quizName.includes('river') || quizName.includes('city') || quizName.includes('flag')) {
            category = 'Geography';
        }
        // Programming/Technology categories
        else if (quizName.includes('programming') || quizName.includes('coding') || quizName.includes('javascript') || 
                 quizName.includes('python') || quizName.includes('html') || quizName.includes('css') || 
                 quizName.includes('react') || quizName.includes('node') || quizName.includes('database') || 
                 quizName.includes('algorithm') || quizName.includes('software') || quizName.includes('computer')) {
            category = 'Programming';
        }
        // Sports categories
        else if (quizName.includes('sport') || quizName.includes('football') || quizName.includes('basketball') || 
                 quizName.includes('soccer') || quizName.includes('tennis') || quizName.includes('cricket') || 
                 quizName.includes('baseball') || quizName.includes('olympics') || quizName.includes('athlete')) {
            category = 'Sports';
        }
        // Entertainment categories
        else if (quizName.includes('movie') || quizName.includes('film') || quizName.includes('music') || 
                 quizName.includes('celebrity') || quizName.includes('tv') || quizName.includes('show') || 
                 quizName.includes('actor') || quizName.includes('singer') || quizName.includes('band')) {
            category = 'Entertainment';
        }
        // Art categories
        else if (quizName.includes('art') || quizName.includes('painting') || quizName.includes('artist') || 
                 quizName.includes('sculpture') || quizName.includes('museum') || quizName.includes('design') || 
                 quizName.includes('color') || quizName.includes('draw')) {
            category = 'Art';
        }
        // Food categories
        else if (quizName.includes('food') || quizName.includes('cooking') || quizName.includes('recipe') || 
                 quizName.includes('cuisine') || quizName.includes('restaurant') || quizName.includes('ingredient') || 
                 quizName.includes('dish') || quizName.includes('nutrition')) {
            category = 'Food & Cooking';
        }
        // Nature categories
        else if (quizName.includes('nature') || quizName.includes('animal') || quizName.includes('plant') || 
                 quizName.includes('bird') || quizName.includes('tree') || quizName.includes('flower') || 
                 quizName.includes('wildlife') || quizName.includes('environment')) {
            category = 'Nature';
        }
        // Business categories
        else if (quizName.includes('business') || quizName.includes('economics') || quizName.includes('finance') || 
                 quizName.includes('marketing') || quizName.includes('management') || quizName.includes('investment') || 
                 quizName.includes('accounting') || quizName.includes('entrepreneur')) {
            category = 'Business';
        }
        // Health categories
        else if (quizName.includes('health') || quizName.includes('medical') || quizName.includes('medicine') || 
                 quizName.includes('doctor') || quizName.includes('disease') || quizName.includes('fitness') || 
                 quizName.includes('nutrition') || quizName.includes('wellness')) {
            category = 'Health & Medicine';
        }
        // Dynamic category creation for unmatched quizzes
        else {
            // Extract potential category from quiz name
            const words = quizName.split(' ');
            const potentialCategory = words.find(word => 
                word.length > 3 && 
                !['quiz', 'test', 'the', 'and', 'for', 'with', 'about'].includes(word)
            );
            
            if (potentialCategory) {
                // Capitalize first letter and create dynamic category
                category = potentialCategory.charAt(0).toUpperCase() + potentialCategory.slice(1);
            } else {
                category = 'General';
            }
        }
        
        if (!categoryScores[category]) categoryScores[category] = [];
        categoryScores[category].push((report.score / report.total) * 100);
    });
    
    // Check each achievement
    Object.entries(ACHIEVEMENTS).forEach(([key, achievement]) => {
        let unlocked = false;
        
        // Streak achievements
        if (key.startsWith('streak_')) {
            const required = parseInt(key.split('_')[1]);
            unlocked = currentStreak >= required;
        }
        
        // Quiz count achievements
        else if (key.startsWith('quizzes_')) {
            const required = parseInt(key.split('_')[1]);
            unlocked = totalQuizzes >= required;
        }
        
        // Score achievements
        else if (key.startsWith('score_')) {
            const required = parseInt(key.split('_')[1]);
            unlocked = averageScore >= required;
        }
        
        // Category achievements
        else if (key.startsWith('category_')) {
            const categoryKey = key.split('_')[1];
            let categoryName;
            
            // Map achievement keys to actual category names
            switch(categoryKey) {
                case 'math': categoryName = 'Mathematics'; break;
                case 'science': categoryName = 'Science'; break;
                case 'history': categoryName = 'History'; break;
                case 'literature': categoryName = 'Literature'; break;
                case 'geography': categoryName = 'Geography'; break;
                case 'programming': categoryName = 'Programming'; break;
                case 'sports': categoryName = 'Sports'; break;
                case 'entertainment': categoryName = 'Entertainment'; break;
                case 'art': categoryName = 'Art'; break;
                case 'food': categoryName = 'Food & Cooking'; break;
                case 'nature': categoryName = 'Nature'; break;
                case 'business': categoryName = 'Business'; break;
                case 'health': categoryName = 'Health & Medicine'; break;
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
        
        // Perfect score achievements
        else if (key === 'perfect_10') {
            unlocked = perfectScores >= 10;
        }
        
        // Level achievements
        else if (key.startsWith('level_')) {
            const required = parseInt(key.split('_')[1]);
            unlocked = userLevel >= required;
        }
        
        // Time-based achievements
        else if (key === 'early_bird') {
            // Check if user has completed quizzes before 8 AM
            const earlyReports = reports.filter(report => {
                const hour = new Date(report.createdAt).getHours();
                return hour < 8;
            });
            unlocked = earlyReports.length >= 5; // At least 5 early morning quizzes
        }
        else if (key === 'night_owl') {
            // Check if user has completed quizzes after 10 PM
            const lateReports = reports.filter(report => {
                const hour = new Date(report.createdAt).getHours();
                return hour >= 22;
            });
            unlocked = lateReports.length >= 5; // At least 5 late night quizzes
        }
        
        const achievementData = {
            id: key,
            ...achievement,
            unlocked,
            progress: getAchievementProgress(key, { totalQuizzes, averageScore, currentStreak, perfectScores, userLevel, reports, categoryScores })
        };
        
        if (unlocked) {
            unlockedAchievements.push(achievementData);
        } else {
            lockedAchievements.push(achievementData);
        }
    });
    
    return {
        unlocked: unlockedAchievements,
        locked: lockedAchievements,
        recent: unlockedAchievements.slice(-5), // Last 5 unlocked
        total: unlockedAchievements.length
    };
};

// Get achievement progress
const getAchievementProgress = (achievementKey, stats) => {
    const { totalQuizzes, averageScore, currentStreak, perfectScores, userLevel, reports, categoryScores } = stats;
    
    if (achievementKey.startsWith('streak_')) {
        const required = parseInt(achievementKey.split('_')[1]);
        return Math.min(100, (currentStreak / required) * 100);
    }
    
    if (achievementKey.startsWith('quizzes_')) {
        const required = parseInt(achievementKey.split('_')[1]);
        return Math.min(100, (totalQuizzes / required) * 100);
    }
    
    if (achievementKey.startsWith('score_')) {
        const required = parseInt(achievementKey.split('_')[1]);
        return Math.min(100, (averageScore / required) * 100);
    }
    
    if (achievementKey === 'perfect_10') {
        return Math.min(100, (perfectScores / 10) * 100);
    }
    
    if (achievementKey.startsWith('level_')) {
        const required = parseInt(achievementKey.split('_')[1]);
        return Math.min(100, (userLevel / required) * 100);
    }
    
    if (achievementKey.startsWith('category_') && categoryScores) {
        const categoryKey = achievementKey.split('_')[1];
        let categoryName;
        
        // Map achievement keys to actual category names
        switch(categoryKey) {
            case 'math': categoryName = 'Mathematics'; break;
            case 'science': categoryName = 'Science'; break;
            case 'history': categoryName = 'History'; break;
            case 'literature': categoryName = 'Literature'; break;
            case 'geography': categoryName = 'Geography'; break;
            case 'programming': categoryName = 'Programming'; break;
            case 'sports': categoryName = 'Sports'; break;
            case 'entertainment': categoryName = 'Entertainment'; break;
            case 'art': categoryName = 'Art'; break;
            case 'food': categoryName = 'Food & Cooking'; break;
            case 'nature': categoryName = 'Nature'; break;
            case 'business': categoryName = 'Business'; break;
            case 'health': categoryName = 'Health & Medicine'; break;
            default: categoryName = categoryKey;
        }
        
        const scores = categoryScores[categoryName] || [];
        if (scores.length === 0) return 0;
        
        const categoryAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return Math.min(100, (categoryAvg / 85) * 100);
    }
    
    if (achievementKey === 'early_bird' && reports) {
        const earlyReports = reports.filter(report => {
            const hour = new Date(report.createdAt).getHours();
            return hour < 8;
        });
        return Math.min(100, (earlyReports.length / 5) * 100);
    }
    
    if (achievementKey === 'night_owl' && reports) {
        const lateReports = reports.filter(report => {
            const hour = new Date(report.createdAt).getHours();
            return hour >= 22;
        });
        return Math.min(100, (lateReports.length / 5) * 100);
    }
    
    return 0;
};

// Get user achievements endpoint
export const getUserAchievementsEndpoint = async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await UserQuiz.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        const reports = await Report.find({ username: user.name });
        const currentStreak = await calculateStreak(user.name);
        
        const achievements = await getUserAchievements(user.name, user, reports, currentStreak);
        
        res.json(achievements);
    } catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ message: 'Error fetching achievements', error: error.message });
    }
};
