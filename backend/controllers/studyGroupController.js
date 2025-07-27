import StudyGroup from "../models/StudyGroup.js";
import UserQuiz from "../models/User.js";
import Quiz from "../models/Quiz.js";

// Create study group
export const createStudyGroup = async (req, res) => {
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
        console.error("Error creating study group:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Join study group
export const joinStudyGroup = async (req, res) => {
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
        console.error("Error joining study group:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Leave study group
export const leaveStudyGroup = async (req, res) => {
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
        console.error("Error leaving study group:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get user's study groups
export const getUserStudyGroups = async (req, res) => {
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
        console.error("Error getting user study groups:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Search public study groups
export const searchStudyGroups = async (req, res) => {
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
        console.error("Error searching study groups:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get study group details
export const getStudyGroupDetails = async (req, res) => {
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
        console.error("Error getting study group details:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Share quiz with study group
export const shareQuizWithGroup = async (req, res) => {
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
        console.error("Error sharing quiz:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update study group settings (admin only)
export const updateStudyGroup = async (req, res) => {
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
        console.error("Error updating study group:", error);
        res.status(500).json({ message: "Server error" });
    }
};
