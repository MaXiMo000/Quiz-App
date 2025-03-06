import Quiz from "../models/Quiz.js";

export async function getQuizzes(req, res) {
    const quizzes = await Quiz.find();
    res.json(quizzes);
}

export async function createQuiz(req, res) {
    try {
        const { title, category, duration, totalMarks, passingMarks } = req.body;

        const newQuiz = new Quiz({
            title,
            category,   // ✅ Save category
            duration,   // ✅ Save duration
            totalMarks,
            passingMarks,
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
    const quiz = await Quiz.findById(req.params.id);
    quiz.questions.push(req.body);
    await quiz.save();
    res.json(quiz);
}