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

const router = express.Router();

// All social routes require authentication
router.use(verifyToken);

// Friend system routes
router.post("/friends/request", sendFriendRequest);
router.post("/friends/respond", respondToFriendRequest);
router.get("/friends", getFriends);
router.get("/friends/requests", getPendingRequests);
router.delete("/friends/:friendId", removeFriend);
router.get("/friends/:friendId/progress", getFriendProgress);

// Blocking system routes
router.post("/users/:userId/block", blockUser);
router.delete("/users/:userId/block", unblockUser);
router.get("/blocked", getBlockedUsers);

// User search
router.get("/users/search", searchUsers);

export default router;
