import logger from "../utils/logger.js";
import { createSession, joinSession } from "../services/collaborativeQuizService.js";

export const createCollaborativeSession = async (req, res) => {
    try {
        const { quizId, settings } = req.body;
        const hostId = req.user.id;
        const session = await createSession(quizId, hostId, settings);
        res.status(201).json({ session });
    } catch (error) {
        logger.error({ message: "Error creating collaborative session", error: error.message, stack: error.stack });
        res.status(500).json({ message: "Failed to create collaborative session" });
    }
};

export const joinCollaborativeSession = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.id;
        const session = await joinSession(roomId, userId);
        res.json({ message: "Successfully joined session", session });
    } catch (error) {
        logger.error({ message: "Error joining collaborative session", error: error.message, stack: error.stack });
        res.status(500).json({ message: "Failed to join collaborative session" });
    }
};
