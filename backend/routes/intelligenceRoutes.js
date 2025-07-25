import express from 'express';
import { 
    getSmartRecommendations, 
    getAdaptiveDifficulty, 
    getLearningAnalytics,
    updateUserPreferences
} from '../controllers/intelligenceController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Phase 2: Intelligence Layer Routes

// Smart Quiz Recommendations
router.get('/recommendations', verifyToken, getSmartRecommendations);

// Adaptive Difficulty System
router.get('/adaptive-difficulty', verifyToken, getAdaptiveDifficulty);

// Learning Analytics & Performance Predictions
router.get('/analytics', verifyToken, getLearningAnalytics);

// Update User Preferences (called after quiz completion)
router.post('/preferences', verifyToken, updateUserPreferences);

export default router;
