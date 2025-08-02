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

const router = express.Router();

// All learning path routes require authentication
router.use(verifyToken);

// Learning Paths
router.get("/", getLearningPaths);
router.get("/:pathId", getLearningPath);
router.post("/:pathId/start", startLearningPath);
router.patch("/:pathId/nodes/:nodeId", updateNodeProgress);

// Analytics
router.get("/analytics/overview", getLearningAnalytics);

// Competencies
router.get("/competencies/user", getUserCompetencies);
router.post("/competencies/update-from-quiz", updateCompetencyFromQuiz);

export default router;
