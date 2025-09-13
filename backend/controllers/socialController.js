import Friend from "../models/Friend.js";
import UserQuiz from "../models/User.js";
import logger from "../utils/logger.js";

// Send friend request
export const sendFriendRequest = async (req, res) => {
    logger.info(`User ${req.user.id} sending friend request to ${req.body.recipientId}`);
    try {
        const { recipientId } = req.body;
        const requesterId = req.user.id;

        // Validation
        if (!recipientId) {
            logger.warn(`User ${requesterId} tried to send a friend request without a recipient ID`);
            return res.status(400).json({ message: "Recipient ID is required" });
        }

        if (requesterId === recipientId) {
            logger.warn(`User ${requesterId} tried to send a friend request to themselves`);
            return res.status(400).json({ message: "Cannot send friend request to yourself" });
        }

        // Check if recipient exists
        const recipient = await UserQuiz.findById(recipientId);
        if (!recipient) {
            logger.warn(`User ${requesterId} tried to send a friend request to a non-existent user ${recipientId}`);
            return res.status(404).json({ message: "User not found" });
        }

        // Check privacy settings
        if (!recipient.social?.privacy?.allowFriendRequests) {
            logger.warn(`User ${requesterId} tried to send a friend request to a user ${recipientId} who is not accepting requests`);
            return res.status(403).json({ message: "This user is not accepting friend requests" });
        }

        // Check if they're already friends
        const existingFriend = await Friend.findOne({
            $or: [
                { requester: requesterId, recipient: recipientId },
                { requester: recipientId, recipient: requesterId }
            ]
        });

        if (existingFriend) {
            logger.warn(`User ${requesterId} tried to send a friend request to ${recipientId} but a relationship already exists with status ${existingFriend.status}`);
            if (existingFriend.status === "accepted") {
                return res.status(400).json({ message: "You are already friends" });
            } else if (existingFriend.status === "pending") {
                return res.status(400).json({ message: "Friend request already sent" });
            } else if (existingFriend.status === "blocked") {
                return res.status(403).json({ message: "Cannot send friend request" });
            }
        }

        // Create friend request
        const friendRequest = new Friend({
            requester: requesterId,
            recipient: recipientId,
            status: "pending"
        });

        await friendRequest.save();

        // Update users' friend request arrays
        await UserQuiz.findByIdAndUpdate(requesterId, {
            $push: { "social.friendRequests.sent": friendRequest._id }
        });

        await UserQuiz.findByIdAndUpdate(recipientId, {
            $push: { "social.friendRequests.received": friendRequest._id }
        });

        logger.info(`Friend request sent successfully from ${requesterId} to ${recipientId}`);
        res.status(201).json({
            message: "Friend request sent successfully",
            friendRequest: await friendRequest.populate("recipient", "name email")
        });

    } catch (error) {
        logger.error({ message: `Error sending friend request from ${req.user.id} to ${req.body.recipientId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Accept/decline friend request
export const respondToFriendRequest = async (req, res) => {
    logger.info(`User ${req.user.id} responding to friend request ${req.body.requestId} with action ${req.body.action}`);
    try {
        const { requestId, action } = req.body; // action: 'accept' or 'decline'
        const userId = req.user.id;

        if (!["accept", "decline"].includes(action)) {
            logger.warn(`Invalid action "${action}" for friend request response by user ${userId}`);
            return res.status(400).json({ message: "Invalid action" });
        }

        const friendRequest = await Friend.findById(requestId);
        if (!friendRequest) {
            logger.warn(`Friend request not found: ${requestId}`);
            return res.status(404).json({ message: "Friend request not found" });
        }

        // Check if user is the recipient
        if (friendRequest.recipient.toString() !== userId) {
            logger.warn(`User ${userId} not authorized to respond to friend request ${requestId}`);
            return res.status(403).json({ message: "Not authorized to respond to this request" });
        }

        if (friendRequest.status !== "pending") {
            logger.warn(`User ${userId} attempted to respond to already actioned friend request ${requestId}`);
            return res.status(400).json({ message: "Friend request already responded to" });
        }

        // Update request status
        friendRequest.status = action === "accept" ? "accepted" : "declined";
        friendRequest.responseDate = new Date();
        await friendRequest.save();

        if (action === "accept") {
            // Add to friends list for both users
            await UserQuiz.findByIdAndUpdate(friendRequest.requester, {
                $push: { "social.friends": friendRequest.recipient }
            });

            await UserQuiz.findByIdAndUpdate(friendRequest.recipient, {
                $push: { "social.friends": friendRequest.requester }
            });
        }

        // Remove from pending requests
        await UserQuiz.findByIdAndUpdate(friendRequest.requester, {
            $pull: { "social.friendRequests.sent": requestId }
        });

        await UserQuiz.findByIdAndUpdate(friendRequest.recipient, {
            $pull: { "social.friendRequests.received": requestId }
        });

        logger.info(`User ${userId} successfully responded to friend request ${requestId} with action ${action}`);
        res.json({
            message: `Friend request ${action}ed successfully`,
            friendRequest: await friendRequest.populate(["requester", "recipient"], "name email")
        });

    } catch (error) {
        logger.error({ message: `Error responding to friend request ${req.body.requestId} by user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Get user's friends
export const getFriends = async (req, res) => {
    logger.info(`Getting friends for user ${req.user.id}`);
    try {
        const userId = req.user.id;

        const user = await UserQuiz.findById(userId)
            .populate("social.friends", "name email level xp lastSeen isOnline social.privacy")
            .select("social.friends");

        if (!user) {
            logger.warn(`User not found: ${userId} when getting friends`);
            return res.status(404).json({ message: "User not found" });
        }

        // Filter friends based on privacy settings
        const visibleFriends = (user.social?.friends || []).filter(friend => {
            const privacy = friend.social?.privacy;
            return !privacy || privacy.profileVisibility !== "private";
        });

        logger.info(`Successfully fetched ${visibleFriends.length} friends for user ${userId}`);
        res.json({
            friends: visibleFriends,
            totalFriends: visibleFriends.length
        });

    } catch (error) {
        logger.error({ message: `Error getting friends for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Get pending friend requests
export const getPendingRequests = async (req, res) => {
    logger.info(`Getting pending friend requests for user ${req.user.id}`);
    try {
        const userId = req.user.id;

        const sentRequests = await Friend.find({
            requester: userId,
            status: "pending"
        }).populate("recipient", "name email level xp");

        const receivedRequests = await Friend.find({
            recipient: userId,
            status: "pending"
        }).populate("requester", "name email level xp");

        logger.info(`Successfully fetched ${sentRequests.length} sent and ${receivedRequests.length} received pending friend requests for user ${userId}`);
        res.json({
            sent: sentRequests,
            received: receivedRequests
        });

    } catch (error) {
        logger.error({ message: `Error getting pending friend requests for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Remove friend
export const removeFriend = async (req, res) => {
    logger.info(`User ${req.user.id} attempting to remove friend ${req.params.friendId}`);
    try {
        const { friendId } = req.params;
        const userId = req.user.id;

        // Find the friendship record
        const friendship = await Friend.findOne({
            $or: [
                { requester: userId, recipient: friendId, status: "accepted" },
                { requester: friendId, recipient: userId, status: "accepted" }
            ]
        });

        if (!friendship) {
            logger.warn(`Friendship not found between user ${userId} and ${friendId}`);
            return res.status(404).json({ message: "Friendship not found" });
        }

        // Remove friendship record
        await Friend.findByIdAndDelete(friendship._id);

        // Remove from both users' friends lists
        await UserQuiz.findByIdAndUpdate(userId, {
            $pull: { "social.friends": friendId }
        });

        await UserQuiz.findByIdAndUpdate(friendId, {
            $pull: { "social.friends": userId }
        });

        logger.info(`User ${userId} successfully removed friend ${friendId}`);
        res.json({ message: "Friend removed successfully" });

    } catch (error) {
        logger.error({ message: `Error removing friend ${req.params.friendId} for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Search for users to add as friends
export const searchUsers = async (req, res) => {
    logger.info(`User ${req.user.id} searching for users with query "${req.query.query}"`);
    try {
        const { query } = req.query;
        const userId = req.user.id;

        if (!query || query.length < 2) {
            logger.warn(`User ${userId} made a search with an invalid query: "${query}"`);
            return res.status(400).json({ message: "Search query must be at least 2 characters" });
        }

        // Get current user's friends and pending requests
        const currentUser = await UserQuiz.findById(userId)
            .populate("social.friends", "_id")
            .populate("social.friendRequests.sent", "recipient")
            .populate("social.friendRequests.received", "requester");

        const friendIds = (currentUser.social?.friends || []).map(f => f._id.toString());
        const sentRequestIds = (currentUser.social?.friendRequests?.sent || [])
            .map(req => req.recipient.toString());
        const receivedRequestIds = (currentUser.social?.friendRequests?.received || [])
            .map(req => req.requester.toString());

        // Search for users
        const users = await UserQuiz.find({
            $and: [
                {
                    $or: [
                        { name: { $regex: query, $options: "i" } },
                        { email: { $regex: query, $options: "i" } }
                    ]
                },
                { _id: { $ne: userId } }, // Exclude current user
                { _id: { $nin: friendIds } }, // Exclude current friends
                { _id: { $nin: sentRequestIds } }, // Exclude users with pending sent requests
                { _id: { $nin: receivedRequestIds } }, // Exclude users with pending received requests
                { "social.privacy.profileVisibility": { $ne: "private" } } // Exclude private profiles
            ]
        })
        .select("name email level xp social.privacy")
        .limit(20);

        logger.info(`Found ${users.length} users for query "${query}"`);
        res.json({ users });

    } catch (error) {
        logger.error({ message: `Error searching users with query "${req.query.query}"`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Get friend's quiz progress (for comparison)
export const getFriendProgress = async (req, res) => {
    logger.info(`User ${req.user.id} getting progress for friend ${req.params.friendId}`);
    try {
        const { friendId } = req.params;
        const userId = req.user.id;

        // Check if they are friends
        const friendship = await Friend.findOne({
            $or: [
                { requester: userId, recipient: friendId, status: "accepted" },
                { requester: friendId, recipient: userId, status: "accepted" }
            ]
        });

        if (!friendship) {
            logger.warn(`User ${userId} not authorized to view progress of user ${friendId}`);
            return res.status(403).json({ message: "Not authorized to view this user's progress" });
        }

        const friend = await UserQuiz.findById(friendId)
            .select("name level xp badges totalXP loginStreak quizStreak social.privacy");

        if (!friend) {
            logger.warn(`Friend not found: ${friendId}`);
            return res.status(404).json({ message: "Friend not found" });
        }

        // Check privacy settings
        if (!friend.social?.privacy?.showProgressToFriends) {
            logger.warn(`User ${userId} attempted to view progress of user ${friendId} who has disabled progress sharing`);
            return res.status(403).json({ message: "This user has disabled progress sharing" });
        }

        logger.info(`Successfully fetched progress for friend ${friendId}`);
        res.json({
            friend: {
                name: friend.name,
                level: friend.level,
                xp: friend.xp,
                totalXP: friend.totalXP,
                badges: friend.badges,
                loginStreak: friend.loginStreak,
                quizStreak: friend.quizStreak
            }
        });

    } catch (error) {
        logger.error({ message: `Error getting friend progress for user ${req.user.id} and friend ${req.params.friendId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Block user
export const blockUser = async (req, res) => {
    logger.info(`User ${req.user.id} attempting to block user ${req.params.userId}`);
    try {
        const { userId: targetUserId } = req.params;
        const userId = req.user.id;

        if (userId === targetUserId) {
            logger.warn(`User ${userId} attempted to block themselves`);
            return res.status(400).json({ message: "Cannot block yourself" });
        }

        // Check if target user exists
        const targetUser = await UserQuiz.findById(targetUserId);
        if (!targetUser) {
            logger.warn(`User not found: ${targetUserId} when blocking`);
            return res.status(404).json({ message: "User not found" });
        }

        // Find existing relationship
        let relationship = await Friend.findOne({
            $or: [
                { requester: userId, recipient: targetUserId },
                { requester: targetUserId, recipient: userId }
            ]
        });

        if (relationship) {
            // Update existing relationship to blocked
            relationship.status = "blocked";
            relationship.responseDate = new Date();

            // Ensure the blocker is always the requester for blocked relationships
            if (relationship.recipient.toString() === userId) {
                // Swap requester and recipient
                const temp = relationship.requester;
                relationship.requester = relationship.recipient;
                relationship.recipient = temp;
            }

            await relationship.save();

            // Remove from friends list if they were friends
            await UserQuiz.findByIdAndUpdate(userId, {
                $pull: { "social.friends": targetUserId }
            });
            await UserQuiz.findByIdAndUpdate(targetUserId, {
                $pull: { "social.friends": userId }
            });

        } else {
            // Create new blocked relationship
            relationship = new Friend({
                requester: userId,
                recipient: targetUserId,
                status: "blocked"
            });
            await relationship.save();
        }

        // Remove from friend requests if any
        await UserQuiz.findByIdAndUpdate(userId, {
            $pull: {
                "social.friendRequests.sent": { $in: [relationship._id] },
                "social.friendRequests.received": { $in: [relationship._id] }
            }
        });
        await UserQuiz.findByIdAndUpdate(targetUserId, {
            $pull: {
                "social.friendRequests.sent": { $in: [relationship._id] },
                "social.friendRequests.received": { $in: [relationship._id] }
            }
        });

        logger.info(`User ${userId} successfully blocked user ${targetUserId}`);
        res.json({
            message: "User blocked successfully",
            relationship: await relationship.populate("recipient", "name email")
        });

    } catch (error) {
        logger.error({ message: `Error blocking user ${req.params.userId} by user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Unblock user
export const unblockUser = async (req, res) => {
    logger.info(`User ${req.user.id} attempting to unblock user ${req.params.userId}`);
    try {
        const { userId: targetUserId } = req.params;
        const userId = req.user.id;

        // Find blocked relationship where current user is the blocker
        const relationship = await Friend.findOne({
            requester: userId,
            recipient: targetUserId,
            status: "blocked"
        });

        if (!relationship) {
            logger.warn(`No blocked relationship found for user ${userId} and target user ${targetUserId}`);
            return res.status(404).json({ message: "No blocked relationship found" });
        }

        // Remove the blocked relationship
        await Friend.findByIdAndDelete(relationship._id);

        logger.info(`User ${userId} successfully unblocked user ${targetUserId}`);
        res.json({ message: "User unblocked successfully" });

    } catch (error) {
        logger.error({ message: `Error unblocking user ${req.params.userId} by user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};

// Get blocked users
export const getBlockedUsers = async (req, res) => {
    logger.info(`Getting blocked users for user ${req.user.id}`);
    try {
        const userId = req.user.id;

        const blockedRelationships = await Friend.find({
            requester: userId,
            status: "blocked"
        }).populate("recipient", "name email level");

        const blockedUsers = blockedRelationships.map(rel => ({
            ...rel.recipient.toObject(),
            blockedDate: rel.responseDate || rel.createdAt
        }));

        logger.info(`Successfully fetched ${blockedUsers.length} blocked users for user ${userId}`);
        res.json({
            blockedUsers,
            totalBlocked: blockedUsers.length
        });

    } catch (error) {
        logger.error({ message: `Error getting blocked users for user ${req.user.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error" });
    }
};
