import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios";
import { useNotification } from "../hooks/useNotification";
import "./NotificationCenter.css";
import { markQuizFullscreenOnLoad } from "../utils/quizFullscreen.js";

const NotificationCenter = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const panelRef = useRef(null);
    const navigate = useNavigate();
    const { showSuccess, showError } = useNotification();

    const fetchNotifications = useCallback(async (page = 1, append = false) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 20
            };

            if (activeTab !== "all") {
                params.type = activeTab;
            }

            if (activeTab === "unread") {
                params.read = "false";
            }

            const response = await axios.get("/api/notifications", { params });
            const newNotifications = response.data.notifications || [];

            if (append) {
                setNotifications(prev => [...prev, ...newNotifications]);
            } else {
                setNotifications(newNotifications);
            }

            setHasMore(newNotifications.length === 20);
        } catch (error) {
            console.error("Error fetching notifications:", error);
            showError("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    }, [activeTab, showError]);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const response = await axios.get("/api/notifications/unread-count");
            setUnreadCount(response.data.count || 0);
        } catch (error) {
            console.error("Error fetching unread count:", error);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications(1, false);
        }
    }, [isOpen, activeTab, fetchNotifications]);

    useEffect(() => {
        // Poll for unread count every 30 seconds
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isOpen]);

    const handleMarkAsRead = async (notificationId) => {
        try {
            await axios.put(`/api/notifications/${notificationId}/read`);
            setNotifications(prev =>
                prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking as read:", error);
            showError("Failed to mark as read");
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await axios.put("/api/notifications/read-all");
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
            showSuccess("All notifications marked as read");
        } catch (error) {
            console.error("Error marking all as read:", error);
            showError("Failed to mark all as read");
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            await axios.delete(`/api/notifications/${notificationId}`);
            setNotifications(prev => prev.filter(n => n._id !== notificationId));
            showSuccess("Notification deleted");
        } catch (error) {
            console.error("Error deleting notification:", error);
            showError("Failed to delete notification");
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            handleMarkAsRead(notification._id);
        }

        // Navigate based on notification type
        if (notification.data?.quizId) {
            markQuizFullscreenOnLoad();
            navigate(`/user/test/${notification.data.quizId}`);
        } else if (notification.data?.reportId) {
            navigate(`/report/${notification.data.reportId}`);
        } else if (notification.type === "friend_request" && notification.data?.userId) {
            navigate("/friends");
        } else if (notification.type === "challenge" && notification.data?.challengeId) {
            navigate("/gamification");
        }
        setIsOpen(false);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            fetchNotifications(nextPage, true);
        }
    };

    const tabs = [
        { id: "all", label: "All", icon: "📋" },
        { id: "unread", label: "Unread", icon: "📬" },
        { id: "achievement", label: "Achievements", icon: "🏆" },
        { id: "challenge", label: "Challenges", icon: "🎯" },
        { id: "friend_request", label: "Social", icon: "👥" }
    ];

    const getNotificationIcon = (type) => {
        switch (type) {
            case "achievement":
                return "🏆";
            case "challenge":
                return "🎯";
            case "friend_request":
                return "👥";
            case "quiz_completed":
                return "✅";
            case "level_up":
                return "⬆️";
            default:
                return "🔔";
        }
    };

    return (
        <>
            <button
                className="notification-bell"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notifications"
            >
                🔔
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            className="notification-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            ref={panelRef}
                            className="notification-panel"
                            initial={{ x: 400 }}
                            animate={{ x: 0 }}
                            exit={{ x: 400 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        >
                            <div className="notification-header">
                                <h2>Notifications</h2>
                                <div className="notification-header-actions">
                                    {unreadCount > 0 && (
                                        <button
                                            className="mark-all-read-btn"
                                            onClick={handleMarkAllAsRead}
                                        >
                                            Mark all as read
                                        </button>
                                    )}
                                    <button
                                        className="close-btn"
                                        onClick={() => setIsOpen(false)}
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            <div className="notification-tabs hub-style-tabs" role="tablist" aria-label="Filter notifications">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={activeTab === tab.id}
                                        className={`notification-tab hub-style-tab ${activeTab === tab.id ? "active" : ""}`}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <span className="notification-tab-icon" aria-hidden>{tab.icon}</span>
                                        <span className="notification-tab-label">{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="notification-list">
                                {loading && notifications.length === 0 ? (
                                    <div className="notification-loading">Loading...</div>
                                ) : notifications.length === 0 ? (
                                    <div className="notification-empty">
                                        <div className="empty-icon">🔔</div>
                                        <p>No notifications</p>
                                    </div>
                                ) : (
                                    <>
                                        {notifications.map((notification) => (
                                            <motion.div
                                                key={notification._id}
                                                className={`notification-item ${notification.read ? "read" : "unread"}`}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                            >
                                                <div
                                                    className="notification-item-body"
                                                    onClick={() => handleNotificationClick(notification)}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            handleNotificationClick(notification);
                                                        }
                                                    }}
                                                >
                                                    <div className="notification-icon">
                                                        {getNotificationIcon(notification.type)}
                                                    </div>
                                                    <div className="notification-content">
                                                        <div className="notification-title">{notification.title}</div>
                                                        <div className="notification-message">{notification.message}</div>
                                                        <div className="notification-time">
                                                            {new Date(notification.createdAt).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="notification-item-footer">
                                                    {!notification.read && (
                                                        <button
                                                            type="button"
                                                            className="notification-footer-btn notification-footer-btn-read"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMarkAsRead(notification._id);
                                                            }}
                                                        >
                                                            <span className="notification-footer-btn-icon" aria-hidden>✓</span>
                                                            Mark read
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="notification-footer-btn notification-footer-btn-remove"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(notification._id);
                                                        }}
                                                    >
                                                        <span className="notification-footer-btn-icon" aria-hidden>×</span>
                                                        Remove
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                        {hasMore && (
                                            <button
                                                className="load-more-btn"
                                                onClick={loadMore}
                                                disabled={loading}
                                            >
                                                {loading ? "Loading..." : "Load More"}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default NotificationCenter;
