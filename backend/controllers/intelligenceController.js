import UserQuiz from "../models/User.js";
import Quiz from "../models/Quiz.js";
import Report from "../models/Report.js";
import { unlockThemesForLevel } from "./userController.js";

// Phase 2: Intelligence Layer Controller

// 1. Smart Quiz Recommendation Engine
export const getSmartRecommendations = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const user = await UserQuiz.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Get user's recent performance
        const recentReports = await Report.find({ username: user.name })
            .sort({ createdAt: -1 })
            .limit(10);

        const recommendations = [];

        // 1. Category-based recommendations
        const categoryRecommendations = await getCategoryBasedRecommendations(user, recentReports, userId, userRole);
        recommendations.push(...categoryRecommendations);

        // 2. Difficulty-based recommendations
        const difficultyRecommendations = await getDifficultyBasedRecommendations(user, recentReports, userId, userRole);
        recommendations.push(...difficultyRecommendations);

        // 3. Weakness improvement recommendations
        const weaknessRecommendations = await getWeaknessImprovementRecommendations(user, recentReports, userId, userRole);
        recommendations.push(...weaknessRecommendations);

        // 4. Popular quizzes for user level
        const popularRecommendations = await getPopularQuizzesForLevel(user, userId, userRole);
        recommendations.push(...popularRecommendations);

        // Remove duplicates and limit to top 10
        const uniqueRecommendations = recommendations
            .filter((rec, index, self) => 
                index === self.findIndex(r => r.quiz._id.toString() === rec.quiz._id.toString())
            )
            .slice(0, 10);

        res.json({
            recommendations: uniqueRecommendations,
            userProfile: {
                level: user.level,
                xp: user.xp,
                preferences: user.preferences,
                weakAreas: user.preferences.weakAreas,
                strongAreas: user.preferences.strongAreas
            }
        });

    } catch (error) {
        console.error("Error getting smart recommendations:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// Helper function: Get quiz filter based on user role
function getQuizFilter(userId, userRole) {
    if (userRole === "admin") {
        // Admin sees all quizzes
        return {};
    } else if (userRole === "premium") {
        // Premium sees their own quizzes and admin's quizzes
        return {
            $or: [
                { "createdBy._id": userId },
                { "createdBy._id": null }
            ]
        };
    } else {
        // Regular users see only admin's quizzes
        return { "createdBy._id": null };
    }
}

// Helper function: Category-based recommendations
async function getCategoryBasedRecommendations(user, recentReports, userId, userRole) {
    const recommendations = [];
    
    // Analyze user's favorite categories from recent performance
    const categoryStats = {};
    recentReports.forEach(report => {
        // Extract category from quiz name or use a default categorization
        const category = extractCategoryFromQuizName(report.quizName);
        if (!categoryStats[category]) {
            categoryStats[category] = { total: 0, correct: 0 };
        }
        categoryStats[category].total += report.total;
        categoryStats[category].correct += report.score;
    });

    // Find categories where user performs well
    const goodCategories = Object.entries(categoryStats)
        .filter(([_, stats]) => (stats.correct / stats.total) >= 0.7)
        .map(([category, _]) => category);

    if (goodCategories.length > 0) {
        const baseFilter = getQuizFilter(userId, userRole);
        const categoryQuizzes = await Quiz.find({
            ...baseFilter,
            category: { $in: goodCategories }
        }).limit(3);

        categoryQuizzes.forEach(quiz => {
            recommendations.push({
                quiz,
                reason: "based_on_favorite_category",
                confidence: 0.8,
                description: `Recommended because you perform well in ${quiz.category}`
            });
        });
    }

    return recommendations;
}

// Helper function: Difficulty-based recommendations
async function getDifficultyBasedRecommendations(user, recentReports, userId, userRole) {
    const recommendations = [];
    
    // Analyze user's performance to determine optimal difficulty
    let totalScore = 0;
    let totalQuizzes = recentReports.length;
    
    recentReports.forEach(report => {
        totalScore += (report.score / report.total);
    });
    
    const averagePerformance = totalQuizzes > 0 ? totalScore / totalQuizzes : 0.5;
    
    let recommendedDifficulty;
    if (averagePerformance >= 0.9) {
        recommendedDifficulty = "hard";
    } else if (averagePerformance >= 0.7) {
        recommendedDifficulty = "medium";
    } else {
        recommendedDifficulty = "easy";
    }

    // Get base filter for user role
    const baseFilter = getQuizFilter(userId, userRole);
    
    // Find quizzes with appropriate difficulty
    const difficultyQuizzes = await Quiz.aggregate([
        {
            $match: baseFilter
        },
        {
            $addFields: {
                averageDifficulty: {
                    $switch: {
                        branches: [
                            { 
                                case: { $gte: ["$difficultyDistribution.hard", "$difficultyDistribution.medium"] },
                                then: "hard"
                            },
                            {
                                case: { $gte: ["$difficultyDistribution.easy", "$difficultyDistribution.medium"] },
                                then: "easy"
                            }
                        ],
                        default: "medium"
                    }
                }
            }
        },
        {
            $match: { averageDifficulty: recommendedDifficulty }
        },
        { $limit: 3 }
    ]);

    difficultyQuizzes.forEach(quiz => {
        recommendations.push({
            quiz,
            reason: "difficulty_match",
            confidence: 0.7,
            description: `Recommended ${recommendedDifficulty} difficulty based on your recent performance`
        });
    });

    return recommendations;
}

// Helper function: Weakness improvement recommendations
async function getWeaknessImprovementRecommendations(user, recentReports, userId, userRole) {
    const recommendations = [];
    
    // Identify weak areas from recent performance
    const weakAreas = [];
    const categoryPerformance = {};
    
    recentReports.forEach(report => {
        const category = extractCategoryFromQuizName(report.quizName);
        if (!categoryPerformance[category]) {
            categoryPerformance[category] = { total: 0, correct: 0 };
        }
        categoryPerformance[category].total += report.total;
        categoryPerformance[category].correct += report.score;
    });

    // Find categories with performance below 60%
    Object.entries(categoryPerformance).forEach(([category, stats]) => {
        if ((stats.correct / stats.total) < 0.6) {
            weakAreas.push(category);
        }
    });

    if (weakAreas.length > 0) {
        const baseFilter = getQuizFilter(userId, userRole);
        const improvementQuizzes = await Quiz.find({
            ...baseFilter,
            category: { $in: weakAreas }
        }).limit(2);

        improvementQuizzes.forEach(quiz => {
            recommendations.push({
                quiz,
                reason: "weakness_improvement",
                confidence: 0.9,
                description: `Recommended to improve your performance in ${quiz.category}`
            });
        });
    }

    return recommendations;
}

// Helper function: Popular quizzes for user level
async function getPopularQuizzesForLevel(user, userId, userRole) {
    const recommendations = [];
    
    // Find popular quizzes (high attempts and good average scores) with user filter
    const baseFilter = getQuizFilter(userId, userRole);
    const popularQuizzes = await Quiz.find({
        ...baseFilter,
        totalAttempts: { $gte: 5 },
        averageScore: { $gte: 0.6 }
    })
    .sort({ popularityScore: -1 })
    .limit(2);

    popularQuizzes.forEach(quiz => {
        recommendations.push({
            quiz,
            reason: "popular_choice",
            confidence: 0.6,
            description: "Popular quiz with good reviews from other users"
        });
    });

    return recommendations;
}

// Helper function to extract category from quiz name
function extractCategoryFromQuizName(quizName) {
    const lowercaseName = quizName.toLowerCase();
    
    if (lowercaseName.includes('math') || lowercaseName.includes('algebra') || lowercaseName.includes('geometry') || lowercaseName.includes('calculus') || lowercaseName.includes('statistics')) {
        return 'mathematics';
    } else if (lowercaseName.includes('science') || lowercaseName.includes('physics') || lowercaseName.includes('chemistry') || lowercaseName.includes('biology')) {
        return 'science';
    } else if (lowercaseName.includes('history')) {
        return 'history';
    } else if (lowercaseName.includes('literature') || lowercaseName.includes('english')) {
        return 'literature';
    } else if (lowercaseName.includes('geography')) {
        return 'geography';
    } else if (lowercaseName.includes('programming') || lowercaseName.includes('coding') || lowercaseName.includes('computer') || lowercaseName.includes('java') || lowercaseName.includes('python') || lowercaseName.includes('javascript') || lowercaseName.includes('c++') || lowercaseName.includes('software')) {
        return 'programming';
    } else if (lowercaseName.includes('sports')) {
        return 'sports';
    } else {
        return 'general';
    }
}

// 2. Adaptive Difficulty System
export const getAdaptiveDifficulty = async (req, res) => {
    try {
        const userId = req.user.id;
        const { category } = req.query;
        
        const user = await UserQuiz.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Get all user's reports first
        const allReports = await Report.find({ 
            username: user.name
        }).sort({ createdAt: -1 });

        console.log(`[DEBUG] Adaptive Difficulty - User: ${user.name}, Category: ${category}`);
        console.log(`[DEBUG] All reports found: ${allReports.length}`);
        console.log(`[DEBUG] Report quiz names:`, allReports.map(r => r.quizName));

        let categoryReports;
        if (category && category.toLowerCase() !== 'general') {
            // Filter reports by category extracted from quiz names
            categoryReports = allReports.filter(report => {
                const reportCategory = extractCategoryFromQuizName(report.quizName);
                console.log(`[DEBUG] Quiz "${report.quizName}" -> Category: ${reportCategory}`);
                return reportCategory.toLowerCase() === category.toLowerCase();
            }).slice(0, 5);
            console.log(`[DEBUG] Filtered reports for category "${category}": ${categoryReports.length}`);
        } else {
            // For 'general' category, get all recent reports
            categoryReports = allReports.slice(0, 5);
            console.log(`[DEBUG] General category - using all reports: ${categoryReports.length}`);
        }

        let recommendedDifficulty = "medium";
        let confidence = 0.5;

        if (categoryReports.length >= 3) {
            const avgScore = categoryReports.reduce((sum, report) => 
                sum + (report.score / report.total), 0) / categoryReports.length;

            if (avgScore >= 0.85) {
                recommendedDifficulty = "hard";
                confidence = 0.9;
            } else if (avgScore >= 0.65) {
                recommendedDifficulty = "medium";
                confidence = 0.8;
            } else {
                recommendedDifficulty = "easy";
                confidence = 0.7;
            }
        } else if (categoryReports.length > 0) {
            // If we have some data but less than 3 quizzes, use it with lower confidence
            const avgScore = categoryReports.reduce((sum, report) => 
                sum + (report.score / report.total), 0) / categoryReports.length;

            if (avgScore >= 0.8) {
                recommendedDifficulty = "medium";
                confidence = 0.6;
            } else if (avgScore < 0.5) {
                recommendedDifficulty = "easy";
                confidence = 0.6;
            } else {
                recommendedDifficulty = "medium";
                confidence = 0.5;
            }
        } else {
            // No reports found, use user preference if available
            if (user.preferences?.preferredDifficulty) {
                recommendedDifficulty = user.preferences.preferredDifficulty;
                confidence = 0.3;
            } else {
                recommendedDifficulty = "medium";
                confidence = 0.2;
            }
        }

        const response = {
            recommendedDifficulty,
            confidence,
            basedOnQuizzes: categoryReports.length,
            category: category || "general"
        };

        console.log(`[DEBUG] Adaptive Difficulty Response:`, response);
        res.json(response);

    } catch (error) {
        console.error("Error calculating adaptive difficulty:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// 3. Learning Analytics & Performance Predictions
export const getLearningAnalytics = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await UserQuiz.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Get comprehensive performance data
        const allReports = await Report.find({ username: user.name })
            .sort({ createdAt: -1 });

        // Calculate various analytics
        const analytics = {
            overview: calculateOverviewStats(allReports),
            trends: calculatePerformanceTrends(allReports),
            predictions: calculatePerformancePredictions(allReports),
            strengths: calculateStrengths(allReports),
            weaknesses: calculateWeaknesses(allReports),
            studyRecommendations: generateStudyRecommendations(allReports, user),
            optimalStudyTime: calculateOptimalStudyTime(allReports)
        };

        res.json(analytics);

    } catch (error) {
        console.error("Error getting learning analytics:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// Helper functions for learning analytics
function calculateOverviewStats(reports) {
    if (reports.length === 0) return null;

    const totalQuizzes = reports.length;
    const totalQuestions = reports.reduce((sum, r) => sum + r.total, 0);
    const totalCorrect = reports.reduce((sum, r) => sum + r.score, 0);
    const averageScore = totalCorrect / totalQuestions;

    return {
        totalQuizzes,
        totalQuestions,
        averageScore: Math.round(averageScore * 100),
        improvementRate: calculateImprovementRate(reports)
    };
}

function calculatePerformanceTrends(reports) {
    if (reports.length === 0) return [];

    const last30Days = reports.filter(r => 
        new Date(r.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    // If we don't have much recent data, use all available data
    const dataToUse = last30Days.length >= 2 ? last30Days : reports.slice(-10);

    const weeklyData = {};
    dataToUse.forEach(report => {
        const reportDate = new Date(report.createdAt);
        const weeksAgo = Math.floor((Date.now() - reportDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const weekKey = Math.min(weeksAgo, 4); // Group older data into week 4+
        
        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { total: 0, correct: 0, count: 0 };
        }
        weeklyData[weekKey].total += report.total;
        weeklyData[weekKey].correct += report.score;
        weeklyData[weekKey].count += 1;
    });

    // Create array with at least 4 weeks of data
    const trends = [];
    for (let i = 0; i < 4; i++) {
        const weekData = weeklyData[i];
        if (weekData && weekData.total > 0) {
            trends.push({
                week: i,
                averageScore: Math.round((weekData.correct / weekData.total) * 100),
                quizzesTaken: weekData.count,
                label: i === 0 ? 'This Week' : i === 1 ? 'Last Week' : `${i} weeks ago`
            });
        } else {
            trends.push({
                week: i,
                averageScore: 0,
                quizzesTaken: 0,
                label: i === 0 ? 'This Week' : i === 1 ? 'Last Week' : `${i} weeks ago`
            });
        }
    }

    return trends;
}

function calculatePerformancePredictions(reports) {
    if (reports.length < 3) {
        return {
            nextQuizPrediction: null,
            confidenceLevel: "insufficient_data"
        };
    }

    const recentPerformance = reports.slice(0, Math.min(5, reports.length));
    const avgRecent = recentPerformance.reduce((sum, r) => sum + (r.score / r.total), 0) / recentPerformance.length;
    
    const trend = calculateTrend(recentPerformance);
    let prediction = avgRecent;
    
    if (trend === "improving") {
        prediction = Math.min(1, avgRecent + 0.05);
    } else if (trend === "declining") {
        prediction = Math.max(0, avgRecent - 0.05);
    }

    let confidenceLevel = "medium";
    if (reports.length >= 10) {
        confidenceLevel = "high";
    } else if (reports.length < 5) {
        confidenceLevel = "medium";
    }

    return {
        nextQuizPrediction: Math.round(prediction * 100),
        confidenceLevel,
        trend
    };
}

function calculateStrengths(reports) {
    const categoryStats = {};
    
    reports.forEach(report => {
        const category = extractCategoryFromQuizName(report.quizName);
        if (!categoryStats[category]) {
            categoryStats[category] = { total: 0, correct: 0, count: 0 };
        }
        categoryStats[category].total += report.total;
        categoryStats[category].correct += report.score;
        categoryStats[category].count += 1;
    });

    return Object.entries(categoryStats)
        .filter(([_, stats]) => stats.count >= 2 && (stats.correct / stats.total) >= 0.75)
        .map(([category, stats]) => ({
            category,
            averageScore: Math.round((stats.correct / stats.total) * 100),
            quizzesTaken: stats.count
        }))
        .sort((a, b) => b.averageScore - a.averageScore);
}

function calculateWeaknesses(reports) {
    const categoryStats = {};
    
    reports.forEach(report => {
        const category = extractCategoryFromQuizName(report.quizName);
        if (!categoryStats[category]) {
            categoryStats[category] = { total: 0, correct: 0, count: 0 };
        }
        categoryStats[category].total += report.total;
        categoryStats[category].correct += report.score;
        categoryStats[category].count += 1;
    });

    return Object.entries(categoryStats)
        .filter(([_, stats]) => stats.count >= 2 && (stats.correct / stats.total) < 0.65)
        .map(([category, stats]) => ({
            category,
            averageScore: Math.round((stats.correct / stats.total) * 100),
            quizzesTaken: stats.count,
            improvementNeeded: Math.round((0.75 - (stats.correct / stats.total)) * 100)
        }))
        .sort((a, b) => a.averageScore - b.averageScore);
}

function generateStudyRecommendations(reports, user) {
    const recommendations = [];
    
    // Time-based recommendations
    const hourStats = {};
    reports.forEach(report => {
        const hour = new Date(report.createdAt).getHours();
        if (!hourStats[hour]) {
            hourStats[hour] = { total: 0, correct: 0, count: 0 };
        }
        hourStats[hour].total += report.total;
        hourStats[hour].correct += report.score;
        hourStats[hour].count += 1;
    });

    const bestHour = Object.entries(hourStats)
        .filter(([_, stats]) => stats.count >= 2)
        .sort(([_, a], [__, b]) => (b.correct / b.total) - (a.correct / a.total))[0];

    if (bestHour) {
        const hour = parseInt(bestHour[0]);
        let timeOfDay = "morning";
        if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
        else if (hour >= 17 && hour < 21) timeOfDay = "evening";
        else if (hour >= 21 || hour < 6) timeOfDay = "night";

        recommendations.push({
            type: "optimal_time",
            title: "Best Study Time",
            description: `You perform best during ${timeOfDay} (around ${hour}:00)`,
            actionable: true
        });
    }

    // Frequency recommendations
    const avgQuizzesPerWeek = reports.length / Math.max(1, Math.ceil((Date.now() - new Date(reports[reports.length - 1]?.createdAt || Date.now())) / (7 * 24 * 60 * 60 * 1000)));
    
    if (avgQuizzesPerWeek < 3) {
        recommendations.push({
            type: "frequency",
            title: "Increase Practice Frequency",
            description: "Try to take at least 3-4 quizzes per week for better retention",
            actionable: true
        });
    }

    return recommendations;
}

function calculateOptimalStudyTime(reports) {
    const hourlyPerformance = {};
    
    reports.forEach(report => {
        const hour = new Date(report.createdAt).getHours();
        if (!hourlyPerformance[hour]) {
            hourlyPerformance[hour] = [];
        }
        hourlyPerformance[hour].push(report.score / report.total);
    });

    const averageByHour = Object.entries(hourlyPerformance)
        .map(([hour, scores]) => ({
            hour: parseInt(hour),
            average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
            count: scores.length
        }))
        .filter(item => item.count >= 2)
        .sort((a, b) => b.average - a.average);

    return averageByHour.length > 0 ? averageByHour[0] : null;
}

function calculateImprovementRate(reports) {
    if (reports.length < 6) return 0;
    
    const recentAvg = reports.slice(0, 3).reduce((sum, r) => sum + (r.score / r.total), 0) / 3;
    const olderAvg = reports.slice(3, 6).reduce((sum, r) => sum + (r.score / r.total), 0) / 3;
    
    return Math.round((recentAvg - olderAvg) * 100);
}

function calculateTrend(reports) {
    if (reports.length < 3) return "stable";
    
    const scores = reports.map(r => r.score / r.total);
    let improvements = 0;
    let declines = 0;
    
    for (let i = 1; i < scores.length; i++) {
        if (scores[i-1] > scores[i]) improvements++;
        else if (scores[i-1] < scores[i]) declines++;
    }
    
    if (improvements > declines + 1) return "improving";
    if (declines > improvements + 1) return "declining";
    return "stable";
}

// 4. Update user preferences based on quiz activity
export const updateUserPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const { quizId, score, totalQuestions, timeSpent, category, difficulty } = req.body;
        
        const user = await UserQuiz.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Add to performance history
        user.performanceHistory.push({
            quizId,
            category,
            difficulty,
            score,
            totalQuestions,
            timeSpent,
            date: new Date()
        });

        // Keep only last 50 records
        if (user.performanceHistory.length > 50) {
            user.performanceHistory = user.performanceHistory.slice(-50);
        }

        // Update preferences based on performance
        const performancePercentage = score / totalQuestions;
        
        // Update favorite categories
        if (performancePercentage >= 0.7) {
            if (!user.preferences.favoriteCategories.includes(category)) {
                user.preferences.favoriteCategories.push(category);
            }
            
            // Add to strong areas
            if (!user.preferences.strongAreas.includes(category)) {
                user.preferences.strongAreas.push(category);
            }
            
            // Remove from weak areas if present
            user.preferences.weakAreas = user.preferences.weakAreas.filter(area => area !== category);
        } else if (performancePercentage < 0.5) {
            // Add to weak areas
            if (!user.preferences.weakAreas.includes(category)) {
                user.preferences.weakAreas.push(category);
            }
            
            // Remove from strong areas if present
            user.preferences.strongAreas = user.preferences.strongAreas.filter(area => area !== category);
        }

        // Update preferred difficulty based on recent performance
        const recentPerformance = user.performanceHistory.slice(-5);
        if (recentPerformance.length >= 3) {
            const avgScore = recentPerformance.reduce((sum, p) => sum + (p.score / p.totalQuestions), 0) / recentPerformance.length;
            
            if (avgScore >= 0.85) {
                user.preferences.preferredDifficulty = "hard";
            } else if (avgScore >= 0.65) {
                user.preferences.preferredDifficulty = "medium";
            } else {
                user.preferences.preferredDifficulty = "easy";
            }
        }

        await user.save();
        
        res.json({
            message: "User preferences updated successfully",
            preferences: user.preferences
        });

    } catch (error) {
        console.error("Error updating user preferences:", error);
        res.status(500).json({ error: "Server error" });
    }
};
