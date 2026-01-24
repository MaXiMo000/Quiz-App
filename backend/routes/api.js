import { Router } from "express";
const router = Router();
import { getQuizzes, createQuiz, addQuestion, deleteQuiz, getQuizById, deleteQuestion, updateQuizStats } from "../controllers/quizController.js";
import { getReports, createReport, getReportsUser, deleteReport, getReportsUserID, getTopScorers } from "../controllers/reportController.js";
import { generateQuizQuestions, generateAdaptiveQuestions } from "../controllers/aiQuestionController.js";
import { getWrittenTestReports, createWrittenTestReport, getWrittenTestReportsUser, deleteWrittenTestReport, getWrittenReportsUserID } from "../controllers/writtenTestReportController.js";
import { getWeeklyXP, getMonthlyXP } from "../controllers/leaderboardController.js";
import { runMigration } from "../controllers/migrationController.js";
import { cleanupEmptyChallenges, cleanupEmptyTournaments } from "../controllers/gamificationController.js";
import reviewRoutes from "./reviewRoutes.js";
import { verifyToken } from "../middleware/auth.js";
import cache, { clearCacheByPattern } from "../middleware/cache.js";
import { aiQuestionLimiter } from "../middleware/rateLimiting.js";

// Quiz Routes
router.get("/quizzes", verifyToken, cache, getQuizzes);
router.get("/quizzes/:id", verifyToken, cache, getQuizById);
router.post("/quizzes", verifyToken, clearCacheByPattern("/api/quizzes"), createQuiz);
router.post("/quizzes/:id/questions", verifyToken, clearCacheByPattern("/api/quizzes"), addQuestion);
router.delete("/quizzes/delete/quiz", verifyToken, clearCacheByPattern("/api/quizzes"), deleteQuiz);
router.delete("/quizzes/:id/questions/:questionIndex", verifyToken, clearCacheByPattern("/api/quizzes"), deleteQuestion);
router.post("/quizzes/:id/stats", verifyToken, clearCacheByPattern("/api/quizzes"), updateQuizStats);

// 🔒 AI endpoints with rate limiting to prevent spam
// IMPORTANT: Clear cache when AI generates questions to prevent stale data
router.post("/quizzes/:id/generate-questions", verifyToken, aiQuestionLimiter, clearCacheByPattern("/api/quizzes"), generateQuizQuestions);
router.post("/adaptive", verifyToken, aiQuestionLimiter, clearCacheByPattern("/api/quizzes"), generateAdaptiveQuestions);

// Report Routes
router.get("/reports", verifyToken, cache, getReports);
router.post("/reports", verifyToken, clearCacheByPattern("/api/reports"), createReport);
router.get("/reports/user", verifyToken, cache, getReportsUser);
router.get("/reports/top-scorers", verifyToken, cache, getTopScorers);
router.get("/reports/:id", verifyToken, cache, getReportsUserID);
router.delete("/reports/:id", verifyToken, clearCacheByPattern("/api/reports"), deleteReport);

router.get("/written-test-reports", verifyToken, cache, getWrittenTestReports);
router.post("/written-test-reports", verifyToken, clearCacheByPattern("/api/written-test-reports"), createWrittenTestReport);
router.get("/written-test-reports/user", verifyToken, cache, getWrittenTestReportsUser);
router.delete("/written-test-reports/:id", verifyToken, clearCacheByPattern("/api/written-test-reports"), deleteWrittenTestReport);
router.get("/written-test-reports/:id", verifyToken, cache, getWrittenReportsUserID);

router.get("/leaderboard/weekly", verifyToken, cache, getWeeklyXP);
router.get("/leaderboard/monthly", verifyToken, cache, getMonthlyXP);

// Migration endpoint (admin only)
router.post("/migrate/quiz-difficulty", verifyToken, clearCacheByPattern("/api/quizzes"), runMigration);

// Gamification cleanup endpoints (admin only)
router.delete("/challenges/cleanup-empty", verifyToken, clearCacheByPattern("/api/gamification"), cleanupEmptyChallenges);
router.delete("/tournaments/cleanup-empty", verifyToken, clearCacheByPattern("/api/gamification"), cleanupEmptyTournaments);

// Review Routes (Spaced Repetition)
router.use("/reviews", reviewRoutes);

export default router;
