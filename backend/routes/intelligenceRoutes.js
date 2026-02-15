import express from "express";
import {
    getSmartRecommendations,
    getAdaptiveDifficulty,
    getLearningAnalytics,
    updateUserPreferences,
    trackUserPerformance
} from "../controllers/intelligenceController.js";
import { verifyToken } from "../middleware/auth.js";
import cache, { clearCacheByPattern } from "../middleware/cache.js";

const router = express.Router();

// Phase 2: Intelligence Layer Routes

// Smart Quiz Recommendations
router.get("/recommendations", verifyToken, cache, getSmartRecommendations);

// Adaptive Difficulty System
router.get("/adaptive-difficulty", verifyToken, cache, getAdaptiveDifficulty);

// Learning Analytics & Performance Predictions
router.get("/analytics", verifyToken, cache, getLearningAnalytics);

// Update User Preferences (called after quiz completion - auto-update based on performance)
router.post("/preferences", verifyToken, clearCacheByPattern("/api/recommendations"), clearCacheByPattern("/api/users"), updateUserPreferences);

router.post("/track-performance", verifyToken, clearCacheByPattern("/api/analytics"), trackUserPerformance);

export default router;
