import express from "express";
import { getReviewSchedule, updateReview } from "../controllers/reviewController.js";
import { verifyToken } from "../middleware/auth.js";
import cache, { clearCacheByPattern } from "../middleware/cache.js";

const router = express.Router();

router.get("/", verifyToken, cache, getReviewSchedule);
router.post("/update", verifyToken, clearCacheByPattern("/api/reviews"), updateReview);

export default router;
