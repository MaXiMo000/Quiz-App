import express from "express";
import { getDashboardData, getUserLeaderboardPosition, getUserAchievementsEndpoint, getAllCategories } from "../controllers/dashboardController.js";
import cache from "../middleware/cache.js";

const router = express.Router();

// Get comprehensive dashboard data for a user
router.get("/dashboard/:userId", cache, getDashboardData);

// Get user's leaderboard position
router.get("/leaderboard-position/:userId", cache, getUserLeaderboardPosition);

// Get user achievements
router.get("/achievements/:userId", cache, getUserAchievementsEndpoint);

// Get all available categories
router.get("/categories", cache, getAllCategories);

export default router;
