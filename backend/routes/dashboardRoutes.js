import express from "express";
import { getDashboardData, getUserLeaderboardPosition, getUserAchievementsEndpoint, getAllCategories } from "../controllers/dashboardController.js";
import cache from "../middleware/cache.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Get comprehensive dashboard data for a user
router.get("/dashboard/:userId", verifyToken, cache, getDashboardData);

// Get user's leaderboard position
router.get("/leaderboard-position/:userId", verifyToken, cache, getUserLeaderboardPosition);

// Get user achievements
router.get("/achievements/:userId", verifyToken, cache, getUserAchievementsEndpoint);

// Get all available categories
router.get("/categories", verifyToken, cache, getAllCategories);

export default router;
