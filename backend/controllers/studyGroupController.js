import StudyGroup from "../models/StudyGroup.js";
import UserQuiz from "../models/User.js";
import Quiz from "../models/Quiz.js";
import { withCachingAndLogging, controllerConfigs, cacheKeyGenerators } from "../utils/controllerUtils.js";
import logger from "../utils/logger.js";

// Create study group
const _createStudyGroup = async (req, res) => {
    try {
        const { name, description, isPrivate, maxMembers, category, tags } = req.body;
        const creatorId = req.user.id;

        // Validation
        if (!name || name.trim().length < 3) {
            return res.status(400).json({ message: "Study group name must be at least 3 characters" });
        }

        if (maxMembers && (maxMembers < 2 || maxMembers > 100)) {
            return res.status(400).json({ message: "Max members must be between 2 and 100" });
        }

        // Create study group
        const studyGroup = new StudyGroup({
            name: name.trim(),
            description: description?.trim() || "",
            creator: creatorId,
            isPrivate: !!isPrivate,
            maxMembers: maxMembers || 50,
            category: category?.trim() || "",
            tags: tags || [],
            members: [{
                user: creatorId,
                role: "admin",
                joinedAt: new Date()
            }],
            activities: [{
                type: "member_joined",
                user: creatorId,
                details: { message: "Study group created" },
                timestamp: new Date()
            }]
        });

        await studyGroup.save();

        try {
            // Get current user to check their current stats
            const user = await UserQuiz.findById(creatorId);
            const currentGroupsCreated = user?.social?.socialStats?.groupsCreated || 0;
            
            // Add to creator's study groups
            await UserQuiz.findByIdAndUpdate(creatorId, {
                $push: { 
                    "social.studyGroups": studyGroup._id
                },
                $set: {
                    "social.socialStats.groupsCreated": currentGroupsCreated + 1
                }
            });
        } catch (userUpdateError) {
            console.error("Error updating user after group creation:", userUpdateError);
            // If user update fails, we should still return success since the group was created
            // The user can still access the group, just the stats won't be updated
        }

        res.status(201).json({
            message: "Study group created successfully",
            studyGroup: await studyGroup.populate('creator', 'name email level')
        });

    } catch (error) {
        logger.error("Error creating study group", { 
            context: 'StudyGroupController', 
            operation: 'Create Study Group',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const createStudyGroup = withCachingAndLogging(_createStudyGroup, {
    ...controllerConfigs.studyGroup,
    operation: 'Create Study Group',
    cacheTTL: 0, // No caching for create operations
    logFields: ['body.name', 'body.category']
});

// Join study group
const _joinStudyGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.id;

        const studyGroup = await StudyGroup.findById(groupId);
        if (!studyGroup) {
            return res.status(404).json({ message: "Study group not found" });
        }

        if (!studyGroup.isActive) {
            return res.status(400).json({ message: "This study group is no longer active" });
        }

        // Check if already a member
        const isMember = studyGroup.members.some(member => 
            member.user.toString() === userId
        );

        if (isMember) {
            return res.status(400).json({ message: "You are already a member of this group" });
        }

        // Check if group is full
        if (studyGroup.members.length >= studyGroup.maxMembers) {
            return res.status(400).json({ message: "Study group is full" });
        }

        // Add member
        studyGroup.members.push({
            user: userId,
            role: "member",
            joinedAt: new Date()
        });

        // Add activity
        studyGroup.activities.push({
            type: "member_joined",
            user: userId,
            details: { message: "Joined the group" },
            timestamp: new Date()
        });

        await studyGroup.save();

        // Add to user's study groups
        await UserQuiz.findByIdAndUpdate(userId, {
            $push: { "social.studyGroups": groupId }
        });

        res.json({
            message: "Successfully joined study group",
            studyGroup: await studyGroup.populate('members.user', 'name email level')
        });

    } catch (error) {
        logger.error("Error joining study group", { 
            context: 'StudyGroupController', 
            operation: 'Join Study Group',
            groupId: req.params.groupId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const joinStudyGroup = withCachingAndLogging(_joinStudyGroup, {
    ...controllerConfigs.studyGroup,
    operation: 'Join Study Group',
    cacheTTL: 0, // No caching for join operations
    logFields: ['params.groupId']
});

// Leave study group
const _leaveStudyGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.id;

        const studyGroup = await StudyGroup.findById(groupId);
        if (!studyGroup) {
            return res.status(404).json({ message: "Study group not found" });
        }

        // Check if user is a member
        const memberIndex = studyGroup.members.findIndex(member => 
            member.user.toString() === userId
        );

        if (memberIndex === -1) {
            return res.status(400).json({ message: "You are not a member of this group" });
        }

        const member = studyGroup.members[memberIndex];

        // If user is the creator and there are other members, transfer ownership
        if (member.role === "admin" && studyGroup.members.length > 1) {
            // Find the oldest member to make new admin
            const oldestMember = studyGroup.members
                .filter(m => m.user.toString() !== userId)
                .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt))[0];
            
            if (oldestMember) {
                oldestMember.role = "admin";
            }
        }

        // Remove member
        studyGroup.members.splice(memberIndex, 1);

        // If no members left, deactivate group
        if (studyGroup.members.length === 0) {
            studyGroup.isActive = false;
        }

        // Add activity
        studyGroup.activities.push({
            type: "member_left",
            user: userId,
            details: { message: "Left the group" },
            timestamp: new Date()
        });

        await studyGroup.save();

        // Remove from user's study groups
        await UserQuiz.findByIdAndUpdate(userId, {
            $pull: { "social.studyGroups": groupId }
        });

        res.json({ message: "Successfully left study group" });

    } catch (error) {
        logger.error("Error leaving study group", { 
            context: 'StudyGroupController', 
            operation: 'Leave Study Group',
            groupId: req.params.groupId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const leaveStudyGroup = withCachingAndLogging(_leaveStudyGroup, {
    ...controllerConfigs.studyGroup,
    operation: 'Leave Study Group',
    cacheTTL: 0, // No caching for leave operations
    logFields: ['params.groupId']
});

// Get user's study groups
const _getUserStudyGroups = async (req, res) => {
    try {
        const userId = req.user.id;

        const studyGroups = await StudyGroup.find({
            "members.user": userId,
            isActive: true
        })
        .populate('creator', 'name email level')
        .populate('members.user', 'name email level isOnline')
        .sort({ updatedAt: -1 });

        res.json({ studyGroups });

    } catch (error) {
        logger.error("Error getting user study groups", { 
            context: 'StudyGroupController', 
            operation: 'Get User Study Groups',
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const getUserStudyGroups = withCachingAndLogging(_getUserStudyGroups, {
    ...controllerConfigs.studyGroup,
    operation: 'Get User Study Groups',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `user-study-groups:${req.user?.id}`
});

// Search public study groups
const _searchStudyGroups = async (req, res) => {
    try {
        const { query, category, page = 1, limit = 10 } = req.query;
        const userId = req.user.id;

        let searchCriteria = {
            isPrivate: false,
            isActive: true,
            "members.user": { $ne: userId } // Exclude groups user is already in
        };

        if (query) {
            searchCriteria.$or = [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { tags: { $in: [new RegExp(query, 'i')] } }
            ];
        }

        if (category) {
            searchCriteria.category = { $regex: category, $options: 'i' };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const studyGroups = await StudyGroup.find(searchCriteria)
            .populate('creator', 'name email level')
            .select('name description category tags members.length maxMembers createdAt')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await StudyGroup.countDocuments(searchCriteria);

        res.json({
            studyGroups: studyGroups.map(group => ({
                ...group.toObject(),
                memberCount: group.members.length
            })),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalGroups: total,
                hasNext: skip + parseInt(limit) < total
            }
        });

    } catch (error) {
        logger.error("Error searching study groups", { 
            context: 'StudyGroupController', 
            operation: 'Search Study Groups',
            query: req.query.query,
            category: req.query.category,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const searchStudyGroups = withCachingAndLogging(_searchStudyGroups, {
    ...controllerConfigs.studyGroup,
    operation: 'Search Study Groups',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `search-study-groups:${req.query.query}:${req.query.category}:${req.user?.id}`
});

// Get study group details
const _getStudyGroupDetails = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.id;

        const studyGroup = await StudyGroup.findById(groupId)
            .populate('creator', 'name email level')
            .populate('members.user', 'name email level xp isOnline lastSeen')
            .populate('activities.user', 'name');

        if (!studyGroup) {
            return res.status(404).json({ message: "Study group not found" });
        }

        // Check if user can view this group
        const isMember = studyGroup.members.some(member => 
            member.user._id.toString() === userId
        );

        if (studyGroup.isPrivate && !isMember) {
            return res.status(403).json({ message: "This is a private study group" });
        }

        // Get recent activities (limit to last 50)
        const recentActivities = studyGroup.activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50);

        res.json({
            studyGroup: {
                ...studyGroup.toObject(),
                activities: recentActivities,
                userRole: isMember ? studyGroup.members.find(m => 
                    m.user._id.toString() === userId
                )?.role : null
            }
        });

    } catch (error) {
        logger.error("Error getting study group details", { 
            context: 'StudyGroupController', 
            operation: 'Get Study Group Details',
            groupId: req.params.groupId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const getStudyGroupDetails = withCachingAndLogging(_getStudyGroupDetails, {
    ...controllerConfigs.studyGroup,
    operation: 'Get Study Group Details',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `study-group-details:${req.params.groupId}:${req.user?.id}`
});

// Share quiz with study group
const _shareQuizWithGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { quizId, message } = req.body;
        const userId = req.user.id;

        const studyGroup = await StudyGroup.findById(groupId);
        if (!studyGroup) {
            return res.status(404).json({ message: "Study group not found" });
        }

        // Check if user is a member
        const isMember = studyGroup.members.some(member => 
            member.user.toString() === userId
        );

        if (!isMember) {
            return res.status(403).json({ message: "You must be a member to share quizzes" });
        }

        // Verify quiz exists
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        // Add activity
        studyGroup.activities.push({
            type: "quiz_shared",
            user: userId,
            details: {
                quizId: quizId,
                quizTitle: quiz.title,
                message: message || `Shared "${quiz.title}" quiz`
            },
            timestamp: new Date()
        });

        // Update stats
        studyGroup.stats.totalQuizzes += 1;
        await studyGroup.save();

        // Update user stats
        await UserQuiz.findByIdAndUpdate(userId, {
            $inc: { "social.socialStats.quizzesShared": 1 }
        });

        res.json({
            message: "Quiz shared successfully",
            activity: studyGroup.activities[studyGroup.activities.length - 1]
        });

    } catch (error) {
        logger.error("Error sharing quiz", { 
            context: 'StudyGroupController', 
            operation: 'Share Quiz With Group',
            groupId: req.params.groupId,
            quizId: req.body.quizId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const shareQuizWithGroup = withCachingAndLogging(_shareQuizWithGroup, {
    ...controllerConfigs.studyGroup,
    operation: 'Share Quiz With Group',
    cacheTTL: 0, // No caching for share operations
    logFields: ['params.groupId', 'body.quizId']
});

// Update study group settings (admin only)
const _updateStudyGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description, maxMembers, category, tags } = req.body;
        const userId = req.user.id;

        const studyGroup = await StudyGroup.findById(groupId);
        if (!studyGroup) {
            return res.status(404).json({ message: "Study group not found" });
        }

        // Check if user is admin
        const member = studyGroup.members.find(member => 
            member.user.toString() === userId
        );

        if (!member || member.role !== "admin") {
            return res.status(403).json({ message: "Only admins can update group settings" });
        }

        // Update fields
        if (name && name.trim().length >= 3) {
            studyGroup.name = name.trim();
        }
        if (description !== undefined) {
            studyGroup.description = description.trim();
        }
        if (maxMembers && maxMembers >= studyGroup.members.length && maxMembers <= 100) {
            studyGroup.maxMembers = maxMembers;
        }
        if (category !== undefined) {
            studyGroup.category = category.trim();
        }
        if (tags && Array.isArray(tags)) {
            studyGroup.tags = tags;
        }

        await studyGroup.save();

        res.json({
            message: "Study group updated successfully",
            studyGroup: await studyGroup.populate('members.user', 'name email level')
        });

    } catch (error) {
        logger.error("Error updating study group", { 
            context: 'StudyGroupController', 
            operation: 'Update Study Group',
            groupId: req.params.groupId,
            userId: req.user?.id,
            error: error.message 
        });
        res.status(500).json({ message: "Server error" });
    }
};

export const updateStudyGroup = withCachingAndLogging(_updateStudyGroup, {
    ...controllerConfigs.studyGroup,
    operation: 'Update Study Group',
    cacheTTL: 0, // No caching for update operations
    logFields: ['params.groupId', 'body.name']
});
