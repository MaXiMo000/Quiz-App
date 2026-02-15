import Quiz from "../models/Quiz.js";
import Report from "../models/Report.js";
import UserQuiz from "../models/User.js";
import StudyGroup from "../models/StudyGroup.js";
import logger from "../utils/logger.js";
import { sendSuccess, sendError, sendValidationError } from "../utils/responseHelper.js";
import AppError from "../utils/AppError.js";
import mongoose from "mongoose";

/**
 * Global Search Controller
 * Searches across quizzes, reports, users (admin only), and study groups
 */
export const globalSearch = async (req, res) => {
    try {
        const { q: query, type = "all", page = 1, limit = 10 } = req.query;
        const userId = req.user?.id;

        if (!query || query.trim().length === 0) {
            return sendValidationError(res, { query: "Search query is required" }, "Search query is required");
        }

        const searchQuery = query.trim();
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        // Escape special regex characters to prevent ReDoS attacks
        const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexQuery = new RegExp(escapedQuery, 'i');

        const results = {
            quizzes: [],
            reports: [],
            users: [],
            studyGroups: [],
            total: 0
        };

        // Search Quizzes
        if (type === "all" || type === "quizzes") {
            try {
                const userRole = req.user?.role;
                const userObjectId = userId && mongoose.Types.ObjectId.isValid(userId)
                    ? new mongoose.Types.ObjectId(userId)
                    : null;

                // Build base search query for text matching
                const textSearchQuery = {
                    $or: [
                        { title: regexQuery },
                        { description: regexQuery },
                        { category: regexQuery }
                    ]
                };

                // Build authorization filter based on user role
                let authorizationFilter = {};

                if (userRole === "admin") {
                    // Admin can see all quizzes - no filter needed
                    authorizationFilter = {};
                } else if (userRole === "premium" && userObjectId) {
                    // Premium users: only their own quizzes OR admin quizzes (createdBy._id === null)
                    authorizationFilter = {
                        $or: [
                            { "createdBy._id": userObjectId },
                            { "createdBy._id": null }
                        ]
                    };
                } else {
                    // Regular users: only admin quizzes
                    authorizationFilter = { "createdBy._id": null };
                }

                // Combine text search with authorization filter
                const quizQuery = {
                    $and: [
                        textSearchQuery,
                        authorizationFilter
                    ]
                };

                const [quizzes, quizCount] = await Promise.all([
                    Quiz.find(quizQuery)
                        .select("title description category duration totalMarks questions createdBy")
                        .limit(limitNum)
                        .skip(skip)
                        .lean(),
                    Quiz.countDocuments(quizQuery)
                ]);

                // Log for debugging
                logger.debug(`Search quizzes - User: ${userId}, Role: ${userRole}, Found: ${quizCount} quizzes`);
                if (quizzes.length > 0) {
                    const creatorIds = quizzes.map(q => q.createdBy?._id?.toString() || 'null');
                    logger.debug(`Quiz creator IDs in search results: ${[...new Set(creatorIds)].join(', ')}`);
                }

                results.quizzes = quizzes.map(quiz => ({
                    _id: quiz._id,
                    title: quiz.title,
                    description: quiz.description,
                    category: quiz.category,
                    duration: quiz.duration,
                    totalMarks: quiz.totalMarks,
                    questionCount: quiz.questions?.length || 0,
                    type: "quiz"
                }));
                results.total += quizCount;
            } catch (error) {
                logger.error({ message: "Error searching quizzes", error: error.message });
            }
        }

        // Search Reports
        if (type === "all" || type === "reports") {
            try {
                const reportQuery = {
                    $or: [
                        { quizName: regexQuery },
                        { userName: regexQuery }
                    ]
                };

                // Users can only see their own reports
                if (userId && req.user?.role !== "admin") {
                    reportQuery.user = new mongoose.Types.ObjectId(userId);
                }

                const [reports, reportCount] = await Promise.all([
                    Report.find(reportQuery)
                        .select("quizName userName score total createdAt")
                        .sort({ createdAt: -1 })
                        .limit(limitNum)
                        .skip(skip)
                        .lean(),
                    Report.countDocuments(reportQuery)
                ]);

                results.reports = reports.map(report => ({
                    _id: report._id,
                    quizName: report.quizName,
                    userName: report.userName,
                    score: report.score,
                    total: report.total,
                    createdAt: report.createdAt,
                    type: "report"
                }));
                results.total += reportCount;
            } catch (error) {
                logger.error({ message: "Error searching reports", error: error.message });
            }
        }

        // Search Users (Admin only)
        if ((type === "all" || type === "users") && req.user?.role === "admin") {
            try {
                const userQuery = {
                    $or: [
                        { name: regexQuery },
                        { email: regexQuery }
                    ]
                };

                const [users, userCount] = await Promise.all([
                    UserQuiz.find(userQuery)
                        .select("name email role level xp badges")
                        .limit(limitNum)
                        .skip(skip)
                        .lean(),
                    UserQuiz.countDocuments(userQuery)
                ]);

                results.users = users.map(user => ({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    level: user.level,
                    xp: user.xp,
                    badges: user.badges,
                    type: "user"
                }));
                results.total += userCount;
            } catch (error) {
                logger.error({ message: "Error searching users", error: error.message });
            }
        }

        // Search Study Groups
        if (type === "all" || type === "groups") {
            try {
                // Only show public study groups (isPrivate: false)
                const groupQuery = {
                    $and: [
                        {
                            $or: [
                                { name: regexQuery },
                                { description: regexQuery },
                                { tags: { $in: [regexQuery] } }
                            ]
                        },
                        {
                            isPrivate: false,
                            isActive: true
                        }
                    ]
                };

                const [groups, groupCount] = await Promise.all([
                    StudyGroup.find(groupQuery)
                        .populate("creator", "name email level")
                        .select("name description category tags members.length maxMembers createdAt isPrivate")
                        .sort({ updatedAt: -1 })
                        .limit(limitNum)
                        .skip(skip)
                        .lean(),
                    StudyGroup.countDocuments(groupQuery)
                ]);

                // Log for debugging - ensure only public groups are returned
                logger.debug(`Search study groups - User: ${userId}, Role: ${req.user?.role}, Found: ${groupCount} public groups`);
                const privateGroups = groups.filter(g => g.isPrivate);
                if (privateGroups.length > 0) {
                    logger.warn(`Found ${privateGroups.length} private groups in search results - this should not happen!`);
                }

                results.studyGroups = groups.map(group => ({
                    _id: group._id,
                    name: group.name,
                    description: group.description,
                    category: group.category,
                    tags: group.tags,
                    memberCount: group.members?.length || 0,
                    maxMembers: group.maxMembers,
                    creator: group.creator,
                    createdAt: group.createdAt,
                    type: "studyGroup"
                }));
                results.total += groupCount;
            } catch (error) {
                logger.error({ message: "Error searching study groups", error: error.message });
            }
        }

        logger.info(`User ${userId} searched for "${searchQuery}" (type: ${type}), found ${results.total} results`);

        return sendSuccess(res, {
            query: searchQuery,
            type,
            results,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: results.total,
                totalPages: Math.ceil(results.total / limitNum)
            }
        }, "Search completed successfully");

    } catch (error) {
        logger.error({ message: `Error in global search for user ${req.user?.id}`, error: error.message, stack: error.stack });
        throw new AppError("Error performing search", 500);
    }
};
