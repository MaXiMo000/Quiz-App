import express from "express";
import { getReviewSchedule, updateReview } from "../controllers/reviewController.js";
import { verifyToken } from "../middleware/auth.js";
import cache, { clearCacheByPattern } from "../middleware/cache.js";
import { quizLimiter } from "../middleware/rateLimiting.js";

const router = express.Router();

// Apply rate limiting to prevent 429 errors
router.get("/", verifyToken, quizLimiter, cache, getReviewSchedule);
router.post("/update", verifyToken, quizLimiter, clearCacheByPattern("/api/reviews"), updateReview);

export default router;
