import Friend from "../models/Friend.js";
import UserQuiz from "../models/User.js";
import mongoose from "mongoose";

// Send friend request
export const sendFriendRequest = async (req, res) => {
    try {
        const { recipientId } = req.body;
        const requesterId = req.user.id;

        // Validation
        if (!recipientId) {
            return res.status(400).json({ message: "Recipient ID is required" });
        }

        if (requesterId === recipientId) {
            return res.status(400).json({ message: "Cannot send friend request to yourself" });
        }

        // Check if recipient exists
        const recipient = await UserQuiz.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check privacy settings
        if (!recipient.social?.privacy?.allowFriendRequests) {
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
            if (existingFriend.status === 'accepted') {
                return res.status(400).json({ message: "You are already friends" });
            } else if (existingFriend.status === 'pending') {
                return res.status(400).json({ message: "Friend request already sent" });
            } else if (existingFriend.status === 'blocked') {
                return res.status(403).json({ message: "Cannot send friend request" });
            }
        }

        // Create friend request
        const friendRequest = new Friend({
            requester: requesterId,
            recipient: recipientId,
            status: 'pending'
        });

        await friendRequest.save();

        // Update users' friend request arrays
        await UserQuiz.findByIdAndUpdate(requesterId, {
            $push: { "social.friendRequests.sent": friendRequest._id }
        });

        await UserQuiz.findByIdAndUpdate(recipientId, {
            $push: { "social.friendRequests.received": friendRequest._id }
        });

        res.status(201).json({ 
            message: "Friend request sent successfully",
            friendRequest: await friendRequest.populate('recipient', 'name email')
        });

    } catch (error) {
        console.error("Error sending friend request:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Accept/decline friend request
export const respondToFriendRequest = async (req, res) => {
    try {
        const { requestId, action } = req.body; // action: 'accept' or 'decline'
        const userId = req.user.id;

        if (!['accept', 'decline'].includes(action)) {
            return res.status(400).json({ message: "Invalid action" });
        }

        const friendRequest = await Friend.findById(requestId);
        if (!friendRequest) {
            return res.status(404).json({ message: "Friend request not found" });
        }

        // Check if user is the recipient
        if (friendRequest.recipient.toString() !== userId) {
            return res.status(403).json({ message: "Not authorized to respond to this request" });
        }

        if (friendRequest.status !== 'pending') {
            return res.status(400).json({ message: "Friend request already responded to" });
        }

        // Update request status
        friendRequest.status = action === 'accept' ? 'accepted' : 'declined';
        friendRequest.responseDate = new Date();
        await friendRequest.save();

        if (action === 'accept') {
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

        res.json({ 
            message: `Friend request ${action}ed successfully`,
            friendRequest: await friendRequest.populate(['requester', 'recipient'], 'name email')
        });

    } catch (error) {
        console.error("Error responding to friend request:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get user's friends
export const getFriends = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await UserQuiz.findById(userId)
            .populate('social.friends', 'name email level xp lastSeen isOnline social.privacy')
            .select('social.friends');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Filter friends based on privacy settings
        const visibleFriends = (user.social?.friends || []).filter(friend => {
            const privacy = friend.social?.privacy;
            return !privacy || privacy.profileVisibility !== 'private';
        });

        res.json({
            friends: visibleFriends,
            totalFriends: visibleFriends.length
        });

    } catch (error) {
        console.error("Error getting friends:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get pending friend requests
export const getPendingRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const sentRequests = await Friend.find({
            requester: userId,
            status: 'pending'
        }).populate('recipient', 'name email level xp');

        const receivedRequests = await Friend.find({
            recipient: userId,
            status: 'pending'
        }).populate('requester', 'name email level xp');

        res.json({
            sent: sentRequests,
            received: receivedRequests
        });

    } catch (error) {
        console.error("Error getting pending requests:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Remove friend
export const removeFriend = async (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.user.id;

        // Find the friendship record
        const friendship = await Friend.findOne({
            $or: [
                { requester: userId, recipient: friendId, status: 'accepted' },
                { requester: friendId, recipient: userId, status: 'accepted' }
            ]
        });

        if (!friendship) {
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

        res.json({ message: "Friend removed successfully" });

    } catch (error) {
        console.error("Error removing friend:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Search for users to add as friends
export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const userId = req.user.id;

        if (!query || query.length < 2) {
            return res.status(400).json({ message: "Search query must be at least 2 characters" });
        }

        // Get current user's friends and pending requests
        const currentUser = await UserQuiz.findById(userId)
            .populate('social.friends', '_id')
            .populate('social.friendRequests.sent', 'recipient')
            .populate('social.friendRequests.received', 'requester');

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
                        { name: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } }
                    ]
                },
                { _id: { $ne: userId } }, // Exclude current user
                { _id: { $nin: friendIds } }, // Exclude current friends
                { _id: { $nin: sentRequestIds } }, // Exclude users with pending sent requests
                { _id: { $nin: receivedRequestIds } }, // Exclude users with pending received requests
                { "social.privacy.profileVisibility": { $ne: "private" } } // Exclude private profiles
            ]
        })
        .select('name email level xp social.privacy')
        .limit(20);

        res.json({ users });

    } catch (error) {
        console.error("Error searching users:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get friend's quiz progress (for comparison)
export const getFriendProgress = async (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.user.id;

        // Check if they are friends
        const friendship = await Friend.findOne({
            $or: [
                { requester: userId, recipient: friendId, status: 'accepted' },
                { requester: friendId, recipient: userId, status: 'accepted' }
            ]
        });

        if (!friendship) {
            return res.status(403).json({ message: "Not authorized to view this user's progress" });
        }

        const friend = await UserQuiz.findById(friendId)
            .select('name level xp badges totalXP loginStreak quizStreak social.privacy');

        if (!friend) {
            return res.status(404).json({ message: "Friend not found" });
        }

        // Check privacy settings
        if (!friend.social?.privacy?.showProgressToFriends) {
            return res.status(403).json({ message: "This user has disabled progress sharing" });
        }

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
        console.error("Error getting friend progress:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Block user
export const blockUser = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const userId = req.user.id;

        if (userId === targetUserId) {
            return res.status(400).json({ message: "Cannot block yourself" });
        }

        // Check if target user exists
        const targetUser = await UserQuiz.findById(targetUserId);
        if (!targetUser) {
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
            relationship.status = 'blocked';
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
                status: 'blocked'
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

        res.json({ 
            message: "User blocked successfully",
            relationship: await relationship.populate('recipient', 'name email')
        });

    } catch (error) {
        console.error("Error blocking user:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Unblock user
export const unblockUser = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const userId = req.user.id;

        // Find blocked relationship where current user is the blocker
        const relationship = await Friend.findOne({
            requester: userId,
            recipient: targetUserId,
            status: 'blocked'
        });

        if (!relationship) {
            return res.status(404).json({ message: "No blocked relationship found" });
        }

        // Remove the blocked relationship
        await Friend.findByIdAndDelete(relationship._id);

        res.json({ message: "User unblocked successfully" });

    } catch (error) {
        console.error("Error unblocking user:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get blocked users
export const getBlockedUsers = async (req, res) => {
    try {
        const userId = req.user.id;

        const blockedRelationships = await Friend.find({
            requester: userId,
            status: 'blocked'
        }).populate('recipient', 'name email level');

        const blockedUsers = blockedRelationships.map(rel => ({
            ...rel.recipient.toObject(),
            blockedDate: rel.responseDate || rel.createdAt
        }));

        res.json({
            blockedUsers,
            totalBlocked: blockedUsers.length
        });

    } catch (error) {
        console.error("Error getting blocked users:", error);
        res.status(500).json({ message: "Server error" });
    }
};
