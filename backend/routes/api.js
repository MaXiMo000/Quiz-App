import { Router } from "express";
const router = Router();
import { getQuizzes, createQuiz, addQuestion, deleteQuiz, getQuizById, deleteQuestion } from "../controllers/quizController.js";
import { getReports, createReport, getReportsUser, deleteReport, getReportsUserID, getTopScorers } from "../controllers/reportController.js";
import { generateQuizQuestions } from "../controllers/aiQuestionController.js";
import { getWrittenTestReports, createWrittenTestReport, getWrittenTestReportsUser, deleteWrittenTestReport, getWrittenReportsUserID } from "../controllers/writtenTestReportController.js";
import { verifyToken } from "../middleware/auth.js";

// Quiz Routes
router.get("/quizzes", getQuizzes, verifyToken);
router.get("/quizzes/:id", getQuizById, verifyToken);
router.post("/quizzes", createQuiz, verifyToken);
router.post("/quizzes/:id/questions", addQuestion, verifyToken);
router.delete("/quizzes/delete/quiz", deleteQuiz, verifyToken);
router.delete("/quizzes/:id/questions/:questionIndex", deleteQuestion, verifyToken);


router.post("/quizzes/:id/generate-questions", generateQuizQuestions);

// Report Routes
router.get("/reports", getReports, verifyToken);
router.post("/reports", createReport, verifyToken);
router.get("/reports/user", getReportsUser, verifyToken);
router.get("/reports/top-scorers", getTopScorers, verifyToken); 
router.get("/reports/:id", getReportsUserID, verifyToken)
router.delete("/reports/:id", deleteReport, verifyToken);

router.get("/written-test-reports", getWrittenTestReports, verifyToken);
router.post("/written-test-reports", createWrittenTestReport, verifyToken);
router.get("/written-test-reports/user", getWrittenTestReportsUser, verifyToken);
router.delete("/written-test-reports/:id", deleteWrittenTestReport, verifyToken);
router.get("/written-test-reports/:id", getWrittenReportsUserID, verifyToken);

export default router;