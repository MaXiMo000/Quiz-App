import Quiz from "../models/Quiz.js";
import UserQuiz from "../models/User.js";

export const getQuizzes = async (req, res) => {
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

        res.json(quizzes);
    } catch (error) {
        console.error("Error getting quizzes:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// CREATE a quiz
export const createQuiz = async (req, res) => {
    try {
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
    } catch (error) {
        console.error("Error creating quiz:", error);
        res.status(500).json({ error: "Server error" });
    }
};

export const deleteQuiz = async (req, res) => {
    try {
        const { title } = req.query; // ✅ Get title from request body

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

    } catch (error) {
        console.error("Error deleting quiz:", error);
        res.status(500).json({ message: "Error deleting quiz", error: error.message });
    }
};

export async function addQuestion(req, res) {
    try {
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

        await quiz.save();
        res.json(quiz);
    } catch (error) {
        console.error("Error adding question:", error);
        res.status(500).json({ message: "Error adding question", error });
    }
}

export async function getQuizById(req, res) {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        res.json(quiz);
    } catch (error) {
        console.error("Error fetching quiz:", error);
        res.status(500).json({ message: "Error fetching quiz", error });
    }
}

export async function deleteQuestion(req, res) {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        const questionIndex = req.params.questionIndex;
        if (questionIndex < 0 || questionIndex >= quiz.questions.length) {
            return res.status(400).json({ message: "Invalid question index" });
        }

        quiz.questions.splice(questionIndex, 1);
        quiz.totalMarks -= 1;
        quiz.passingMarks = Math.floor(quiz.totalMarks / 2);
        quiz.duration = quiz.questions.length * 2;

        await quiz.save();
        res.json({ message: "Question deleted successfully", quiz });
    } catch (error) {
        console.error("Error deleting question:", error);
        res.status(500).json({ message: "Error deleting question", error });
    }
}