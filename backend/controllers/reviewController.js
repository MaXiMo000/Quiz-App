import { getReviewScheduleForUser, updateReviewSchedule } from "../services/reviewScheduler.js";
import logger from "../utils/logger.js";

export const getReviewSchedule = async (req, res) => {
    logger.info(`Getting review schedule for user ${req.user.id}`);
    try {
        const userId = req.user.id;
        const schedule = await getReviewScheduleForUser(userId);
        logger.info(`Successfully fetched review schedule for user ${userId}`);
        res.json(schedule);
    } catch (error) {
        logger.error({ message: `Error getting review schedule for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateReview = async (req, res) => {
    logger.info(`Updating review for user ${req.user.id}, quiz ${req.body.quizId}, question ${req.body.questionId}`);
    try {
        const userId = req.user.id;
        const { quizId, questionId, quality } = req.body;

        // Validate required parameters
        if (!quizId || !questionId || !quality) {
            logger.warn(`Missing required parameters for review update: quizId=${quizId}, questionId=${questionId}, quality=${quality}`);
            return res.status(400).json({ message: "Missing required parameters: quizId, questionId, and quality are required" });
        }

        const schedule = await updateReviewSchedule(userId, quizId, questionId, quality);
        logger.info(`Successfully updated review schedule for user ${userId}, quiz ${quizId}, question ${questionId}`);
        res.json(schedule);
    } catch (error) {
        logger.error({ message: `Error updating review schedule for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Internal Server Error" });
    }
};
