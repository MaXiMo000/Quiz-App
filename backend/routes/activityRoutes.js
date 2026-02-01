import express from "express";
import {
    getActivityFeed,
    getActivityStats
} from "../controllers/activityController.js";
import { verifyToken } from "../middleware/auth.js";
import { generalLimiter } from "../middleware/rateLimiting.js";

const router = express.Router();

// Get activity feed
router.get("/", verifyToken, generalLimiter, getActivityFeed);

// Get activity statistics
router.get("/stats", verifyToken, generalLimiter, getActivityStats);

export default router;

// Export createActivity for use in other controllers
export { createActivity } from "../controllers/activityController.js";
