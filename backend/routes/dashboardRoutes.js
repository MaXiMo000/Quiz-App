import express from 'express';
import { getDashboardData, getUserLeaderboardPosition, getUserAchievementsEndpoint } from '../controllers/dashboardController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get comprehensive dashboard data for a user
router.get('/:userId', verifyToken, getDashboardData);

// Get user's leaderboard position
router.get('/leaderboard-position/:userId', verifyToken, getUserLeaderboardPosition);

// Get user achievements
router.get('/achievements/:userId', verifyToken, getUserAchievementsEndpoint);

export default router;
