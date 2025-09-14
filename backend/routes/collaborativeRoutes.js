import express from 'express';
import {
    createCollaborativeSession,
    joinCollaborativeSession,
} from '../controllers/collaborativeController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes in this file are protected by the auth middleware
router.use(auth);

// Create a new collaborative quiz session
router.post('/sessions', createCollaborativeSession);

// Join a collaborative quiz session
router.post('/sessions/:roomId/join', joinCollaborativeSession);

export default router;
