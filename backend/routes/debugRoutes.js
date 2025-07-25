import express from 'express';
import { debugUserXP, resetUserXP, fixGoogleOAuthUsers } from '../controllers/debugController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Debug routes - REMOVE THESE IN PRODUCTION
router.get('/user/:userId/xp', verifyToken, debugUserXP);
router.post('/user/:userId/reset-xp', verifyToken, resetUserXP);
router.post('/fix-google-users', verifyToken, fixGoogleOAuthUsers);

export default router;
