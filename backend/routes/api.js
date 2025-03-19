import { Router } from "express";
import Quiz from "../models/Quiz.js";
import mongoose from "mongoose";
const router = Router();
import { getQuizzes, createQuiz, addQuestion, deleteQuiz, getQuizById, deleteQuestion } from "../controllers/quizController.js";
import { getReports, createReport, getReportsUser, deleteReport, getReportsUserID, getTopScorers } from "../controllers/reportController.js";
import { generateQuizQuestions } from "../controllers/aiQuestionController.js";
import { getWrittenTestReports, createWrittenTestReport, getWrittenTestReportsUser, deleteWrittenTestReport, getWrittenReportsUserID } from "../controllers/writtenTestReportController.js";

// Quiz Routes
router.get("/quizzes", getQuizzes);
router.get("/quizzes/:id", getQuizById);
router.post("/quizzes", createQuiz);
router.post("/quizzes/:id/questions", addQuestion);
router.delete("/quizzes/delete/quiz", deleteQuiz);
router.delete("/quizzes/:id/questions/:questionIndex", deleteQuestion);


router.post("/quizzes/:id/generate-questions", generateQuizQuestions);

// Report Routes
router.get("/reports", getReports);
router.post("/reports", createReport);
router.get("/reports/user", getReportsUser);
router.get("/reports/top-scorers", getTopScorers); 
router.get("/reports/:id", getReportsUserID)
router.delete("/reports/:id", deleteReport);

router.get("/written-test-reports", getWrittenTestReports);
router.post("/written-test-reports", createWrittenTestReport);
router.get("/written-test-reports/user", getWrittenTestReportsUser);
router.delete("/written-test-reports/:id", deleteWrittenTestReport);
router.get("/written-test-reports/:id", getWrittenReportsUserID);

export default router;