import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./Home.css";
import "../App.css";
import axios from "../utils/axios";
import ThemeSelector from "../components/ThemeSelector";
import AdvancedThemeSelector from "../components/AdvancedThemeSelector";
import { ThemeContext } from "../context/ThemeContext";
import Loading from "../components/Loading";

const Home = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [badges, setBadges] = useState([]);
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchUserData = useCallback(async () => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (!storedUser) {
            navigate("/login");
            return;
        } else {
            setUser(storedUser);
        }
        try {
            // Use the /me endpoint for consistency
            const res = await axios.get(`/api/users/me`);
            const data = res.data;
            setBadges(data.badges || []);
            setXp(Math.round(data.xp) || 0);
            setLevel(data.level || 1);
            // Update user state with fresh data from API and localStorage
            setUser(data);
            localStorage.setItem("user", JSON.stringify(data));
        } catch (error) {
            console.error("Error fetching user data:", error);
            // Fallback to /:id endpoint if /me fails
            try {
                const res = await axios.get(`/api/users/${storedUser._id}`);
                const data = res.data;
                setBadges(data.badges || []);
                setXp(Math.round(data.xp) || 0);
                setLevel(data.level || 1);
                setUser(data);
                localStorage.setItem("user", JSON.stringify(data));
            } catch (fallbackError) {
                console.error("Error with fallback user data fetch:", fallbackError);
                setError("Error fetching user data. Try again later.");
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchUserData();
    }, [navigate, fetchUserData]);

    const XPBar = ({ xp, level }) => {
        const xpForNext = level * 100;
        const percent = Math.min(100, Math.round((xp / xpForNext) * 100));
        return (
        <motion.div
            className="xp-bar-container"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
        >
            <motion.div
                className="xp-bar-fill"
                style={{ width: `${percent}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
            />
            <span className="xp-label">Level {level}: {xp}/{xpForNext} XP</span>
        </motion.div>
        );
    };

    if (loading) return <Loading fullScreen={true} />;

    if (error) return (
        <motion.div
            className="home-container"
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
            </motion.div>
        </motion.div>
    );

    return (
        <motion.div
            className="home-container"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
        >
            {/* Hero Section */}
            <motion.div
                className="hero-section"
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
            >
                <motion.h1 className="welcome-title">
                    Welcome back, <span className="user-name">{user?.name?.split(' ')[0] || 'Champion'}!</span>
                </motion.h1>
                <motion.p
                    className="welcome-subtitle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                >
                    Ready to level up your knowledge?
                </motion.p>
            </motion.div>

            {/* XP Progress Bar */}
            <XPBar xp={xp} level={level} />

            {/* Stats Dashboard */}
            <motion.div
                className="stats-dashboard"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
            >
                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                >
                    <div className="stat-icon level-icon">🎯</div>
                    <div className="stat-content">
                        <h3>Level</h3>
                        <div className="stat-value">{level}</div>
                        <p className="stat-description">Keep learning to level up!</p>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                >
                    <div className="stat-icon streak-icon">🔥</div>
                    <div className="stat-content">
                        <h3>Login Streak</h3>
                        <div className="stat-value">{user?.loginStreak || 0}</div>
                        <p className="stat-description">Days in a row</p>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                >
                    <div className="stat-icon quiz-streak-icon">⚡</div>
                    <div className="stat-content">
                        <h3>Quiz Streak</h3>
                        <div className="stat-value">{user?.quizStreak || 0}</div>
                        <p className="stat-description">Consecutive quiz days</p>
                    </div>
                </motion.div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
                className="quick-actions"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
            >
                <h2 className="section-title">Quick Actions</h2>
                <div className="action-buttons">
                    <motion.button
                        className="action-btn primary-action"
                        onClick={() => navigate("/user/test")}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.0, duration: 0.5 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span className="btn-icon">🚀</span>
                        <span className="btn-text">Start Quiz</span>
                    </motion.button>

                    {(user?.role === "premium") && (
                        <motion.button
                            className="action-btn secondary-action"
                            onClick={() => navigate("/intelligence-dashboard")}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.1, duration: 0.5 }}
                            whileHover={{ scale: 1.05, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span className="btn-icon">🧠</span>
                            <span className="btn-text">Intelligence Dashboard</span>
                        </motion.button>
                    )}

                    <motion.button
                        className="action-btn tertiary-action"
                        onClick={() => navigate("/enhanced-dashboard")}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.2, duration: 0.5 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span className="btn-icon">📊</span>
                        <span className="btn-text">View Analytics</span>
                    </motion.button>
                </div>
            </motion.div>

            {/* Achievements Section */}
            {badges.length > 0 && (
                <motion.div
                    className="achievements-section"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3, duration: 0.6 }}
                >
                    <h2 className="section-title">Your Achievements</h2>
                    <div className="badges-container">
                        {badges.map((badge, i) => (
                            <motion.div
                                key={i}
                                className="badge-card"
                                initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                transition={{ delay: 1.4 + (i * 0.1), duration: 0.6 }}
                                whileHover={{ scale: 1.05, rotateY: 5, y: -5 }}
                            >
                                <div className="badge-icon">🏅</div>
                                <h3 className="badge-title">{badge}</h3>
                                <p className="badge-description">Keep up the great work!</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Theme Selection */}
            <motion.div
                className="theme-section"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.6 }}
            >
                <h2 className="section-title">Customize Your Experience</h2>
                <div className="theme-selectors">
                    <ThemeSelector />
                    <AdvancedThemeSelector
                        currentTheme={document.documentElement.getAttribute('data-theme') || 'Default'}
                        onThemeChange={(themeName) => {
                            document.documentElement.setAttribute('data-theme', themeName);
                            localStorage.setItem('theme', themeName);
                        }}
                    />
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Home;
