import express from "express";
import {
    // Daily Challenges
    getCurrentDailyChallenge,
    joinDailyChallenge,
    updateChallengeProgress,
    createDailyChallenge,
    createSampleDailyChallenge,
    deleteDailyChallenge,
    cleanupEmptyChallenges,

    // Daily Challenge Reset System
    manualResetDailyChallenges,
    getDailyChallengeStatus,
    cleanupOldChallengeData,
    getUserChallengeHistory,
    getChallengeHistoryAdmin,

    // Tournaments
    getAvailableTournaments,
    registerForTournament,
    getTournamentLeaderboard,
    updateTournamentScore,
    createTournament,
    createSampleTournament,
    deleteTournament,

    // Quiz Integration
    getAvailableQuizzes,
    startChallengeQuiz,
    submitChallengeQuiz,
    startTournamentQuiz,
    submitTournamentQuiz,

    // History & Completed
    getUserCompletedChallenges,
    getTournamentHistory,
    getCompletedChallenges,
    getCompletedTournaments
} from "../controllers/gamificationController.js";
import { verifyToken } from "../middleware/auth.js";
import cache, { clearCacheByPattern } from "../middleware/cache.js";

const router = express.Router();

// All gamification routes require authentication
router.use(verifyToken);

// =================== DAILY CHALLENGES ===================
router.get("/challenges/daily", cache, getCurrentDailyChallenge);
router.get("/challenges/status", cache, getDailyChallengeStatus); // Enhanced status with reset logic
router.post("/challenges/:challengeId/join", clearCacheByPattern("/api/challenges/daily"), joinDailyChallenge);
router.post("/challenges/:challengeId/progress", clearCacheByPattern("/api/challenges/daily"), updateChallengeProgress);
router.post("/challenges/create", clearCacheByPattern("/api/challenges/daily"), createDailyChallenge); // Admin only
router.post("/challenges/create-sample", clearCacheByPattern("/api/challenges/daily"), createSampleDailyChallenge); // Admin only - for testing
router.delete("/challenges/:challengeId", clearCacheByPattern("/api/challenges/daily"), deleteDailyChallenge); // Admin only
router.post("/challenges/cleanup", clearCacheByPattern("/api/challenges/daily"), cleanupEmptyChallenges); // Admin only - cleanup empty challenges

// Daily Challenge Reset System (Admin only)
router.post("/challenges/reset", clearCacheByPattern("/api/challenges/daily"), manualResetDailyChallenges); // Manual reset for testing
router.post("/challenges/cleanup-old", clearCacheByPattern("/api/challenges/daily"), cleanupOldChallengeData); // Cleanup old data

// Challenge History Routes
router.get("/challenges/:challengeId/history", cache, getUserChallengeHistory); // Get user's history for specific challenge
router.get("/challenges/:challengeId/history/all", cache, getChallengeHistoryAdmin); // Admin only - get all history for challenge

// Challenge Quiz Routes
router.get("/challenges/:challengeId/quiz/start", startChallengeQuiz);
router.post("/challenges/:challengeId/quiz/submit", clearCacheByPattern("/api/challenges/daily"), submitChallengeQuiz);

// =================== TOURNAMENTS ===================
router.get("/tournaments", cache, getAvailableTournaments);
router.post("/tournaments/:tournamentId/register", clearCacheByPattern("/api/tournaments"), registerForTournament);
router.get("/tournaments/:tournamentId/leaderboard", cache, getTournamentLeaderboard);
router.post("/tournaments/:tournamentId/score", clearCacheByPattern("/api/tournaments"), updateTournamentScore);
router.post("/tournaments/create", clearCacheByPattern("/api/tournaments"), createTournament); // Admin only
router.post("/tournaments/create-sample", clearCacheByPattern("/api/tournaments"), createSampleTournament); // Admin only - for testing
router.delete("/tournaments/:tournamentId", clearCacheByPattern("/api/tournaments"), deleteTournament); // Admin only

// Tournament Quiz Routes
router.get("/tournaments/:tournamentId/quiz/start", startTournamentQuiz);
router.post("/tournaments/:tournamentId/quiz/submit", clearCacheByPattern("/api/tournaments"), submitTournamentQuiz);

// =================== ADMIN UTILITIES ===================
router.get("/quizzes/available", cache, getAvailableQuizzes); // Admin only - for creating challenges/tournaments

// =================== HISTORY ===================
router.get("/challenges/history", cache, getUserCompletedChallenges);
router.get("/tournaments/history", cache, getTournamentHistory);

// =================== COMPLETED CHALLENGES & TOURNAMENTS ===================
router.get("/challenges/completed", cache, getCompletedChallenges);
router.get("/tournaments/completed", cache, getCompletedTournaments);

export default router;
