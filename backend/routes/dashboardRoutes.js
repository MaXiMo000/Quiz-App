import express from "express";
import { getDashboardData, getUserLeaderboardPosition, getUserAchievementsEndpoint, getAllCategories } from "../controllers/dashboardController.js";

const router = express.Router();

// Get comprehensive dashboard data for a user
router.get("/dashboard/:userId", getDashboardData);

// Get user's leaderboard position
router.get("/leaderboard-position/:userId", getUserLeaderboardPosition);

// Get user achievements
router.get("/achievements/:userId", getUserAchievementsEndpoint);

// Get all available categories
router.get("/categories", getAllCategories);

export default router;
