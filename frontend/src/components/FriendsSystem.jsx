import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../utils/axios';
import { useNotification } from '../hooks/useNotification';
import NotificationModal from './NotificationModal';
import './FriendsSystem.css';

const FriendsSystem = () => {
    const [activeTab, setActiveTab] = useState('friends');
    const [friends, setFriends] = useState([]);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [pendingRequests, setPendingRequests] = useState({ sent: [], received: [] });
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // Notification system
    const { notification, showSuccess, showError, hideNotification } = useNotification();

    useEffect(() => {
        fetchFriends();
        fetchPendingRequests();
        fetchBlockedUsers();
    }, []);

    const fetchFriends = async () => {
        try {
            const response = await axios.get('/api/social/friends');
            setFriends(response.data.friends);
        } catch (error) {
            console.error('Error fetching friends:', error);
            showError('Failed to load friends');
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const response = await axios.get('/api/social/friends/requests');
            setPendingRequests(response.data);
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
    };

    const fetchBlockedUsers = async () => {
        try {
            const response = await axios.get('/api/social/blocked');
            setBlockedUsers(response.data.blockedUsers);
        } catch (error) {
            console.error('Error fetching blocked users:', error);
        }
    };

    const searchUsers = useCallback(async () => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get(`/api/social/users/search?query=${searchQuery}`);
            setSearchResults(response.data.users);
        } catch (error) {
            console.error('Error searching users:', error);
            showError('Failed to search users');
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    const sendFriendRequest = async (recipientId) => {
        try {
            await axios.post('/api/social/friends/request', { recipientId });
            showSuccess('Friend request sent successfully!');
            setSearchResults(searchResults.filter(user => user._id !== recipientId));
            fetchPendingRequests();
        } catch (error) {
            console.error('Error sending friend request:', error);
            showError('Failed to send friend request');
        }
    };

    const respondToRequest = async (requestId, action) => {
        try {
            await axios.post('/api/social/friends/respond', { requestId, action });
            showSuccess(`Friend request ${action === 'accept' ? 'accepted' : 'declined'}!`);
            fetchPendingRequests();
            fetchFriends();
        } catch (error) {
            console.error('Error responding to request:', error);
            showError('Failed to respond to request');
        }
    };

    const removeFriend = async (friendId) => {
        try {
            await axios.delete(`/api/social/friends/${friendId}`);
            showSuccess('Friend removed successfully!');
            fetchFriends();
        } catch (error) {
            console.error('Error removing friend:', error);
            showError('Failed to remove friend');
        }
    };

    const blockUser = async (userId) => {
        try {
            await axios.post(`/api/social/users/${userId}/block`);
            showSuccess('User blocked successfully!');
            // Remove from friends and search results
            setFriends(friends.filter(friend => friend._id !== userId));
            setSearchResults(searchResults.filter(user => user._id !== userId));
            fetchBlockedUsers();
            fetchPendingRequests(); // Refresh requests as they might be affected
        } catch (error) {
            console.error('Error blocking user:', error);
            showError('Failed to block user');
        }
    };

    const unblockUser = async (userId) => {
        try {
            await axios.delete(`/api/social/users/${userId}/block`);
            showSuccess('User unblocked successfully!');
            fetchBlockedUsers();
        } catch (error) {
            console.error('Error unblocking user:', error);
            showError('Failed to unblock user');
        }
    };

    const FriendCard = ({ friend, showRemove = false, showBlock = false }) => (
        <motion.div
            className="friend-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            whileHover={{ scale: 1.02, boxShadow: "0 8px 25px rgba(0,0,0,0.15)" }}
        >
            <div className="friend-avatar">
                {friend.name?.charAt(0).toUpperCase()}
            </div>
            <div className="friend-info">
                <h4>{friend.name}</h4>
                <p className="friend-level">Level {Math.round(friend.level)} • {Math.round(friend.xp)} XP</p>
                <div className="friend-status">
                    <span className={`status-indicator ${friend.isOnline ? 'online' : 'offline'}`}></span>
                    {friend.isOnline ? 'Online' : 'Offline'}
                </div>
            </div>
            <div className="friend-actions">
                {showBlock && (
                    <button
                        className="block-user-btn"
                        onClick={() => blockUser(friend._id)}
                        title="Block User"
                    >
                        🚫
                    </button>
                )}
                {showRemove && (
                    <button
                        className="remove-friend-btn"
                        onClick={() => removeFriend(friend._id)}
                        title="Remove Friend"
                    >
                        ×
                    </button>
                )}
            </div>
        </motion.div>
    );

    const BlockedUserCard = ({ user }) => (
        <motion.div
            className="blocked-user-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            <h4>{user.name}</h4>
            <p>Level {user.level} • {user.xp} XP</p>
            <button
                className="unblock-user-btn"
                onClick={() => unblockUser(user._id)}
                title="Unblock User"
            >
                Unblock
            </button>
        </motion.div>
    );

    const RequestCard = ({ request, type }) => (
        <motion.div
            className="request-card"
            initial={{ opacity: 0, x: type === 'received' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: type === 'received' ? -20 : 20 }}
        >
            <div className="request-avatar">
                {(type === 'received' ? request.requester?.name : request.recipient?.name)?.charAt(0).toUpperCase()}
            </div>
            <div className="request-info">
                <h4>{type === 'received' ? request.requester?.name : request.recipient?.name}</h4>
                <p className="request-time">
                    {new Date(request.requestDate).toLocaleDateString()}
                </p>
            </div>
            {type === 'received' && (
                <div className="request-actions">
                    <button
                        className="accept-btn"
                        onClick={() => respondToRequest(request._id, 'accept')}
                    >
                        Accept
                    </button>
                    <button
                        className="decline-btn"
                        onClick={() => respondToRequest(request._id, 'decline')}
                    >
                        Decline
                    </button>
                </div>
            )}
            {type === 'sent' && (
                <div className="request-status">
                    <span className="pending-label">Pending</span>
                </div>
            )}
        </motion.div>
    );

    const SearchResultCard = ({ user }) => (
        <motion.div
            className="search-result-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
        >
            <div className="search-result-avatar">
                {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="search-result-info">
                <h4>{user.name}</h4>
                <p className="search-result-level">Level {Math.round(user.level)} • {Math.round(user.xp)} XP</p>
            </div>
            <div className="search-result-actions">
                <button
                    className="add-friend-btn"
                    onClick={() => sendFriendRequest(user._id)}
                >
                    Add Friend
                </button>
                <button
                    className="search-block-btn"
                    onClick={() => blockUser(user._id)}
                    title="Block User"
                >
                    🚫
                </button>
            </div>
        </motion.div>
    );

    useEffect(() => {
        const delayedSearch = setTimeout(() => {
            searchUsers();
        }, 500);

        return () => clearTimeout(delayedSearch);
    }, [searchQuery, searchUsers]);

    return (
        <div className="friends-system">
            <motion.div
                className="friends-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2>🤝 Friends & Social</h2>
                <p>Connect with other quiz enthusiasts and challenge your friends!</p>
            </motion.div>

            <div className="friends-tabs">
                {[
                    { id: 'friends', label: 'Friends', count: friends.length },
                    { id: 'requests', label: 'Requests', count: pendingRequests.received.length },
                    { id: 'blocked', label: 'Blocked', count: blockedUsers.length },
                    { id: 'search', label: 'Find Friends', count: null }
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                        {tab.count !== null && (
                            <span className="tab-count">{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'friends' && (
                    <motion.div
                        key="friends-tab"
                        className="tab-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <div className="friends-grid">
                            {friends.length > 0 ? (
                                friends.map(friend => (
                                    <FriendCard
                                        key={friend._id}
                                        friend={friend}
                                        showRemove={true}
                                        showBlock={true}
                                    />
                                ))
                            ) : (
                                <div className="empty-state">
                                    <p>No friends yet. Start by searching for users to add!</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'requests' && (
                    <motion.div
                        key="requests-tab"
                        className="tab-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <div className="requests-section">
                            <h3>Received Requests ({pendingRequests.received.length})</h3>
                            <div className="requests-list">
                                {pendingRequests.received.length > 0 ? (
                                    pendingRequests.received.map(request => (
                                        <RequestCard
                                            key={request._id}
                                            request={request}
                                            type="received"
                                        />
                                    ))
                                ) : (
                                    <p className="no-requests">No pending friend requests</p>
                                )}
                            </div>

                            <h3>Sent Requests ({pendingRequests.sent.length})</h3>
                            <div className="requests-list">
                                {pendingRequests.sent.length > 0 ? (
                                    pendingRequests.sent.map(request => (
                                        <RequestCard
                                            key={request._id}
                                            request={request}
                                            type="sent"
                                        />
                                    ))
                                ) : (
                                    <p className="no-requests">No sent requests</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'blocked' && (
                    <motion.div
                        key="blocked-tab"
                        className="tab-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <div className="blocked-users-section">
                            <h3>Blocked Users ({blockedUsers.length})</h3>
                            <div className="blocked-grid">
                                {blockedUsers.length > 0 ? (
                                    blockedUsers.map(user => (
                                        <BlockedUserCard
                                            key={user._id}
                                            user={user}
                                        />
                                    ))
                                ) : (
                                    <div className="no-blocked-users">
                                        <span className="emoji">🚫</span>
                                        <p>No blocked users</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'search' && (
                    <motion.div
                        key="search-tab"
                        className="tab-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <div className="search-section">
                            <div className="search-input-container">
                                <input
                                    type="text"
                                    placeholder="Search for users by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search-input"
                                />
                                {loading && <div className="search-loading">🔍</div>}
                            </div>

                            <div className="search-results">
                                {searchResults.length > 0 ? (
                                    searchResults.map(user => (
                                        <SearchResultCard
                                            key={user._id}
                                            user={user}
                                        />
                                    ))
                                ) : searchQuery.length >= 2 ? (
                                    <div className="no-results">
                                        <p>No users found matching "{searchQuery}"</p>
                                    </div>
                                ) : (
                                    <div className="search-hint">
                                        <p>Type at least 2 characters to search for users</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Notification Modal */}
            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
                autoClose={notification.autoClose}
            />
        </div>
    );
};

export default FriendsSystem;
