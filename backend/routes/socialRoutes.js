import express from "express";
import {
    sendFriendRequest,
    respondToFriendRequest,
    getFriends,
    getPendingRequests,
    removeFriend,
    searchUsers,
    getFriendProgress,
    blockUser,
    unblockUser,
    getBlockedUsers
} from "../controllers/socialController.js";
import { verifyToken } from "../middleware/auth.js";
import cache, { clearCacheByPattern } from "../middleware/cache.js";

const router = express.Router();

// All social routes require authentication
router.use(verifyToken);

// Friend system routes
router.post("/friends/request", clearCacheByPattern("/api/friends"), sendFriendRequest);
router.post("/friends/respond", clearCacheByPattern("/api/friends"), respondToFriendRequest);
router.get("/friends", cache, getFriends);
router.get("/friends/requests", cache, getPendingRequests);
router.delete("/friends/:friendId", clearCacheByPattern("/api/friends"), removeFriend);
router.get("/friends/:friendId/progress", cache, getFriendProgress);

// Blocking system routes
router.post("/users/:userId/block", clearCacheByPattern("/api/friends"), blockUser);
router.delete("/users/:userId/block", clearCacheByPattern("/api/friends"), unblockUser);
router.get("/blocked", cache, getBlockedUsers);

// User search
router.get("/users/search", searchUsers);

export default router;
