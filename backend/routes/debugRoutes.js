import express from 'express';
import { debugUserXP, resetUserXP, fixGoogleOAuthUsers } from '../controllers/debugController.js';
import { verifyToken } from '../middleware/auth.js';
import cacheService from '../services/cacheService.js';

const router = express.Router();

// Debug routes - REMOVE THESE IN PRODUCTION
router.get('/user/:userId/xp', verifyToken, debugUserXP);
router.post('/user/:userId/reset-xp', verifyToken, resetUserXP);
router.post('/fix-google-users', verifyToken, fixGoogleOAuthUsers);

// Cache management routes
router.post('/cache/clear', verifyToken, async (req, res) => {
  try {
    const { pattern = '*' } = req.body;
    const result = await cacheService.delPattern(pattern);
    res.json({ 
      success: true, 
      message: `Cleared ${result} cache keys matching pattern: ${pattern}` 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error clearing cache', 
      error: error.message 
    });
  }
});

router.post('/cache/clear-quizzes', verifyToken, async (req, res) => {
  try {
    const result1 = await cacheService.delPattern('api:GET:/quizzes*');
    const result2 = await cacheService.delPattern('*quizzes*');
    const total = result1 + result2;
    res.json({ 
      success: true, 
      message: `Cleared ${total} quiz-related cache keys` 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error clearing quiz cache', 
      error: error.message 
    });
  }
});

// Public cache clear endpoint (for debugging - remove in production)
router.post('/cache/clear-quizzes-public', async (req, res) => {
  try {
    const result1 = await cacheService.delPattern('api:GET:/quizzes*');
    const result2 = await cacheService.delPattern('*quizzes*');
    const result3 = await cacheService.delPattern('*quiz*');
    const total = result1 + result2 + result3;
    res.json({ 
      success: true, 
      message: `Cleared ${total} quiz-related cache keys (public endpoint)` 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error clearing quiz cache', 
      error: error.message 
    });
  }
});

export default router;
