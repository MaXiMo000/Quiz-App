import { LearningPath, UserPathProgress, Competency, UserCompetency } from "../models/LearningPath.js";
import User from "../models/User.js";
import Quiz from "../models/Quiz.js";
import Report from "../models/Report.js";
import { seedLearningPaths } from "../utils/seedLearningPaths.js";

// ===================== LEARNING PATHS =====================

// Get all learning paths for user
export const getLearningPaths = async (req, res) => {
    try {
        const userId = req.user.id;
        const { category, level, search } = req.query;
        
        // Auto-seed if no learning paths exist
        await ensureBasicData();
        
        // Build filter
        let filter = { isActive: true, isPublic: true };
        if (category) filter.category = category;
        if (level) filter.level = level;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        const paths = await LearningPath.find(filter)
            .populate('createdBy._id', 'name')
            .sort({ createdAt: -1 });
        
        // Get user's progress for each path
        const userProgress = await UserPathProgress.find({ 
            user: userId,
            learningPath: { $in: paths.map(p => p._id) }
        });
        
        // Enhance paths with user quiz history and recommended paths
        const pathsWithProgress = await enhancePathsWithUserData(paths, userProgress, userId);
        
        res.json({ paths: pathsWithProgress });
        
    } catch (error) {
        console.error("Error getting learning paths:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get specific learning path with detailed progress
export const getLearningPath = async (req, res) => {
    try {
        const userId = req.user.id;
        const { pathId } = req.params;
        
        const path = await LearningPath.findById(pathId)
            .populate('createdBy._id', 'name');
        
        if (!path) {
            return res.status(404).json({ message: "Learning path not found" });
        }
        
        // Get user's progress
        let userProgress = await UserPathProgress.findOne({
            user: userId,
            learningPath: pathId
        });
        
        // If no progress exists, create initial progress
        if (!userProgress) {
            userProgress = await createInitialProgress(userId, path);
        }
        
        // Calculate available nodes (unlocked based on prerequisites)
        const availableNodes = calculateAvailableNodes(path, userProgress);
        
        res.json({
            path: path.toObject(),
            userProgress: userProgress.toObject(),
            availableNodes
        });
        
    } catch (error) {
        console.error("Error getting learning path:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Start learning path
export const startLearningPath = async (req, res) => {
    try {
        const userId = req.user.id;
        const { pathId } = req.params;
        
        const path = await LearningPath.findById(pathId);
        if (!path) {
            return res.status(404).json({ message: "Learning path not found" });
        }
        
        // Check if user already has progress
        let userProgress = await UserPathProgress.findOne({
            user: userId,
            learningPath: pathId
        });
        
        let isNewProgress = false;
        
        if (userProgress) {
            if (userProgress.status === "completed") {
                return res.status(400).json({ message: "Learning path already completed" });
            }
            
            // Resume existing progress
            userProgress.status = "in_progress";
            await userProgress.save();
        } else {
            // Create new progress
            userProgress = await createInitialProgress(userId, path);
            isNewProgress = true;
        }
        
        // Update path stats only for new learners
        if (isNewProgress) {
            path.stats.totalLearners += 1;
            await path.save();
        }
        
        res.json({
            message: "Learning path started successfully",
            userProgress: userProgress.toObject()
        });
        
    } catch (error) {
        console.error("Error starting learning path:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update node progress
export const updateNodeProgress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { pathId, nodeId } = req.params;
        const { status, score, timeSpent } = req.body;
        
        const userProgress = await UserPathProgress.findOne({
            user: userId,
            learningPath: pathId
        });
        
        if (!userProgress) {
            return res.status(404).json({ message: "User progress not found" });
        }
        
        // Find node progress
        let nodeProgress = userProgress.nodeProgress.find(n => n.nodeId === nodeId);
        if (!nodeProgress) {
            return res.status(404).json({ message: "Node not found" });
        }
        
        // Update node progress
        nodeProgress.status = status;
        if (score !== undefined) {
            nodeProgress.bestScore = Math.max(nodeProgress.bestScore, score);
            nodeProgress.mastery = calculateMastery(nodeProgress.bestScore, nodeProgress.attempts);
        }
        if (timeSpent) {
            nodeProgress.timeSpent += timeSpent;
            userProgress.timeSpent += timeSpent;
        }
        
        if (status === "completed") {
            nodeProgress.completionDate = new Date();
            nodeProgress.attempts += 1;
            
            // Schedule spaced repetition
            scheduleSpacedRepetition(nodeProgress, score);
            
            // Unlock next nodes
            await unlockNextNodes(userProgress, pathId, nodeId);
        }
        
        // Update overall progress
        userProgress.overallProgress = calculateOverallProgress(userProgress);
        
        // Check if path is completed
        if (userProgress.overallProgress === 100) {
            userProgress.status = "completed";
            
            // Award completion XP
            const user = await User.findById(userId);
            const completionXP = 500; // Base completion XP
            user.xp += completionXP;
            user.totalXP += completionXP;
            await user.save();
        }
        
        await userProgress.save();
        
        // Generate adaptive recommendations
        const recommendations = await generateAdaptiveRecommendations(userProgress, pathId);
        
        res.json({
            message: "Node progress updated successfully",
            userProgress: userProgress.toObject(),
            recommendations
        });
        
    } catch (error) {
        console.error("Error updating node progress:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get user's learning analytics
export const getLearningAnalytics = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get all user's learning paths
        const userPaths = await UserPathProgress.find({ user: userId })
            .populate('learningPath', 'title category level')
            .sort({ updatedAt: -1 });
        
        // Get competency progress
        const competencies = await UserCompetency.find({ user: userId })
            .populate('competency', 'name category level');
        
        // Calculate learning metrics
        const analytics = {
            totalPaths: userPaths.length,
            completedPaths: userPaths.filter(p => p.status === "completed").length,
            totalTimeSpent: userPaths.reduce((sum, p) => sum + p.timeSpent, 0),
            averageProgress: userPaths.length > 0 
                ? userPaths.reduce((sum, p) => sum + p.overallProgress, 0) / userPaths.length
                : 0,
            
            // Progress by category
            categoryProgress: calculateCategoryProgress(userPaths),
            
            // Learning velocity (progress per hour)
            learningVelocity: calculateLearningVelocity(userPaths),
            
            // Strengths and weaknesses
            strengths: extractStrengths(userPaths),
            weaknesses: extractWeaknesses(userPaths),
            
            // Competency overview
            competencyStats: {
                total: competencies.length,
                mastered: competencies.filter(c => c.currentLevel >= 80).length,
                inProgress: competencies.filter(c => c.currentLevel > 0 && c.currentLevel < 80).length
            },
            
            // Recent activity
            recentActivity: getRecentActivity(userPaths),
            
            // Upcoming reviews (spaced repetition)
            upcomingReviews: getUpcomingReviews(userPaths)
        };
        
        res.json({ analytics });
        
    } catch (error) {
        console.error("Error getting learning analytics:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ===================== COMPETENCY MANAGEMENT =====================

// Get user's competencies
export const getUserCompetencies = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const userCompetencies = await UserCompetency.find({ user: userId })
            .populate('competency')
            .sort({ currentLevel: -1 });
        
        res.json({ competencies: userCompetencies });
        
    } catch (error) {
        console.error("Error getting user competencies:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update competency based on quiz performance
export const updateCompetencyFromQuiz = async (req, res) => {
    try {
        const userId = req.user.id;
        const { quizId, score, competencies } = req.body;
        
        if (!competencies || competencies.length === 0) return res.json({ message: "No competencies to update" });
        
        for (const competencyName of competencies) {
            let userCompetency = await UserCompetency.findOne({
                user: userId,
                competency: await getCompetencyByName(competencyName)
            });
            
            if (!userCompetency) {
                // Create new competency tracking
                const competency = await getCompetencyByName(competencyName);
                if (competency) {
                    userCompetency = new UserCompetency({
                        user: userId,
                        competency: competency._id,
                        currentLevel: 0
                    });
                }
            }
            
            if (userCompetency) {
                // Add evidence and update level
                userCompetency.evidence.push({
                    type: "quiz_score",
                    score,
                    source: quizId,
                    date: new Date()
                });
                
                // Calculate new competency level
                const improvement = calculateCompetencyImprovement(score, userCompetency.currentLevel);
                userCompetency.currentLevel = Math.min(100, userCompetency.currentLevel + improvement);
                
                if (userCompetency.currentLevel >= userCompetency.targetLevel && !userCompetency.masteryDate) {
                    userCompetency.masteryDate = new Date();
                }
                
                userCompetency.learningHistory.push({
                    activity: `Quiz completion: ${score}%`,
                    improvement: improvement,
                    date: new Date()
                });
                
                await userCompetency.save();
            }
        }
        
        res.json({ message: "Competencies updated successfully" });
        
    } catch (error) {
        console.error("Error updating competency:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ===================== HELPER FUNCTIONS =====================

// Create initial progress for a learning path
async function createInitialProgress(userId, path) {
    const nodeProgress = path.nodes.map(node => ({
        nodeId: node.id,
        status: node.prerequisites.length === 0 ? "available" : "locked",
        timeSpent: 0,
        attempts: 0,
        bestScore: 0,
        mastery: 0,
        reviewCount: 0,
        easeFactor: 2.5,
        interval: 1
    }));
    
    const objectiveProgress = path.objectives.map(obj => ({
        objectiveId: obj.id,
        completed: false,
        currentScore: 0
    }));
    
    const userProgress = new UserPathProgress({
        user: userId,
        learningPath: path._id,
        status: "in_progress",
        overallProgress: 0,
        timeSpent: 0,
        nodeProgress,
        objectiveProgress,
        analytics: {
            strengths: [],
            weaknesses: [],
            learningVelocity: 1,
            retentionRate: 0.8,
            preferredDifficulty: "medium"
        },
        recommendations: []
    });
    
    await userProgress.save();
    return userProgress;
}

// Calculate available nodes based on prerequisites
function calculateAvailableNodes(path, userProgress) {
    return path.nodes.filter(node => {
        const nodeProgress = userProgress.nodeProgress.find(n => n.nodeId === node.id);
        if (!nodeProgress) return false;
        
        // If already available or completed, return true
        if (nodeProgress.status !== "locked") return true;
        
        // Check if all prerequisites are completed
        return node.prerequisites.every(prereqId => {
            const prereqProgress = userProgress.nodeProgress.find(n => n.nodeId === prereqId);
            return prereqProgress && prereqProgress.status === "completed";
        });
    });
}

// Calculate mastery level based on score and attempts
function calculateMastery(bestScore, attempts) {
    // Base mastery on score, with slight penalty for multiple attempts
    const baseScore = bestScore;
    const attemptPenalty = Math.max(0, (attempts - 1) * 5);
    return Math.max(0, Math.min(100, baseScore - attemptPenalty));
}

// Schedule spaced repetition for a node
function scheduleSpacedRepetition(nodeProgress, score) {
    const quality = score >= 80 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
    
    if (quality >= 3) {
        if (nodeProgress.reviewCount === 0) {
            nodeProgress.interval = 1;
        } else if (nodeProgress.reviewCount === 1) {
            nodeProgress.interval = 6;
        } else {
            nodeProgress.interval = Math.round(nodeProgress.interval * nodeProgress.easeFactor);
        }
        nodeProgress.easeFactor = Math.max(1.3, 
            nodeProgress.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        );
    } else {
        nodeProgress.interval = 1;
        nodeProgress.easeFactor = Math.max(1.3, nodeProgress.easeFactor - 0.2);
    }
    
    nodeProgress.reviewCount++;
    nodeProgress.nextReviewDate = new Date(Date.now() + nodeProgress.interval * 24 * 60 * 60 * 1000);
}

// Unlock next nodes after completing a node
async function unlockNextNodes(userProgress, pathId, completedNodeId) {
    const path = await LearningPath.findById(pathId);
    
    path.nodes.forEach(node => {
        if (node.prerequisites.includes(completedNodeId)) {
            const nodeProgress = userProgress.nodeProgress.find(n => n.nodeId === node.id);
            if (nodeProgress && nodeProgress.status === "locked") {
                // Check if all other prerequisites are completed
                const allPrereqsCompleted = node.prerequisites.every(prereqId => {
                    const prereqProgress = userProgress.nodeProgress.find(n => n.nodeId === prereqId);
                    return prereqProgress && prereqProgress.status === "completed";
                });
                
                if (allPrereqsCompleted) {
                    nodeProgress.status = "available";
                }
            }
        }
    });
}

// Calculate overall progress for a learning path
function calculateOverallProgress(userProgress) {
    const totalNodes = userProgress.nodeProgress.length;
    const completedNodes = userProgress.nodeProgress.filter(n => n.status === "completed").length;
    return totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;
}

// Generate adaptive recommendations based on user progress
async function generateAdaptiveRecommendations(userProgress, pathId) {
    const recommendations = [];
    
    // Check for nodes due for review
    const dueForReview = userProgress.nodeProgress.filter(n => 
        n.nextReviewDate && n.nextReviewDate <= new Date()
    );
    
    if (dueForReview.length > 0) {
        recommendations.push({
            type: "review",
            message: `You have ${dueForReview.length} concepts due for review to strengthen retention`,
            priority: 3,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
    }
    
    // Check learning velocity and suggest breaks
    if (userProgress.analytics.learningVelocity > 2) {
        recommendations.push({
            type: "break",
            message: "You're learning fast! Consider taking a short break to improve retention",
            priority: 1,
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
        });
    }
    
    // Suggest difficulty adjustment based on recent performance
    const recentNodes = userProgress.nodeProgress
        .filter(n => n.status === "completed")
        .slice(-3);
    
    if (recentNodes.length >= 3) {
        const avgScore = recentNodes.reduce((sum, n) => sum + n.bestScore, 0) / recentNodes.length;
        
        if (avgScore > 90) {
            recommendations.push({
                type: "difficulty_adjust",
                message: "You're excelling! Consider trying more challenging content",
                priority: 2,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
        } else if (avgScore < 60) {
            recommendations.push({
                type: "difficulty_adjust",
                message: "Consider reviewing fundamentals before advancing",
                priority: 4,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
        }
    }
    
    return recommendations;
}

// Calculate category progress for analytics
function calculateCategoryProgress(userPaths) {
    const categoryStats = {};
    
    userPaths.forEach(path => {
        const category = path.learningPath.category;
        if (!categoryStats[category]) {
            categoryStats[category] = { total: 0, completed: 0, totalProgress: 0 };
        }
        
        categoryStats[category].total++;
        categoryStats[category].totalProgress += path.overallProgress;
        
        if (path.status === "completed") {
            categoryStats[category].completed++;
        }
    });
    
    // Calculate averages
    Object.keys(categoryStats).forEach(category => {
        const stats = categoryStats[category];
        stats.averageProgress = stats.total > 0 ? stats.totalProgress / stats.total : 0;
        stats.completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    });
    
    return categoryStats;
}

// Calculate learning velocity
function calculateLearningVelocity(userPaths) {
    const activePaths = userPaths.filter(p => p.status === "in_progress");
    if (activePaths.length === 0) return 1;
    
    const totalProgress = activePaths.reduce((sum, p) => sum + p.overallProgress, 0);
    const totalTime = activePaths.reduce((sum, p) => sum + p.timeSpent, 0);
    
    return totalTime > 0 ? totalProgress / (totalTime / 60) : 1; // progress per hour
}

// Extract learning strengths
function extractStrengths(userPaths) {
    const categoryPerformance = {};
    
    userPaths.forEach(path => {
        const category = path.learningPath.category;
        if (!categoryPerformance[category]) {
            categoryPerformance[category] = [];
        }
        categoryPerformance[category].push(path.overallProgress);
    });
    
    return Object.entries(categoryPerformance)
        .filter(([_, scores]) => scores.length > 0)
        .map(([category, scores]) => ({
            category,
            averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length
        }))
        .filter(item => item.averageScore > 75)
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 3)
        .map(item => item.category);
}

// Extract learning weaknesses
function extractWeaknesses(userPaths) {
    const categoryPerformance = {};
    
    userPaths.forEach(path => {
        const category = path.learningPath.category;
        if (!categoryPerformance[category]) {
            categoryPerformance[category] = [];
        }
        categoryPerformance[category].push(path.overallProgress);
    });
    
    return Object.entries(categoryPerformance)
        .filter(([_, scores]) => scores.length > 0)
        .map(([category, scores]) => ({
            category,
            averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length
        }))
        .filter(item => item.averageScore < 60)
        .sort((a, b) => a.averageScore - b.averageScore)
        .slice(0, 3)
        .map(item => item.category);
}

// Get recent activity
function getRecentActivity(userPaths) {
    return userPaths
        .filter(path => path.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 10)
        .map(path => ({
            pathTitle: path.learningPath.title,
            progress: path.overallProgress,
            lastActivity: path.updatedAt
        }));
}

// Get upcoming reviews
function getUpcomingReviews(userPaths) {
    const upcomingReviews = [];
    
    userPaths.forEach(path => {
        path.nodeProgress.forEach(node => {
            if (node.nextReviewDate && node.nextReviewDate > new Date()) {
                upcomingReviews.push({
                    pathTitle: path.learningPath.title,
                    nodeId: node.nodeId,
                    reviewDate: node.nextReviewDate,
                    mastery: node.mastery
                });
            }
        });
    });
    
    return upcomingReviews
        .sort((a, b) => a.reviewDate - b.reviewDate)
        .slice(0, 10);
}

// Get competency by name
async function getCompetencyByName(name) {
    return await Competency.findOne({ name });
}

// Calculate competency improvement based on quiz score
function calculateCompetencyImprovement(score, currentLevel) {
    const baseImprovement = score / 10; // 1-10 points based on score
    const levelFactor = Math.max(0.1, 1 - (currentLevel / 100)); // Slower growth at higher levels
    return Math.round(baseImprovement * levelFactor);
}

// ===================== DATA INTEGRATION & AUTO-SEEDING =====================

// Ensure basic learning paths exist in database
async function ensureBasicData() {
    try {
        const pathCount = await LearningPath.countDocuments();
        
        if (pathCount === 0) {
            console.log('🌱 No learning paths found. Auto-seeding database...');
            await seedLearningPaths();
            console.log('✅ Learning paths seeded successfully');
        }
    } catch (error) {
        console.error('❌ Error in auto-seeding:', error);
    }
}

// Enhance learning paths with user quiz history and recommendations
async function enhancePathsWithUserData(paths, userProgress, userId) {
    try {
        // Get user's quiz history
        const userReports = await Report.find({}).limit(50).sort({ createdAt: -1 });
        
        // Get user details to match reports
        const user = await User.findById(userId);
        const userQuizReports = userReports.filter(report => 
            report.username === user.name || report.username === user.email
        );
        
        // Calculate user's subject strengths and weaknesses
        const subjectPerformance = analyzeUserQuizPerformance(userQuizReports);
        
        // Enhance each path with user-specific data
        const enhancedPaths = paths.map(path => {
            const progress = userProgress.find(p => 
                p.learningPath.toString() === path._id.toString()
            );
            
            // Calculate recommendation score
            const recommendationScore = calculateRecommendationScore(path, subjectPerformance);
            const isRecommended = recommendationScore > 0.7;
            
            // Enhanced path object
            const enhancedPath = {
                ...path.toObject(),
                userProgress: progress || null,
                isRecommended,
                recommendationScore,
                recommendationReason: getRecommendationReason(path, subjectPerformance, isRecommended),
                userPerformanceInSubject: subjectPerformance[path.subject] || null,
                estimatedCompletionTime: progress ? 
                    calculateEstimatedCompletionTime(path, progress) : path.estimatedDuration
            };
            
            return enhancedPath;
        });
        
        // Sort by recommendation score and then by level
        return enhancedPaths.sort((a, b) => {
            if (a.isRecommended && !b.isRecommended) return -1;
            if (!a.isRecommended && b.isRecommended) return 1;
            return b.recommendationScore - a.recommendationScore;
        });
        
    } catch (error) {
        console.error('Error enhancing paths with user data:', error);
        return paths.map(path => ({
            ...path.toObject(),
            userProgress: null,
            isRecommended: false,
            recommendationScore: 0,
            recommendationReason: 'No performance data available'
        }));
    }
}

// Analyze user's quiz performance to identify strengths and weaknesses
function analyzeUserQuizPerformance(userReports) {
    const subjectPerformance = {};
    
    userReports.forEach(report => {
        const subject = mapQuizCategoryToSubject(report.quizName);
        const scorePercentage = (report.score / report.total) * 100;
        
        if (!subjectPerformance[subject]) {
            subjectPerformance[subject] = {
                totalQuizzes: 0,
                totalScore: 0,
                averageScore: 0,
                recentQuizzes: [],
                trend: 'stable',
                lastAttempted: null
            };
        }
        
        subjectPerformance[subject].totalQuizzes++;
        subjectPerformance[subject].totalScore += scorePercentage;
        subjectPerformance[subject].recentQuizzes.push({
            score: scorePercentage,
            date: report.createdAt,
            quizName: report.quizName
        });
        
        if (!subjectPerformance[subject].lastAttempted || 
            report.createdAt > subjectPerformance[subject].lastAttempted) {
            subjectPerformance[subject].lastAttempted = report.createdAt;
        }
    });
    
    // Calculate averages and trends
    Object.keys(subjectPerformance).forEach(subject => {
        const perf = subjectPerformance[subject];
        perf.averageScore = perf.totalScore / perf.totalQuizzes;
        
        // Calculate trend (improving, declining, stable)
        const recent = perf.recentQuizzes.slice(-3);
        if (recent.length >= 2) {
            const oldAvg = recent.slice(0, -1).reduce((sum, q) => sum + q.score, 0) / (recent.length - 1);
            const newScore = recent[recent.length - 1].score;
            
            if (newScore > oldAvg + 10) perf.trend = 'improving';
            else if (newScore < oldAvg - 10) perf.trend = 'declining';
            else perf.trend = 'stable';
        }
        
        // Sort recent quizzes by date
        perf.recentQuizzes.sort((a, b) => b.date - a.date);
        perf.recentQuizzes = perf.recentQuizzes.slice(0, 5); // Keep only last 5
    });
    
    return subjectPerformance;
}

// Map quiz categories to learning path subjects
function mapQuizCategoryToSubject(quizName) {
    const lowercaseName = quizName.toLowerCase();
    
    // Programming-related mappings
    if (lowercaseName.includes('javascript') || lowercaseName.includes('js')) return 'JavaScript';
    if (lowercaseName.includes('python')) return 'Python';
    if (lowercaseName.includes('react')) return 'React';
    if (lowercaseName.includes('html') || lowercaseName.includes('css') || lowercaseName.includes('web')) return 'Web Development';
    if (lowercaseName.includes('algorithm') || lowercaseName.includes('data structure')) return 'Algorithms';
    if (lowercaseName.includes('programming') || lowercaseName.includes('coding')) return 'Programming';
    
    // Academic subjects
    if (lowercaseName.includes('math') || lowercaseName.includes('algebra') || lowercaseName.includes('calculus')) return 'Mathematics';
    if (lowercaseName.includes('physics') || lowercaseName.includes('chemistry') || lowercaseName.includes('biology') || lowercaseName.includes('science')) return 'General Science';
    if (lowercaseName.includes('history') || lowercaseName.includes('historical')) return 'World History';
    if (lowercaseName.includes('english') || lowercaseName.includes('grammar') || lowercaseName.includes('literature')) return 'English';
    if (lowercaseName.includes('geography')) return 'Geography';
    if (lowercaseName.includes('data') && (lowercaseName.includes('science') || lowercaseName.includes('analysis'))) return 'Data Analysis';
    
    // Default mapping based on category patterns
    if (lowercaseName.includes('computer')) return 'Programming';
    if (lowercaseName.includes('language')) return 'English';
    
    return 'General Knowledge';
}

// Calculate recommendation score for a learning path based on user performance
function calculateRecommendationScore(path, subjectPerformance) {
    const subjectPerf = subjectPerformance[path.subject];
    
    if (!subjectPerf) {
        // No data available - recommend based on level
        return path.level === 'beginner' ? 0.6 : 0.3;
    }
    
    let score = 0;
    
    // Factor 1: Performance in subject (0-0.4)
    if (subjectPerf.averageScore < 50) {
        // Poor performance - recommend beginner paths
        score += path.level === 'beginner' ? 0.4 : 0.1;
    } else if (subjectPerf.averageScore < 75) {
        // Average performance - recommend intermediate paths
        score += path.level === 'intermediate' ? 0.4 : 0.2;
    } else {
        // Good performance - recommend advanced paths
        score += path.level === 'advanced' ? 0.4 : 0.3;
    }
    
    // Factor 2: Trend (0-0.2)
    if (subjectPerf.trend === 'improving') score += 0.2;
    else if (subjectPerf.trend === 'stable') score += 0.1;
    // declining gets no bonus
    
    // Factor 3: Recent activity (0-0.2)
    const daysSinceLastAttempt = subjectPerf.lastAttempted ? 
        (Date.now() - subjectPerf.lastAttempted.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
    
    if (daysSinceLastAttempt < 7) score += 0.2;
    else if (daysSinceLastAttempt < 30) score += 0.1;
    
    // Factor 4: Quiz frequency (0-0.2)
    if (subjectPerf.totalQuizzes >= 5) score += 0.2;
    else if (subjectPerf.totalQuizzes >= 2) score += 0.1;
    
    return Math.min(1, score);
}

// Get recommendation reason text
function getRecommendationReason(path, subjectPerformance, isRecommended) {
    const subjectPerf = subjectPerformance[path.subject];
    
    if (!subjectPerf) {
        return isRecommended ? 
            `Great starting point for ${path.subject}` : 
            'No quiz history in this subject yet';
    }
    
    if (isRecommended) {
        if (subjectPerf.trend === 'improving') {
            return `You're improving in ${path.subject}! Perfect time to advance`;
        } else if (subjectPerf.averageScore >= 75) {
            return `Strong performance in ${path.subject} (${Math.round(subjectPerf.averageScore)}% avg)`;
        } else if (subjectPerf.averageScore < 50 && path.level === 'beginner') {
            return `Build stronger foundations in ${path.subject}`;
        } else {
            return `Continue your ${path.subject} learning journey`;
        }
    } else {
        if (subjectPerf.averageScore >= 85 && path.level === 'beginner') {
            return 'You might be ready for more advanced content';
        } else if (subjectPerf.averageScore < 60 && path.level === 'advanced') {
            return 'Consider strengthening fundamentals first';
        } else {
            return 'Explore when ready';
        }
    }
}

// Calculate estimated completion time based on user's learning velocity
function calculateEstimatedCompletionTime(path, userProgress) {
    if (!userProgress || userProgress.overallProgress === 0) {
        return path.estimatedDuration;
    }
    
    const timePerPercent = userProgress.timeSpent / userProgress.overallProgress;
    const remainingProgress = 100 - userProgress.overallProgress;
    const estimatedRemainingTime = (remainingProgress * timePerPercent) / 60; // Convert to hours
    
    return Math.max(1, Math.round(estimatedRemainingTime));
}
