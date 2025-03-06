import { Router } from "express";
import Quiz from "../models/Quiz.js";
import mongoose from "mongoose";
const router = Router();
import { getQuizzes, createQuiz, addQuestion, deleteQuiz } from "../controllers/quizController.js";
import { getReports, createReport, getReportsUser, deleteReport } from "../controllers/reportController.js";

// Quiz Routes
router.get("/quizzes", getQuizzes);
router.post("/quizzes", createQuiz);
router.post("/quizzes/:id/questions", addQuestion);
router.delete("/quizzes/delete/quiz", deleteQuiz);

router.get("/quizzes/:id", async (req, res) => {
    try {
        console.log("Received request for quiz ID:", req.params.id);

        // Check if the ID format is valid
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            console.log("Invalid ID format:", req.params.id);
            return res.status(400).json({ error: "Invalid Quiz ID format" });
        }

        // Find the quiz
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            console.log("Quiz not found in database:", req.params.id);
            return res.status(404).json({ error: "Quiz not found" });
        }

        res.json(quiz);
    } catch (error) {
        console.error("Error fetching quiz:", error);
        res.status(500).json({ error: "Server error", details: error.message });
    }
});

// Report Routes
router.get("/reports", getReports);
router.post("/reports", createReport);
router.get("/reports/user", getReportsUser);
router.delete("/reports/delete", deleteReport);

export default router;