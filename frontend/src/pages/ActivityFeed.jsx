import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import "../App.css";
import "./ActivityFeed.css";
import Loading from "../components/Loading";
import { useNotification } from "../hooks/useNotification";
import NotificationModal from "../components/NotificationModal";
import { addToQuizHistory } from "../utils/quizHistory";

const ActivityFeed = () => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState({});
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState("all");
    const [dateRange, setDateRange] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const { notification, showError, hideNotification } = useNotification();

    const fetchActivities = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: 30
            };

            if (typeFilter !== "all") {
                params.type = typeFilter;
            }

            if (dateRange !== "all") {
                const now = new Date();
                if (dateRange === "today") {
                    params.startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                } else if (dateRange === "week") {
                    const weekStart = new Date(now.setDate(now.getDate() - 7));
                    params.startDate = weekStart.toISOString();
                } else if (dateRange === "month") {
                    const monthStart = new Date(now.setMonth(now.getMonth() - 1));
                    params.startDate = monthStart.toISOString();
                }
            }

            const response = await axios.get("/api/activity", { params });
            const newActivities = response.data.activities || {};

            if (currentPage === 1) {
                setActivities(newActivities);
            } else {
                // Merge with existing activities
                const merged = { ...activities };
                Object.keys(newActivities).forEach(date => {
                    if (merged[date]) {
                        merged[date] = [...merged[date], ...newActivities[date]];
                    } else {
                        merged[date] = newActivities[date];
                    }
                });
                setActivities(merged);
            }

            const totalActivities = Object.values(newActivities).reduce((sum, arr) => sum + arr.length, 0);
            setHasMore(totalActivities === 30);
        } catch (error) {
            console.error("Error fetching activities:", error);
            showError("Failed to load activities");
        } finally {
            setLoading(false);
        }
    }, [typeFilter, dateRange, currentPage, activities, showError]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await axios.get("/api/activity/stats");
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    }, []);

    useEffect(() => {
        fetchActivities();
    }, [typeFilter, dateRange]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        if (currentPage > 1) {
            fetchActivities();
        }
    }, [currentPage, fetchActivities]);

    const handleActivityClick = (activity) => {
        switch (activity.type) {
            case "quiz_completed":
                if (activity.data?.quizId) {
                    addToQuizHistory({ _id: activity.data.quizId });
                    navigate(`/user/test/${activity.data.quizId}`);
                }
                break;
            case "achievement_earned":
                navigate("/achievements");
                break;
            case "challenge_completed":
                navigate("/gamification");
                break;
            case "friend_added":
                navigate("/friends");
                break;
            default:
                break;
        }
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case "quiz_completed":
                return "✅";
            case "achievement_earned":
                return "🏆";
            case "challenge_completed":
                return "🎯";
            case "friend_added":
                return "👥";
            case "level_up":
                return "⬆️";
            case "bookmark_added":
                return "⭐";
            case "report_viewed":
                return "📄";
            default:
                return "📝";
        }
    };

    const getActivityTitle = (activity) => {
        switch (activity.type) {
            case "quiz_completed":
                return `Completed quiz: ${activity.data?.quizName || "Quiz"}`;
            case "achievement_earned":
                return `Earned achievement: ${activity.data?.achievementName || "Achievement"}`;
            case "challenge_completed":
                return `Completed challenge: ${activity.data?.challengeName || "Challenge"}`;
            case "friend_added":
                return `Added friend: ${activity.data?.friendName || "Friend"}`;
            case "level_up":
                return `Leveled up to level ${activity.data?.level || "?"}`;
            case "bookmark_added":
                return `Bookmarked: ${activity.data?.quizName || "Quiz"}`;
            case "report_viewed":
                return `Viewed report: ${activity.data?.quizName || "Quiz"}`;
            default:
                return "Activity";
        }
    };

    const sortedDates = useMemo(() => {
        return Object.keys(activities).sort((a, b) => {
            return new Date(b) - new Date(a);
        });
    }, [activities]);

    const loadMore = () => {
        if (!loading && hasMore) {
            setCurrentPage(prev => prev + 1);
        }
    };

    if (loading && Object.keys(activities).length === 0) return <Loading fullScreen={true} />;

    return (
        <motion.div
            className="activity-feed-page"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="activity-header">
                <h1 className="activity-title">Activity Feed</h1>
                {stats && (
                    <div className="activity-stats">
                        <div className="stat-card">
                            <div className="stat-value">{stats.today || 0}</div>
                            <div className="stat-label">Today</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.thisWeek || 0}</div>
                            <div className="stat-label">This Week</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.thisMonth || 0}</div>
                            <div className="stat-label">This Month</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.total || 0}</div>
                            <div className="stat-label">Total</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="activity-controls">
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${typeFilter === "all" ? "active" : ""}`}
                        onClick={() => {
                            setTypeFilter("all");
                            setCurrentPage(1);
                        }}
                    >
                        All
                    </button>
                    <button
                        className={`filter-tab ${typeFilter === "quiz_completed" ? "active" : ""}`}
                        onClick={() => {
                            setTypeFilter("quiz_completed");
                            setCurrentPage(1);
                        }}
                    >
                        Quizzes
                    </button>
                    <button
                        className={`filter-tab ${typeFilter === "achievement_earned" ? "active" : ""}`}
                        onClick={() => {
                            setTypeFilter("achievement_earned");
                            setCurrentPage(1);
                        }}
                    >
                        Achievements
                    </button>
                    <button
                        className={`filter-tab ${typeFilter === "challenge_completed" ? "active" : ""}`}
                        onClick={() => {
                            setTypeFilter("challenge_completed");
                            setCurrentPage(1);
                        }}
                    >
                        Challenges
                    </button>
                    <button
                        className={`filter-tab ${typeFilter === "friend_added" ? "active" : ""}`}
                        onClick={() => {
                            setTypeFilter("friend_added");
                            setCurrentPage(1);
                        }}
                    >
                        Social
                    </button>
                </div>

                <select
                    className="date-range-select"
                    value={dateRange}
                    onChange={(e) => {
                        setDateRange(e.target.value);
                        setCurrentPage(1);
                    }}
                >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                </select>
            </div>

            <div className="activity-timeline">
                {sortedDates.length === 0 ? (
                    <div className="activity-empty">
                        <div className="empty-icon">📝</div>
                        <h2>No activities yet</h2>
                        <p>Start taking quizzes and earning achievements to see your activity feed!</p>
                    </div>
                ) : (
                    sortedDates.map((date, dateIndex) => (
                        <div key={date} className="activity-date-group">
                            <div className="date-header">
                                <div className="date-line"></div>
                                <h2 className="date-title">{date}</h2>
                                <div className="date-line"></div>
                            </div>
                            <div className="activities-list">
                                {activities[date].map((activity, activityIndex) => (
                                    <motion.div
                                        key={activity._id}
                                        className="activity-item"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: (dateIndex * 0.1) + (activityIndex * 0.05) }}
                                        onClick={() => handleActivityClick(activity)}
                                    >
                                        <div className="activity-icon">
                                            {getActivityIcon(activity.type)}
                                        </div>
                                        <div className="activity-content">
                                            <div className="activity-title-text">
                                                {getActivityTitle(activity)}
                                            </div>
                                            <div className="activity-time">
                                                {new Date(activity.createdAt).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {hasMore && (
                <div className="load-more-container">
                    <button
                        className="load-more-btn"
                        onClick={loadMore}
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "Load More"}
                    </button>
                </div>
            )}

            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
            />
        </motion.div>
    );
};

export default ActivityFeed;
