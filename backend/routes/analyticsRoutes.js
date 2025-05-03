import express from "express";
import { getQuestionStats, getScoreTrends, getTopicHeatmap } from "../controllers/analyticsController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/question-stats", verifyToken, getQuestionStats);
router.get("/score-trends", verifyToken, getScoreTrends);
router.get("/topic-heatmap", verifyToken, getTopicHeatmap);

export default router;