import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./Home.css";
import "../App.css";
import axios from "../utils/axios";
import ThemeSelector from "../components/ThemeSelector";
import AdvancedThemeSelector from "../components/AdvancedThemeSelector";
import { ThemeContext } from "../context/ThemeContext";

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

    if (loading) return (
        <motion.div 
            className="home-container"
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
                    Loading Your Dashboard...
                </motion.p>
            </div>
        </motion.div>
    );
    
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
        <motion.h1
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
        >
            Welcome, {user?.name}!
        </motion.h1>
        
        <XPBar xp={xp} level={level} />
        
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
        >
            <p className="home-description">Level: {level}</p>
            <p className="home-description">Login Streak: {user.loginStreak} days</p>
            <p className="home-description">Quiz Streak: {user.quizStreak} days</p>
        </motion.div>

        {/* Theme selection button */}
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="theme-selectors"
        >
            <ThemeSelector />
            <AdvancedThemeSelector 
                currentTheme={document.documentElement.getAttribute('data-theme') || 'Default'}
                onThemeChange={(themeName) => {
                    document.documentElement.setAttribute('data-theme', themeName);
                    localStorage.setItem('theme', themeName);
                }}
            />
        </motion.div>

        <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="home-description"
        >
            Ready to take a quiz?
        </motion.p>
        
        <motion.button 
            className="start-quiz-btn" 
            onClick={() => navigate("/user/test")}
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.6, type: "spring", stiffness: 120 }}
            whileHover={{ 
                scale: 1.05, 
                y: -5,
                transition: { duration: 0.3 }
            }}
            whileTap={{ scale: 0.95 }}
        >
            Start Quiz
        </motion.button>

        {/* Premium Intelligence Dashboard Link */}
        {(user?.role === "premium") && (
            <motion.button 
                className="intelligence-dashboard-btn"
                onClick={() => navigate("/intelligence-dashboard")}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.6, type: "spring", stiffness: 120 }}
                whileHover={{ 
                    scale: 1.05, 
                    y: -5,
                    transition: { duration: 0.3 }
                }}
                whileTap={{ scale: 0.95 }}
            >
                🧠 Intelligence Dashboard
            </motion.button>
        )}
        
        <motion.div 
            className="badge-list"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.8 }}
        >
            <h3>Your Badges:</h3>
            <ul>
            {badges.map((badge, i) => (
                <motion.li 
                    key={i} 
                    className="badge-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 + (i * 0.1), duration: 0.5 }}
                    whileHover={{ 
                        scale: 1.05, 
                        rotateY: 10,
                        transition: { duration: 0.3 }
                    }}
                >
                    🏅 {badge}
                </motion.li>
            ))}
            </ul>
        </motion.div>
        
        <motion.button 
            onClick={fetchUserData} 
            className="start-quiz-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            whileHover={{ 
                scale: 1.05,
                transition: { duration: 0.3 }
            }}
            whileTap={{ scale: 0.95 }}
        >
            Refresh Stats
        </motion.button>
        </motion.div>
    );
};

export default Home;