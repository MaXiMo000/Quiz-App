// Phase 2: Migration script to update existing quizzes with difficulty distribution
import Quiz from "../models/Quiz.js";

export const migrateQuizDifficultyDistribution = async () => {
    try {
        console.log("🔄 Starting quiz difficulty distribution migration...");
        
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
        
        console.log(`✅ Migration completed! Updated ${updatedCount} quizzes.`);
        return { success: true, updatedCount };
        
    } catch (error) {
        console.error("❌ Migration failed:", error);
        return { success: false, error: error.message };
    }
};

// API endpoint to trigger migration
export const runMigration = async (req, res) => {
    try {
        const result = await migrateQuizDifficultyDistribution();
        
        if (result.success) {
            res.json({
                message: "Migration completed successfully",
                updatedCount: result.updatedCount
            });
        } else {
            res.status(500).json({
                message: "Migration failed",
                error: result.error
            });
        }
    } catch (error) {
        console.error("Error running migration:", error);
        res.status(500).json({
            message: "Migration failed",
            error: error.message
        });
    }
};
