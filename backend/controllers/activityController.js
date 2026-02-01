import Activity from "../models/Activity.js";
import logger from "../utils/logger.js";
import { sendSuccess } from "../utils/responseHelper.js";
import AppError from "../utils/AppError.js";
import mongoose from "mongoose";

/**
 * Create an activity
 */
export const createActivity = async (userId, type, data = {}) => {
    try {
        const activity = new Activity({
            userId,
            type,
            data
        });
        await activity.save();
        logger.debug(`Activity created for user ${userId}: ${type}`);
        return activity;
    } catch (error) {
        logger.error({ message: `Error creating activity for user ${userId}`, error: error.message });
        return null;
    }
};

/**
 * Get user activity feed
 */
export const getActivityFeed = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, startDate, endDate, page = 1, limit = 30 } = req.query;

        const query = { userId: new mongoose.Types.ObjectId(userId) };

        if (type && type !== "all") {
            query.type = type;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const [activities, total] = await Promise.all([
            Activity.find(query)
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .skip(skip)
                .lean(),
            Activity.countDocuments(query)
        ]);

        // Group activities by date
        const groupedActivities = activities.reduce((acc, activity) => {
            const date = new Date(activity.createdAt).toLocaleDateString();
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(activity);
            return acc;
        }, {});

        logger.info(`User ${userId} fetched ${activities.length} activities`);

        return sendSuccess(res, {
            activities: groupedActivities,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        }, "Activity feed fetched successfully");

    } catch (error) {
        logger.error({ message: `Error fetching activity feed for user ${req.user.id}`, error: error.message, stack: error.stack });
        throw new AppError("Error fetching activity feed", 500);
    }
};

/**
 * Get activity statistics
 */
export const getActivityStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const weekStart = new Date(now.setDate(now.getDate() - 7));
        const monthStart = new Date(now.setMonth(now.getMonth() - 1));

        const [today, thisWeek, thisMonth, total] = await Promise.all([
            Activity.countDocuments({
                userId: new mongoose.Types.ObjectId(userId),
                createdAt: { $gte: todayStart }
            }),
            Activity.countDocuments({
                userId: new mongoose.Types.ObjectId(userId),
                createdAt: { $gte: weekStart }
            }),
            Activity.countDocuments({
                userId: new mongoose.Types.ObjectId(userId),
                createdAt: { $gte: monthStart }
            }),
            Activity.countDocuments({
                userId: new mongoose.Types.ObjectId(userId)
            })
        ]);

        // Get activity breakdown by type
        const typeBreakdown = await Activity.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        return sendSuccess(res, {
            today,
            thisWeek,
            thisMonth,
            total,
            typeBreakdown: typeBreakdown.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        }, "Activity statistics fetched successfully");

    } catch (error) {
        logger.error({ message: `Error fetching activity stats for user ${req.user.id}`, error: error.message });
        throw new AppError("Error fetching activity statistics", 500);
    }
};
