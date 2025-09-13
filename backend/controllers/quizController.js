import Quiz from "../models/Quiz.js";
import UserQuiz from "../models/User.js";
import { createInitialReviewSchedules } from "../services/reviewScheduler.js";
import logger from "../utils/logger.js";

export const getQuizzes = async (req, res) => {
    logger.info(`Getting quizzes for user ${req.user.id} with role ${req.user.role}`);
    try {
        const { role, id: userId } = req.user;

        let quizzes;
        if (role === "admin") {
        // Admin sees all quizzes
        quizzes = await Quiz.find();
        } else if (role === "premium") {
        // Premium sees their own quizzes and admin's quizzes
        quizzes = await Quiz.find({
            $or: [
            { "createdBy._id": userId },
            { "createdBy._id": null }
            ]
        });
        } else {
        // Regular users see only admin's quizzes
        quizzes = await Quiz.find({ "createdBy._id": null });
        }

        logger.info(`Successfully fetched ${quizzes.length} quizzes for user ${userId}`);
        res.json(quizzes);
    } catch (error) {
        logger.error({ message: `Error getting quizzes for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ error: "Server error" });
    }
};


// CREATE a quiz
export const createQuiz = async (req, res) => {
    logger.info(`User ${req.user.id} attempting to create a quiz`);
    try {
        const { role, id: userId } = req.user;
        const { title, category } = req.body;

        if (role !== "admin" && role !== "premium") {
            logger.warn(`User ${userId} with role ${role} attempted to create a quiz`);
            return res.status(403).json({ message: "Only admins or premium users can create quizzes" });
        }

        let createdBy = { _id: null, name: "Admin" };

        if (role === "premium") {
            const user = await UserQuiz.findById(userId);
            if (!user) {
                logger.warn(`User not found: ${userId} when creating quiz`);
                return res.status(404).json({ message: "User not found" });
            }
            createdBy = { _id: user._id, name: user.name };
        }

        const newQuiz = new Quiz({
            title,
            category,
            duration: 0,
            totalMarks: 0,
            passingMarks: 0,
            questions: [],
            createdBy
        });

        const savedQuiz = await newQuiz.save();
        logger.info(`Quiz ${savedQuiz._id} created successfully by user ${userId}`);
        res.status(201).json(savedQuiz);
    } catch (error) {
        logger.error({ message: `Error creating quiz by user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ error: "Server error" });
    }
};

