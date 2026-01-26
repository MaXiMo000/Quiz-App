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
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { getRecentQuizzes } from "../utils/quizHistory";

const Home = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [badges, setBadges] = useState([]);
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [recentQuizzes, setRecentQuizzes] = useState([]);
    const [recentlyViewedQuizzes, setRecentlyViewedQuizzes] = useState([]);
    const [recentReports, setRecentReports] = useState([]);
    const [stats, setStats] = useState({
        totalQuizzes: 0,
        completedQuizzes: 0,
        averageScore: 0,
        totalXP: 0
    });

    // Notification system
    const { notification, showError, hideNotification } = useNotification();

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            // Clear any active states if needed
        },
    }, []);

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

            // Fetch recent quizzes
            let quizzes = [];
            try {
                const quizzesRes = await axios.get(`/api/quizzes`);
                quizzes = quizzesRes.data || [];
                setRecentQuizzes(quizzes.slice(0, 6)); // Show 6 most recent

                // Load recently viewed quizzes from history
                const history = getRecentQuizzes(6);
                if (history.length > 0) {
                    // Match history items with actual quiz data
                    const viewedQuizzes = history
                        .map(historyItem => {
                            const quiz = quizzes.find(q => q._id === historyItem.quizId);
                            return quiz ? { ...quiz, viewedAt: historyItem.viewedAt } : null;
                        })
                        .filter(Boolean);
                    setRecentlyViewedQuizzes(viewedQuizzes);
                }
            } catch (quizError) {
                console.error("Error fetching quizzes:", quizError);
            }

            // Fetch recent reports for stats
            try {
                const reportsRes = await axios.get(`/api/reports/user?username=${data.name}`);
                const reports = reportsRes.data || [];
                setRecentReports(reports.slice(0, 5)); // Show 5 most recent

                // Calculate stats
                const completed = reports.length;
                const avgScore = completed > 0
                    ? (reports.reduce((sum, r) => sum + r.score, 0) / completed).toFixed(1)
                    : 0;

                setStats({
                    totalQuizzes: quizzes.length,
                    completedQuizzes: completed,
                    averageScore: parseFloat(avgScore),
                    totalXP: Math.round(data.xp) || 0
                });
            } catch (reportError) {
                console.error("Error fetching reports:", reportError);
            }
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
                const errorMsg = "Error fetching user data. Try again later.";
                setError(errorMsg);
                showError(errorMsg);
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
                >
                    <div className="stat-icon quiz-streak-icon">⚡</div>
                    <div className="stat-content">
                        <h3>Quiz Streak</h3>
                        <div className="stat-value">{user?.quizStreak || 0}</div>
                        <p className="stat-description">Consecutive quiz days</p>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                >
                    <div className="stat-icon completed-icon">📊</div>
                    <div className="stat-content">
                        <h3>Completed</h3>
                        <div className="stat-value">{stats.completedQuizzes}</div>
                        <p className="stat-description">Quizzes finished</p>
                    </div>
                </motion.div>

                {stats.averageScore > 0 && (
                    <motion.div
                        className="stat-card"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.0, duration: 0.5 }}
                    >
                        <div className="stat-icon avg-icon">📈</div>
                        <div className="stat-content">
                            <h3>Avg Score</h3>
                            <div className="stat-value">{stats.averageScore}</div>
                            <p className="stat-description">Your average</p>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* Recent Quizzes Section */}
            {recentQuizzes.filter(quiz => quiz && quiz._id && quiz.title && quiz.title.trim() !== '').length > 0 && (
                <motion.div
                    className="recent-quizzes-section"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1, duration: 0.6 }}
                >
                    <div className="section-header">
                        <h2 className="section-title">📚 Available Quizzes</h2>
                        {/* <button
                            className="view-all-btn"
                            onClick={() => navigate("/user/test")}
                        >
                            View All →
                        </button> */}
                    </div>
                    <div className="quizzes-grid">
                        {recentQuizzes
                            .filter(quiz => quiz && quiz._id && quiz.title && quiz.title.trim() !== '')
                            .slice(0, 6)
                            .map((quiz, index) => (
                            <motion.div
                                key={quiz._id}
                                className="quiz-preview-card"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 1.2 + (index * 0.1), duration: 0.5 }}
                                whileHover={{ scale: 1.05, y: -5 }}
                                onClick={() => {
                                    const element = document.documentElement;
                                    if (element.requestFullscreen) {
                                        element.requestFullscreen().then(() => {
                                            navigate(`/user/test/${quiz._id}`);
                                        }).catch(() => {
                                            navigate(`/user/test/${quiz._id}`);
                                        });
                                    } else {
                                        navigate(`/user/test/${quiz._id}`);
                                    }
                                }}
                            >
                                <div className="quiz-preview-icon">🎯</div>
                                <h3 className="quiz-preview-title">{quiz.title}</h3>
                                <div className="quiz-preview-meta">
                                    <span>⏱️ {quiz.duration || 0} min</span>
                                    <span>📝 {quiz.questions?.length || 0} Qs</span>
                                </div>
                                <div className="quiz-preview-category">{quiz.category || "General"}</div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Recently Viewed Quizzes Section */}
            {recentlyViewedQuizzes.length > 0 && (
                <motion.div
                    className="recently-viewed-section"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.25, duration: 0.6 }}
                >
                    <div className="section-header">
                        <h2 className="section-title">🕒 Recently Viewed</h2>
                        <button
                            className="view-all-btn"
                            onClick={() => navigate("/user/test")}
                            aria-label="View all quizzes"
                        >
                            View All →
                        </button>
                    </div>
                    <div className="quizzes-grid">
                        {recentlyViewedQuizzes.map((quiz, index) => (
                            <motion.div
                                key={quiz._id}
                                className="quiz-preview-card recently-viewed"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 1.3 + (index * 0.1), duration: 0.5 }}
                                whileHover={{ scale: 1.05, y: -5 }}
                                onClick={() => {
                                    const element = document.documentElement;
                                    if (element.requestFullscreen) {
                                        element.requestFullscreen().then(() => {
                                            navigate(`/user/test/${quiz._id}`);
                                        }).catch(() => {
                                            navigate(`/user/test/${quiz._id}`);
                                        });
                                    } else {
                                        navigate(`/user/test/${quiz._id}`);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        navigate(`/user/test/${quiz._id}`);
                                    }
                                }}
                                aria-label={`Continue quiz: ${quiz.title}`}
                            >
                                <div className="quiz-preview-icon">🕒</div>
                                <h3 className="quiz-preview-title">{quiz.title}</h3>
                                <div className="quiz-preview-meta">
                                    <span>⏱️ {quiz.duration || 0} min</span>
                                    <span>📝 {quiz.questions?.length || 0} Qs</span>
                                </div>
                                <div className="quiz-preview-category">{quiz.category || "General"}</div>
                                {quiz.viewedAt && (
                                    <div className="viewed-time">
                                        Viewed {new Date(quiz.viewedAt).toLocaleDateString()}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Recent Activity Section */}
            {recentReports.filter(report =>
                report &&
                report._id &&
                report.quizName &&
                report.quizName.trim() !== '' &&
                typeof report.score === 'number' &&
                typeof report.total === 'number' &&
                report.total > 0
            ).length > 0 && (
                <motion.div
                    className="recent-activity-section"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.4, duration: 0.6 }}
                >
                    <div className="section-header">
                        <h2 className="section-title">📋 Recent Activity</h2>
                        {/* <button
                            className="view-all-btn"
                            onClick={() => navigate("/user/report")}
                        >
                            View All →
                        </button> */}
                    </div>
                    <div className="activity-list">
                        {recentReports
                            .filter(report =>
                                report &&
                                report._id &&
                                report.quizName &&
                                report.quizName.trim() !== '' &&
                                typeof report.score === 'number' &&
                                typeof report.total === 'number' &&
                                report.total > 0
                            )
                            .map((report, index) => {
                            const percentage = Math.round((report.score / report.total) * 100);
                            const passed = report.score >= report.total * 0.5;
                            return (
                                <motion.div
                                    key={report._id || index}
                                    className="activity-item"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.4 + (index * 0.1), duration: 0.5 }}
                                    onClick={() => navigate(`/report/${report._id}`)}
                                >
                                    <div className="activity-icon">{passed ? "✅" : "❌"}</div>
                                    <div className="activity-content">
                                        <h4 className="activity-title">{report.quizName}</h4>
                                        <div className="activity-meta">
                                            <span className="activity-score">{report.score.toFixed(1)}/{report.total}</span>
                                            <span className={`activity-percentage ${passed ? 'passed' : 'failed'}`}>
                                                {percentage}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="activity-arrow">→</div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

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
                        aria-label="Start a new quiz"
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
                            aria-label="Open Intelligence Dashboard for AI-powered insights"
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
                        aria-label="Open Enhanced Dashboard with analytics"
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

            {/* Notification Modal */}
            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
                autoClose={notification.autoClose}
            />
        </motion.div>
    );
};

export default Home;
