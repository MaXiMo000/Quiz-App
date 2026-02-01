import Notification from "../models/Notification.js";
import logger from "../utils/logger.js";
import { sendSuccess, sendError, sendValidationError, sendNotFound } from "../utils/responseHelper.js";
import AppError from "../utils/AppError.js";
import mongoose from "mongoose";

/**
 * Create a notification
 */
export const createNotification = async (userId, type, title, message, data = {}) => {
    try {
        const notification = new Notification({
            userId,
            type,
            title,
            message,
            data
        });
        await notification.save();
        logger.info(`Notification created for user ${userId}: ${type} - ${title}`);
        return notification;
    } catch (error) {
        logger.error({ message: `Error creating notification for user ${userId}`, error: error.message });
        return null;
    }
};

/**
 * Get user notifications
 */
export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, read, page = 1, limit = 20 } = req.query;

        const query = { userId: new mongoose.Types.ObjectId(userId) };

        if (type && type !== "all") {
            query.type = type;
        }

        if (read !== undefined) {
            query.read = read === "true";
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .skip(skip)
                .lean(),
            Notification.countDocuments(query)
        ]);

        logger.info(`User ${userId} fetched ${notifications.length} notifications`);

        return sendSuccess(res, {
            notifications,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        }, "Notifications fetched successfully");

    } catch (error) {
        logger.error({ message: `Error fetching notifications for user ${req.user.id}`, error: error.message, stack: error.stack });
        throw new AppError("Error fetching notifications", 500);
    }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const count = await Notification.countDocuments({
            userId: new mongoose.Types.ObjectId(userId),
            read: false
        });

        return sendSuccess(res, { count }, "Unread count fetched successfully");

    } catch (error) {
        logger.error({ message: `Error fetching unread count for user ${req.user.id}`, error: error.message });
        throw new AppError("Error fetching unread count", 500);
    }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendValidationError(res, { id: "Invalid notification ID" }, "Invalid notification ID");
        }

        const notification = await Notification.findOne({
            _id: id,
            userId: new mongoose.Types.ObjectId(userId)
        });

        if (!notification) {
            return sendNotFound(res, "Notification");
        }

        notification.read = true;
        await notification.save();

        logger.info(`User ${userId} marked notification ${id} as read`);

        return sendSuccess(res, { notification }, "Notification marked as read");

    } catch (error) {
        logger.error({ message: `Error marking notification as read for user ${req.user.id}`, error: error.message });
        throw new AppError("Error marking notification as read", 500);
    }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await Notification.updateMany(
            {
                userId: new mongoose.Types.ObjectId(userId),
                read: false
            },
            {
                $set: { read: true }
            }
        );

        logger.info(`User ${userId} marked ${result.modifiedCount} notifications as read`);

        return sendSuccess(res, { count: result.modifiedCount }, "All notifications marked as read");

    } catch (error) {
        logger.error({ message: `Error marking all notifications as read for user ${req.user.id}`, error: error.message });
        throw new AppError("Error marking all notifications as read", 500);
    }
};

/**
 * Delete notification
 */
export const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendValidationError(res, { id: "Invalid notification ID" }, "Invalid notification ID");
        }

        const notification = await Notification.findOneAndDelete({
            _id: id,
            userId: new mongoose.Types.ObjectId(userId)
        });

        if (!notification) {
            return sendNotFound(res, "Notification");
        }

        logger.info(`User ${userId} deleted notification ${id}`);

        return sendSuccess(res, {}, "Notification deleted successfully");

    } catch (error) {
        logger.error({ message: `Error deleting notification for user ${req.user.id}`, error: error.message });
        throw new AppError("Error deleting notification", 500);
    }
};
