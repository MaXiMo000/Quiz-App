import { Router } from "express";
const router = Router();
import { getQuizzes, createQuiz, addQuestion, deleteQuiz, getQuizById, deleteQuestion, updateQuizStats } from "../controllers/quizController.js";
import { getReports, createReport, getReportsUser, deleteReport, getReportsUserID, getTopScorers } from "../controllers/reportController.js";
import { generateQuizQuestions, generateAdaptiveQuestions } from "../controllers/aiQuestionController.js";
import { getWrittenTestReports, createWrittenTestReport, getWrittenTestReportsUser, deleteWrittenTestReport, getWrittenReportsUserID } from "../controllers/writtenTestReportController.js";
import { getWeeklyXP, getMonthlyXP } from "../controllers/leaderboardController.js";
import { runMigration } from "../controllers/migrationController.js"; // Phase 2: Migration
import { cleanupEmptyChallenges, cleanupEmptyTournaments } from "../controllers/gamificationController.js";
import { verifyToken } from "../middleware/auth.js";

// Quiz Routes
router.get("/quizzes", verifyToken, getQuizzes);
router.get("/quizzes/:id", verifyToken, getQuizById);
router.post("/quizzes", verifyToken, createQuiz);
router.post("/quizzes/:id/questions", verifyToken, addQuestion);
router.delete("/quizzes/delete/quiz", verifyToken, deleteQuiz);
router.delete("/quizzes/:id/questions/:questionIndex", verifyToken, deleteQuestion);
router.post("/quizzes/:id/stats", verifyToken, updateQuizStats); // Phase 2: Update quiz statistics


router.post("/quizzes/:id/generate-questions", generateQuizQuestions);
router.post("/adaptive", verifyToken, generateAdaptiveQuestions);

// Report Routes
router.get("/reports", verifyToken, getReports);
router.post("/reports", verifyToken, createReport);
router.get("/reports/user", verifyToken, getReportsUser);
router.get("/reports/top-scorers", verifyToken, getTopScorers); 
router.get("/reports/:id", verifyToken, getReportsUserID)
router.delete("/reports/:id", verifyToken, deleteReport);

router.get("/written-test-reports", verifyToken, getWrittenTestReports);
router.post("/written-test-reports", verifyToken, createWrittenTestReport);
router.get("/written-test-reports/user", verifyToken, getWrittenTestReportsUser);
router.delete("/written-test-reports/:id", verifyToken, deleteWrittenTestReport);
router.get("/written-test-reports/:id", verifyToken, getWrittenReportsUserID);

router.get("/leaderboard/weekly", verifyToken, getWeeklyXP);
router.get("/leaderboard/monthly", verifyToken, getMonthlyXP);

// Phase 2: Migration endpoint (admin only)
router.post("/migrate/quiz-difficulty", verifyToken, runMigration);

// Gamification cleanup endpoints (admin only)
router.delete("/challenges/cleanup-empty", verifyToken, cleanupEmptyChallenges);
router.delete("/tournaments/cleanup-empty", verifyToken, cleanupEmptyTournaments);

export default router;