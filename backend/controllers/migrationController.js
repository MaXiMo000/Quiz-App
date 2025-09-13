// Phase 2: Migration script to update existing quizzes with difficulty distribution
import Quiz from "../models/Quiz.js";
import logger from "../utils/logger.js";

export const migrateQuizDifficultyDistribution = async () => {
    logger.info("Starting quiz difficulty distribution migration");
    try {

        const quizzes = await Quiz.find({
            $or: [
                { difficultyDistribution: { $exists: false } },
                { difficultyDistribution: null }
            ]
        });

        logger.info(`Found ${quizzes.length} quizzes to migrate`);
        let updatedCount = 0;

        for (const quiz of quizzes) {
            const distribution = { easy: 0, medium: 0, hard: 0 };

            // Count difficulty distribution from existing questions
            quiz.questions.forEach(question => {
                const difficulty = question.difficulty || "medium";
                if (Object.prototype.hasOwnProperty.call(distribution, difficulty)) {
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

        logger.info(`Successfully migrated ${updatedCount} quizzes`);
        return { success: true, updatedCount };

    } catch (error) {
        logger.error({ message: "Quiz difficulty distribution migration failed", error: error.message, stack: error.stack });
        return { success: false, error: error.message };
    }
};

// API endpoint to trigger migration
export const runMigration = async (req, res) => {
    logger.info("API endpoint to trigger migration called");
    try {
        const result = await migrateQuizDifficultyDistribution();

        if (result.success) {
            logger.info(`Migration API endpoint completed successfully, updated ${result.updatedCount} quizzes`);
            res.json({
                message: "Migration completed successfully",
                updatedCount: result.updatedCount
            });
        } else {
            logger.error({ message: "Migration API endpoint failed", error: result.error });
            res.status(500).json({
                message: "Migration failed",
                error: result.error
            });
        }
    } catch (error) {
        logger.error({ message: "Error running migration API endpoint", error: error.message, stack: error.stack });
        res.status(500).json({
            message: "Migration failed",
            error: error.message
        });
    }
};
