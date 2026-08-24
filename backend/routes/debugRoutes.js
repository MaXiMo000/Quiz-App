import express from "express";
import { debugUserXP, resetUserXP, fixGoogleOAuthUsers } from "../controllers/debugController.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";
import { clearCacheByPattern } from "../middleware/cache.js";

const router = express.Router();

// Every route here reads or mutates an arbitrary user by id, so admin is the
// floor. verifyToken alone only proves the caller is logged in as somebody --
// which let any account reset any other account's progression.
router.use(verifyToken, requireAdmin);

router.get("/user/:userId/xp", debugUserXP);
router.post("/user/:userId/reset-xp", clearCacheByPattern("/api/users"), clearCacheByPattern("/api/dashboard"), resetUserXP);
router.post("/fix-google-users", clearCacheByPattern("/api/users"), clearCacheByPattern("/api/dashboard"), fixGoogleOAuthUsers);

export default router;
