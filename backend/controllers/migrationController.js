// Phase 2: Migration script to update existing quizzes with difficulty distribution
import Quiz from "../models/Quiz.js";
import { withCachingAndLogging, controllerConfigs, cacheKeyGenerators } from "../utils/controllerUtils.js";
import logger from "../utils/logger.js";

const _migrateQuizDifficultyDistribution = async () => {
    try {
        
        const quizzes = await Quiz.find({
            $or: [
                { difficultyDistribution: { $exists: false } },
                { difficultyDistribution: null }
            ]
        });

        let updatedCount = 0;

        for (const quiz of quizzes) {
            const distribution = { easy: 0, medium: 0, hard: 0 };
            
            // Count difficulty distribution from existing questions
            quiz.questions.forEach(question => {
                const difficulty = question.difficulty || 'medium';
                if (distribution.hasOwnProperty(difficulty)) {
                    distribution[difficulty]++;
                } else {
                    distribution.medium++; // Default to medium if unknown difficulty
                }
            });

            // Initialize other missing fields if needed
            const updateData = {
                difficultyDistribution: distribution
            };

            if (quiz.averageScore === undefined) updateData.averageScore = 0;
            if (quiz.totalAttempts === undefined) updateData.totalAttempts = 0;
            if (quiz.averageTime === undefined) updateData.averageTime = 0;
            if (quiz.popularityScore === undefined) updateData.popularityScore = 0;
            if (!quiz.tags) updateData.tags = [];
            if (!quiz.recommendedFor) {
                updateData.recommendedFor = {
                    categories: [],
                    skillLevels: [],
                    weakAreas: []
                };
            }

            await Quiz.findByIdAndUpdate(quiz._id, updateData);
            updatedCount++;
        }

        return { success: true, updatedCount };
        
    } catch (error) {
        logger.error("Migration failed", { 
            context: 'MigrationController', 
            operation: 'Migrate Quiz Difficulty Distribution',
            error: error.message 
        });
        return { success: false, error: error.message };
    }
};

export const migrateQuizDifficultyDistribution = withCachingAndLogging(_migrateQuizDifficultyDistribution, {
    ...controllerConfigs.migration,
    operation: 'Migrate Quiz Difficulty Distribution',
    cacheTTL: 0, // No caching for migration operations
    logFields: []
});

// API endpoint to trigger migration
const _runMigration = async (req, res) => {
    logger.info('Starting migration process', { 
        context: 'MigrationController', 
        operation: 'Run Migration',
        userId: req.user?.id,
        role: req.user?.role 
    });
    
    const result = await migrateQuizDifficultyDistribution();
    
    if (result.success) {
        logger.info('Migration completed successfully', { 
            context: 'MigrationController', 
            operation: 'Run Migration',
            updatedCount: result.updatedCount,
            userId: req.user?.id 
        });
        
        res.json({
            message: "Migration completed successfully",
            updatedCount: result.updatedCount
        });
    } else {
        logger.error('Migration failed', { 
            context: 'MigrationController', 
            operation: 'Run Migration',
            error: result.error,
            userId: req.user?.id 
        });
        
        res.status(500).json({
            message: "Migration failed",
            error: result.error
        });
    }
};

export const runMigration = withCachingAndLogging(_runMigration, {
    ...controllerConfigs.public,
    operation: 'Run Migration',
    cacheTTL: 0, // No caching for migration operations
    requireAuth: true // Only admins should run migrations
});
