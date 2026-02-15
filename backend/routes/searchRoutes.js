import express from "express";
import { globalSearch } from "../controllers/searchController.js";
import { verifyToken } from "../middleware/auth.js";
import { generalLimiter } from "../middleware/rateLimiting.js";

const router = express.Router();

// Global search endpoint
router.get("/", verifyToken, generalLimiter, globalSearch);

export default router;
