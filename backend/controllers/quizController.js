import Quiz from "../models/Quiz.js";

export async function getQuizzes(req, res) {
    const quizzes = await Quiz.find();
    res.json(quizzes);
}

export async function createQuiz(req, res) {
    try {
        const { title, category } = req.body;

        const newQuiz = new Quiz({
            title,
            category,
            duration: 0,       // Default to 0
            totalMarks: 0,      // Default to 0
            passingMarks: 0,    // Default to 0
            questions: [],
        });

        await newQuiz.save();
        res.status(201).json(newQuiz);
    } catch (error) {
        console.error("Error creating quiz:", error);
        res.status(500).json({ message: "Server error", error });
    }
}

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

        quiz.questions.push(req.body);
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