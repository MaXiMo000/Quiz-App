import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getRoomStatus, getActiveRooms } from '../controllers/realTimeQuizController.js';

const router = express.Router();

// Get specific room status
router.get('/room/:roomId', verifyToken, getRoomStatus);

// Get all active public rooms
router.get('/active-rooms', verifyToken, getActiveRooms);

// Get user's multiplayer stats
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const User = (await import('../models/User.js')).default;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get multiplayer stats from social.socialStats
        const multiplayerGames = user.social?.socialStats?.multiplayerGames || 0;
        const multiplayerWins = user.social?.socialStats?.multiplayerWins || 0;
        
        const stats = {
            multiplayerGames,
            multiplayerWins,
            averageScore: 0, // We'll calculate this later when we have game history
            favoriteCategory: user.preferences?.favoriteCategories?.[0] || 'General',
            winRate: multiplayerGames > 0 ? 
                Math.round((multiplayerWins / multiplayerGames) * 100) : 0
        };

        res.json({ stats });
    } catch (error) {
        console.error('Error getting multiplayer stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
