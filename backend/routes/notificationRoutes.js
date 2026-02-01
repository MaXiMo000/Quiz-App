import express from "express";
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from "../controllers/notificationController.js";
import { verifyToken } from "../middleware/auth.js";
import { generalLimiter } from "../middleware/rateLimiting.js";

const router = express.Router();

// Get user notifications
router.get("/", verifyToken, generalLimiter, getNotifications);

// Get unread count
router.get("/unread-count", verifyToken, generalLimiter, getUnreadCount);

// Mark notification as read
router.put("/:id/read", verifyToken, generalLimiter, markAsRead);

// Mark all as read
router.put("/read-all", verifyToken, generalLimiter, markAllAsRead);

// Delete notification
router.delete("/:id", verifyToken, generalLimiter, deleteNotification);

export default router;
