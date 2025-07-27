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
    getChallengeHistory,
    getTournamentHistory,
    getCompletedChallenges,
    getCompletedTournaments
} from "../controllers/gamificationController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// All gamification routes require authentication
router.use(verifyToken);

// =================== DAILY CHALLENGES ===================
router.get("/challenges/daily", getCurrentDailyChallenge);
router.get("/challenges/status", getDailyChallengeStatus); // Enhanced status with reset logic
router.post("/challenges/:challengeId/join", joinDailyChallenge);
router.post("/challenges/:challengeId/progress", updateChallengeProgress);
router.post("/challenges/create", createDailyChallenge); // Admin only
router.post("/challenges/create-sample", createSampleDailyChallenge); // Admin only - for testing
router.delete("/challenges/:challengeId", deleteDailyChallenge); // Admin only
router.post("/challenges/cleanup", cleanupEmptyChallenges); // Admin only - cleanup empty challenges

// Daily Challenge Reset System (Admin only)
router.post("/challenges/reset", manualResetDailyChallenges); // Manual reset for testing
router.post("/challenges/cleanup-old", cleanupOldChallengeData); // Cleanup old data

// Challenge Quiz Routes
router.get("/challenges/:challengeId/quiz/start", startChallengeQuiz);
router.post("/challenges/:challengeId/quiz/submit", submitChallengeQuiz);

// =================== TOURNAMENTS ===================
router.get("/tournaments", getAvailableTournaments);
router.post("/tournaments/:tournamentId/register", registerForTournament);
router.get("/tournaments/:tournamentId/leaderboard", getTournamentLeaderboard);
router.post("/tournaments/:tournamentId/score", updateTournamentScore);
router.post("/tournaments/create", createTournament); // Admin only
router.post("/tournaments/create-sample", createSampleTournament); // Admin only - for testing
router.delete("/tournaments/:tournamentId", deleteTournament); // Admin only

// Tournament Quiz Routes
router.get("/tournaments/:tournamentId/quiz/start", startTournamentQuiz);
router.post("/tournaments/:tournamentId/quiz/submit", submitTournamentQuiz);

// =================== ADMIN UTILITIES ===================
router.get("/quizzes/available", getAvailableQuizzes); // Admin only - for creating challenges/tournaments

// =================== HISTORY ===================
router.get("/challenges/history", getChallengeHistory);
router.get("/tournaments/history", getTournamentHistory);

// =================== COMPLETED CHALLENGES & TOURNAMENTS ===================
router.get("/challenges/completed", getCompletedChallenges);
router.get("/tournaments/completed", getCompletedTournaments);

export default router;
