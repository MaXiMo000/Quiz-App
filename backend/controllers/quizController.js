import Quiz from "../models/Quiz.js";
import UserQuiz from "../models/User.js";
import cacheService from '../services/cacheService.js';
import AppError from '../utils/AppError.js';

const clearQuizCache = async (quizId) => {
    logger.info(`Clearing cache for quiz ${quizId} and quiz list`);
    const quizKey = `__express__/api/quizzes/${quizId}`;
    const listKey = `__express__/api/quizzes`;
    await cacheService.del(quizKey);
    await cacheService.del(listKey);
};

export const getQuizzes = async (req, res, next) => {
    try {
        const { role, id: userId } = req.user;
        let query = {};

        if (role === "premium") {
            query = { $or: [{ "createdBy._id": userId }, { "createdBy._id": null }] };
        } else if (role !== "admin") {
            query = { "createdBy._id": null };
        }

        const quizzes = await Quiz.find(query);
        res.json(quizzes);
    } catch (error) {
        next(error);
    }
};

export const createQuiz = async (req, res, next) => {
    try {
        const { role, id: userId } = req.user;
        const { title, category } = req.body;

        if (role !== "admin" && role !== "premium") {
            return next(new AppError("Only admins or premium users can create quizzes", 403));
        }

        let createdBy = { _id: null, name: "Admin" };
        if (role === "premium") {
            const user = await UserQuiz.findById(userId);
            if (!user) return next(new AppError("User not found", 404));
            createdBy = { _id: user._id, name: user.name };
        }

        const newQuiz = new Quiz({ title, category, createdBy });
        const savedQuiz = await newQuiz.save();

        await cacheService.del('__express__/api/quizzes');

        res.status(201).json(savedQuiz);
    } catch (error) {
        next(error);
    }
};

export const deleteQuiz = async (req, res, next) => {
    try {
        const { title } = req.query;
        if (!title) {
            return next(new AppError("Quiz title is required", 400));
        }

        const quizItem = await Quiz.findOne({ title });
        if (!quizItem) {
            return next(new AppError("Quiz not found", 404));
        }

        await Quiz.deleteOne({ title });
        await clearQuizCache(quizItem._id);

        res.status(200).json({ message: "Quiz deleted successfully!" });
    } catch (error) {
        next(error);
    }
};

export const addQuestion = async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return next(new AppError("Quiz not found", 404));

        const questionData = { ...req.body, difficulty: req.body.difficulty || "medium" };
        quiz.questions.push(questionData);
        quiz.totalMarks += 1;
        quiz.passingMarks = Math.floor(quiz.totalMarks / 2);
        quiz.duration = quiz.questions.length * 2;

        if (!quiz.difficultyDistribution) {
            quiz.difficultyDistribution = { easy: 0, medium: 0, hard: 0 };
        }
        quiz.difficultyDistribution[questionData.difficulty] = (quiz.difficultyDistribution[questionData.difficulty] || 0) + 1;

        await quiz.save();
        await clearQuizCache(req.params.id);

        res.json(quiz);
    } catch (error) {
        next(error);
    }
};

export const getQuizById = async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return next(new AppError("Quiz not found", 404));
        res.json(quiz);
    } catch (error) {
        next(error);
    }
};

export const deleteQuestion = async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return next(new AppError("Quiz not found", 404));

        const questionIndex = parseInt(req.params.questionIndex, 10);
        if (isNaN(questionIndex) || questionIndex < 0 || questionIndex >= quiz.questions.length) {
            return next(new AppError("Invalid question index", 400));
        }

        const questionToRemove = quiz.questions[questionIndex];
        if (quiz.difficultyDistribution && questionToRemove.difficulty) {
            quiz.difficultyDistribution[questionToRemove.difficulty] = Math.max(0, (quiz.difficultyDistribution[questionToRemove.difficulty] || 0) - 1);
        }

        quiz.questions.splice(questionIndex, 1);
        quiz.totalMarks -= 1;
        quiz.passingMarks = Math.floor(quiz.totalMarks / 2);
        quiz.duration = quiz.questions.length * 2;

        await quiz.save();
        await clearQuizCache(req.params.id);

        res.json({ message: "Question deleted successfully", quiz });
    } catch (error) {
        next(error);
    }
};

export const updateQuizStats = async (req, res, next) => {
    try {
        const { quizId, score, totalQuestions, timeSpent } = req.body;
        if (!quizId || score === undefined || !totalQuestions || timeSpent === undefined) {
            return next(new AppError("Missing required fields for updating quiz stats", 400));
        }
        
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return next(new AppError("Quiz not found", 404));

        const newTotalAttempts = (quiz.totalAttempts || 0) + 1;
        const currentAverageScore = quiz.averageScore || 0;
        const currentAverageTime = quiz.averageTime || 0;
        
        const newAverageScore = ((currentAverageScore * (newTotalAttempts - 1)) + (score / totalQuestions)) / newTotalAttempts;
        const newAverageTime = ((currentAverageTime * (newTotalAttempts - 1)) + timeSpent) / newTotalAttempts;
        const popularityScore = newTotalAttempts * newAverageScore;
        
        quiz.totalAttempts = newTotalAttempts;
        quiz.averageScore = newAverageScore;
        quiz.averageTime = newAverageTime;
        quiz.popularityScore = popularityScore;
        
        await quiz.save();
        await clearQuizCache(quizId);
        
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
        next(error);
    }
};