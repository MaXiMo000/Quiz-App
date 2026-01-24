import express from "express";
import { debugUserXP, resetUserXP, fixGoogleOAuthUsers } from "../controllers/debugController.js";
import { verifyToken } from "../middleware/auth.js";
import { clearCacheByPattern } from "../middleware/cache.js";

const router = express.Router();

// Debug routes - REMOVE THESE IN PRODUCTION
router.get("/user/:userId/xp", verifyToken, debugUserXP);
router.post("/user/:userId/reset-xp", verifyToken, clearCacheByPattern("/api/users"), clearCacheByPattern("/api/dashboard"), resetUserXP);
router.post("/fix-google-users", verifyToken, clearCacheByPattern("/api/users"), clearCacheByPattern("/api/dashboard"), fixGoogleOAuthUsers);

export default router;
