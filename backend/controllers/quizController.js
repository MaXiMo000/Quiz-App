import Quiz from "../models/Quiz.js";
import UserQuiz from "../models/User.js";
import { withCachingAndLogging, controllerConfigs, cacheKeyGenerators } from "../utils/controllerUtils.js";
import logger from "../utils/logger.js";

const _getQuizzes = async (req, res) => {
    try {
        const { role, id: userId } = req.user;

        logger.info('Getting quizzes for user', {
            context: 'QuizController',
            operation: 'Get Quizzes',
            userId,
            role,
            timestamp: new Date().toISOString()
        });

        let quizzes;
        if (role === "admin") {
            // Admin sees all quizzes
            logger.info('Fetching all quizzes for admin user', { userId, role });
            quizzes = await Quiz.find();
        } else if (role === "premium") {
            // Premium sees their own quizzes and admin's quizzes
            logger.info('Fetching quizzes for premium user', { userId, role });
            quizzes = await Quiz.find({
                $or: [
                    { "createdBy._id": userId },
                    { "createdBy._id": null }
                ]
            });
        } else {
            // Regular users see only admin's quizzes
            logger.info('Fetching admin quizzes for regular user', { userId, role });
            quizzes = await Quiz.find({ "createdBy._id": null });
        }

        logger.info('Quizzes fetched successfully', {
            context: 'QuizController',
            operation: 'Get Quizzes',
            userId,
            role,
            quizzesCount: quizzes ? quizzes.length : 0,
            quizzesType: Array.isArray(quizzes) ? 'array' : typeof quizzes,
            firstQuizId: quizzes && quizzes.length > 0 ? quizzes[0]._id : null,
            timestamp: new Date().toISOString()
        });

        // Log the actual response structure
        logger.info('Response structure details', {
            context: 'QuizController',
            operation: 'Get Quizzes',
            isArray: Array.isArray(quizzes),
            isNull: quizzes === null,
            isUndefined: quizzes === undefined,
            responseType: typeof quizzes,
            responseLength: quizzes ? quizzes.length : 'N/A',
            responseKeys: quizzes && typeof quizzes === 'object' ? Object.keys(quizzes) : 'N/A'
        });

        // Ensure we always return an array
        const responseData = Array.isArray(quizzes) ? quizzes : [];
        
        logger.info('Sending response to client', {
            context: 'QuizController',
            operation: 'Get Quizzes',
            responseDataLength: responseData.length,
            responseDataType: typeof responseData,
            isArray: Array.isArray(responseData)
        });

        res.json(responseData);
    } catch (error) {
        logger.error('Error in getQuizzes', {
            context: 'QuizController',
            operation: 'Get Quizzes',
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            role: req.user?.role
        });
        
        // Return empty array on error to prevent frontend crashes
        res.json([]);
    }
};

export const getQuizzes = withCachingAndLogging(_getQuizzes, {
    ...controllerConfigs.quiz,
    operation: 'Get Quizzes',
    cacheTTL: 0, // Temporarily disable caching to test
    cacheKeyGenerator: cacheKeyGenerators.roleBased
});

// CREATE a quiz
const _createQuiz = async (req, res) => {
    const { role, id: userId } = req.user;
    const { title, category } = req.body;

    if (role !== "admin" && role !== "premium") {
        return res.status(403).json({ message: "Only admins or premium users can create quizzes" });
    }

    let createdBy = { _id: null, name: "Admin" };

    if (role === "premium") {
        const user = await UserQuiz.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });
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
    res.status(201).json(savedQuiz);
};

export const createQuiz = withCachingAndLogging(_createQuiz, {
    ...controllerConfigs.quiz,
    operation: 'Create Quiz',
    cacheTTL: 0, // No caching for create operations
    logFields: ['body.title', 'body.category']
});

const _deleteQuiz = async (req, res) => {
    const { title } = req.query;

    if (!title) {
        return res.status(400).json({ message: "Quiz title is required" });
    }

    // Find the quiz by title
    const quizItem = await Quiz.findOne({ title });

    if (!quizItem) {
        return res.status(404).json({ message: "Quiz not found" });
    }

    // Delete the quiz
    await Quiz.deleteOne({ title });
    return res.status(200).json({ message: "Quiz deleted successfully!" });
};

export const deleteQuiz = withCachingAndLogging(_deleteQuiz, {
    ...controllerConfigs.quiz,
    operation: 'Delete Quiz',
    cacheTTL: 0, // No caching for delete operations
    logFields: ['query.title']
});

const _addQuestion = async (req, res) => {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

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
    res.json(quiz);
};

export const addQuestion = withCachingAndLogging(_addQuestion, {
    ...controllerConfigs.quiz,
    operation: 'Add Question',
    cacheTTL: 0, // No caching for create operations
    logFields: ['params.id', 'body.questionText', 'body.difficulty']
});

const _getQuizById = async (req, res) => {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    res.json(quiz);
};

export const getQuizById = withCachingAndLogging(_getQuizById, {
    ...controllerConfigs.quiz,
    operation: 'Get Quiz by ID',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `quiz:id:${req.params.id}`
});

const _deleteQuestion = async (req, res) => {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const questionIndex = req.params.questionIndex;
    if (questionIndex < 0 || questionIndex >= quiz.questions.length) {
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
    res.json({ message: "Question deleted successfully", quiz });
};

export const deleteQuestion = withCachingAndLogging(_deleteQuestion, {
    ...controllerConfigs.quiz,
    operation: 'Delete Question',
    cacheTTL: 0, // No caching for delete operations
    logFields: ['params.id', 'params.questionIndex']
});

// Phase 2: Function to update quiz statistics after each attempt
const _updateQuizStats = async (req, res) => {
    const { quizId, score, totalQuestions, timeSpent } = req.body;
    
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

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
    
    res.json({ 
        message: "Quiz statistics updated successfully",
        stats: {
            totalAttempts: quiz.totalAttempts,
            averageScore: Math.round(quiz.averageScore * 100),
            averageTime: Math.round(quiz.averageTime),
            popularityScore: Math.round(quiz.popularityScore * 100)
        }
    });
};

export const updateQuizStats = withCachingAndLogging(_updateQuizStats, {
    ...controllerConfigs.quiz,
    operation: 'Update Quiz Stats',
    cacheTTL: 0, // No caching for update operations
    logFields: ['body.quizId', 'body.score', 'body.timeSpent']
});