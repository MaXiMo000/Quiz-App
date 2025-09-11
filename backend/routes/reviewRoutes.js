import express from "express";
import { getReviewSchedule, updateReview } from "../controllers/reviewController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", verifyToken, getReviewSchedule);
router.post("/update", verifyToken, updateReview);

export default router;