export const deleteQuiz = async (req, res) => {
    logger.info(`Attempting to delete quiz with title: ${req.query.title}`);
    try {
        const { title } = req.query; // ✅ Get title from request body

        if (!title) {
            logger.warn("Quiz title is required for deletion");
            return res.status(400).json({ message: "Quiz title is required" });
        }

        // Find the quiz by title
        const quizItem = await Quiz.findOne({ title });

        if (!quizItem) {
            logger.warn(`Quiz not found for deletion with title: ${title}`);
            return res.status(404).json({ message: "Quiz not found" });
        }

        // Delete the quiz
        await Quiz.deleteOne({ title });
        logger.info(`Quiz with title "${title}" deleted successfully`);
        return res.status(200).json({ message: "Quiz deleted successfully!" });

    } catch (error) {
        logger.error({ message: `Error deleting quiz with title: ${req.query.title}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error deleting quiz", error: error.message });
    }
};

export async function addQuestion(req, res) {
    logger.info(`Adding question to quiz ${req.params.id}`);
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            logger.warn(`Quiz not found: ${req.params.id} when adding question`);
            return res.status(404).json({ message: "Quiz not found" });
        }

        const questionData = {
            ...req.body,
            difficulty: req.body.difficulty || "medium", // Set difficulty if provided
        };

        quiz.questions.push(questionData);
        quiz.totalMarks += 1;
        quiz.passingMarks = Math.floor(quiz.totalMarks / 2);
        quiz.duration = quiz.questions.length * 2;

        // Phase 2: Update difficulty distribution
        if (!quiz.difficultyDistribution) {
            quiz.difficultyDistribution = { easy: 0, medium: 0, hard: 0 };
        }
        quiz.difficultyDistribution[questionData.difficulty] += 1;

        await quiz.save();
        logger.info(`Successfully added question to quiz ${req.params.id}`);
        res.json(quiz);
    } catch (error) {
        logger.error({ message: `Error adding question to quiz ${req.params.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error adding question", error });
    }
}

export async function getQuizById(req, res) {
    logger.info(`Fetching quiz by ID: ${req.params.id}`);
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            logger.warn(`Quiz not found: ${req.params.id}`);
            return res.status(404).json({ message: "Quiz not found" });
        }

        // Create initial review schedules for the user and quiz
        if (req.user) {
            await createInitialReviewSchedules(req.user.id, quiz._id, quiz.questions);
        }

        logger.info(`Successfully fetched quiz ${req.params.id}`);
        res.json(quiz);
    } catch (error) {
        logger.error({ message: `Error fetching quiz ${req.params.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error fetching quiz", error });
    }
}

export async function deleteQuestion(req, res) {
    logger.info(`Deleting question at index ${req.params.questionIndex} from quiz ${req.params.id}`);
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            logger.warn(`Quiz not found: ${req.params.id} when deleting question`);
            return res.status(404).json({ message: "Quiz not found" });
        }

        const questionIndex = req.params.questionIndex;
        if (questionIndex < 0 || questionIndex >= quiz.questions.length) {
            logger.warn(`Invalid question index ${questionIndex} for quiz ${req.params.id}`);
            return res.status(400).json({ message: "Invalid question index" });
        }

        // Phase 2: Update difficulty distribution before removing question
        const questionToRemove = quiz.questions[questionIndex];
        if (quiz.difficultyDistribution && questionToRemove.difficulty) {
            quiz.difficultyDistribution[questionToRemove.difficulty] = Math.max(0,
                quiz.difficultyDistribution[questionToRemove.difficulty] - 1);
        }

        quiz.questions.splice(questionIndex, 1);
        quiz.totalMarks -= 1;
        quiz.passingMarks = Math.floor(quiz.totalMarks / 2);
        quiz.duration = quiz.questions.length * 2;

        await quiz.save();
        logger.info(`Successfully deleted question at index ${questionIndex} from quiz ${req.params.id}`);
        res.json({ message: "Question deleted successfully", quiz });
    } catch (error) {
        logger.error({ message: `Error deleting question from quiz ${req.params.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error deleting question", error });
    }
}

// Phase 2: Function to update quiz statistics after each attempt
export async function updateQuizStats(req, res) {
    logger.info(`Updating stats for quiz ${req.body.quizId}`);
    try {
        const { quizId, score, totalQuestions, timeSpent } = req.body;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            logger.warn(`Quiz not found: ${quizId} when updating stats`);
            return res.status(404).json({ message: "Quiz not found" });
        }

        // Update quiz statistics
        const newTotalAttempts = (quiz.totalAttempts || 0) + 1;
        const currentAverageScore = quiz.averageScore || 0;
        const currentAverageTime = quiz.averageTime || 0;

        // Calculate new averages using incremental average formula
        const newAverageScore = ((currentAverageScore * (newTotalAttempts - 1)) + (score / totalQuestions)) / newTotalAttempts;
        const newAverageTime = ((currentAverageTime * (newTotalAttempts - 1)) + timeSpent) / newTotalAttempts;

        // Update popularity score (combination of attempts and average score)
        const popularityScore = newTotalAttempts * newAverageScore;

        quiz.totalAttempts = newTotalAttempts;
        quiz.averageScore = newAverageScore;
        quiz.averageTime = newAverageTime;
        quiz.popularityScore = popularityScore;

        await quiz.save();

        logger.info(`Successfully updated stats for quiz ${quizId}`);
        res.json({
            message: "Quiz statistics updated successfully",
            stats: {
                totalAttempts: quiz.totalAttempts,
                averageScore: Math.round(quiz.averageScore * 100),
                averageTime: Math.round(quiz.averageTime),
                popularityScore: Math.round(quiz.popularityScore * 100)
            }
        });

    } catch (error) {
        logger.error({ message: `Error updating quiz stats for quiz ${req.body.quizId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error updating quiz stats", error });
    }
}
