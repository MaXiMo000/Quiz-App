import express from "express";
import { getQuestionStats, getScoreTrends, getTopicHeatmap } from "../controllers/analyticsController.js";
import { verifyToken } from "../middleware/auth.js";
import cache from "../middleware/cache.js";

const router = express.Router();

router.get("/question-stats", verifyToken, cache, getQuestionStats);
router.get("/score-trends", verifyToken, cache, getScoreTrends);
router.get("/topic-heatmap", verifyToken, cache, getTopicHeatmap);

export default router;
