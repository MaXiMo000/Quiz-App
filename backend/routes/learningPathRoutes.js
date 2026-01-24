import express from "express";
import {
    getLearningPaths,
    getLearningPath,
    startLearningPath,
    updateNodeProgress,
    getLearningAnalytics,
    getUserCompetencies,
    updateCompetencyFromQuiz
} from "../controllers/learningPathController.js";
import { verifyToken } from "../middleware/auth.js";
import cache, { clearCacheByPattern } from "../middleware/cache.js";

const router = express.Router();

// All learning path routes require authentication
router.use(verifyToken);

// Learning Paths
router.get("/", cache, getLearningPaths);
router.get("/:pathId", cache, getLearningPath);
router.post("/:pathId/start", clearCacheByPattern("/api/learning-paths"), startLearningPath);
router.patch("/:pathId/nodes/:nodeId", clearCacheByPattern("/api/learning-paths"), updateNodeProgress);

// Analytics
router.get("/analytics/overview", cache, getLearningAnalytics);

// Competencies
router.get("/competencies/user", cache, getUserCompetencies);
router.post("/competencies/update-from-quiz", clearCacheByPattern("/api/learning-paths"), updateCompetencyFromQuiz);

export default router;
