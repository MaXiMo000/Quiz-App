import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./IntelligenceDashboard.css";
import SmartRecommendations from "../components/SmartRecommendations";
import LearningAnalytics from "../components/LearningAnalytics";
import AdaptiveDifficulty from "../components/AdaptiveDifficulty";
import axios from "../utils/axios";

const IntelligenceDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const storedUser = JSON.parse(localStorage.getItem("user"));
                if (!storedUser) {
                    navigate("/login");
                    return;
                }

                // Check if user has premium access
                if (storedUser.role !== "premium" && storedUser.role !== "admin") {
                    navigate("/premium"); // Redirect to premium page
                    return;
                }

                // Fetch fresh user data
                const res = await axios.get(`/api/users/${storedUser._id}`);
                setUser(res.data);
            } catch (error) {
                console.error("Error fetching user data:", error);
                setError("Error loading dashboard. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [navigate]);

    if (loading) {
        return (
            <motion.div 
                className="intelligence-dashboard-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="loading-container">
                    <motion.div 
                        className="loading-spinner"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                        <div className="spinner-ring"></div>
                    </motion.div>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="loading-text"
                    >
                        Loading Intelligence Dashboard...
                    </motion.p>
                </div>
            </motion.div>
        );
    }

    if (error) {
        return (
            <motion.div 
                className="intelligence-dashboard-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <motion.div 
                    className="error-container"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <p className="error-message">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="retry-btn"
                    >
                        Try Again
                    </button>
                </motion.div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            className="intelligence-dashboard-container"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
        >
            {/* Header Section */}
            <motion.div 
                className="dashboard-header"
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
            >
                <div className="header-content">
                    <div className="header-text">
                        <h1>🧠 Intelligence Dashboard</h1>
                        <p>AI-powered insights and personalized learning recommendations</p>
                    </div>
                    <div className="premium-badge">
                        <span className="badge-icon">✨</span>
                        <span className="badge-text">Premium</span>
                    </div>
                </div>
                <div className="user-info">
                    <span className="welcome-text">Welcome back, {user?.name}!</span>
                    <div className="user-stats">
                        <span className="stat-item">Level {user?.level || 1}</span>
                        <span className="stat-divider">•</span>
                        <span className="stat-item">{user?.xp || 0} XP</span>
                    </div>
                </div>
            </motion.div>

            {/* Dashboard Content */}
            <div className="dashboard-content">
                {/* Smart Recommendations Section */}
                <motion.section
                    className="dashboard-section"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                >
                    <SmartRecommendations user={user} />
                </motion.section>

                {/* Adaptive Difficulty Section */}
                <motion.section
                    className="dashboard-section"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                >
                    <AdaptiveDifficulty user={user} />
                </motion.section>

                {/* Learning Analytics Section */}
                <motion.section
                    className="dashboard-section"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                >
                    <LearningAnalytics user={user} />
                </motion.section>
            </div>

            {/* Quick Actions */}
            <motion.div 
                className="quick-actions"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.6 }}
            >
                <h3>Quick Actions</h3>
                <div className="action-buttons">
                    <motion.button 
                        className="action-btn primary"
                        onClick={() => navigate("/user/test")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        🎯 Take Smart Quiz
                    </motion.button>
                    <motion.button 
                        className="action-btn secondary"
                        onClick={() => navigate("/user/report")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        📊 View Reports
                    </motion.button>
                    <motion.button 
                        className="action-btn secondary"
                        onClick={() => navigate("/premium/quizzes")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        🌟 Premium Quizzes
                    </motion.button>
                    <motion.button 
                        className="action-btn secondary"
                        onClick={() => navigate("/")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        🏠 Back to Home
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default IntelligenceDashboard;
