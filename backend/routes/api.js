import { Router } from "express";
import Quiz from "../models/Quiz.js";
import mongoose from "mongoose";
const router = Router();
import { getQuizzes, createQuiz, addQuestion, deleteQuiz, getQuizById, deleteQuestion } from "../controllers/quizController.js";
import { getReports, createReport, getReportsUser, deleteReport } from "../controllers/reportController.js";
import { generateQuizQuestions } from "../controllers/aiQuestionController.js";

// Quiz Routes
router.get("/quizzes", getQuizzes);
router.get("/quizzes/:id", getQuizById);
router.post("/quizzes", createQuiz);
router.post("/quizzes/:id/questions", addQuestion);
router.delete("/quizzes/delete/quiz", deleteQuiz);
router.delete("/quizzes/:id/questions/:questionIndex", deleteQuestion);


router.post("/quizzes/:id/generate-questions", generateQuizQuestions); // ✅ AI route

// Report Routes
router.get("/reports", getReports);
router.post("/reports", createReport);
router.get("/reports/user", getReportsUser);
router.delete("/reports/delete", deleteReport);

export default router;