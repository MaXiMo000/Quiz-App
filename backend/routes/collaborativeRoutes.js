import express from "express";
import {
    createCollaborativeSession,
    joinCollaborativeSession,
} from "../controllers/collaborativeController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Health check endpoint (no auth required)
router.get("/health", (req, res) => {
    res.json({
        status: "ok",
        service: "collaborative-quiz",
        timestamp: new Date().toISOString()
    });
});

// All other routes in this file are protected by the auth middleware
router.use(verifyToken);

// Create a new collaborative quiz session
router.post("/sessions", createCollaborativeSession);

// Join a collaborative quiz session
router.post("/sessions/:roomId/join", joinCollaborativeSession);

export default router;
