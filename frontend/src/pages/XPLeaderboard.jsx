// src/components/XPLeaderboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios";
import Loading from "../components/Loading";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import "./Leaderboard.css";

const XPLeaderboard = () => {
    const [period, setPeriod] = useState("weekly");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Notification system
    const { notification, showError, hideNotification } = useNotification();

    const fetchXPLeaderboard = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await axios.get(`/api/leaderboard/${period}`);
            setData(response.data || []);
        } catch (err) {
            console.error("Error fetching XP leaderboard:", err);
            const errorMsg = "Error fetching leaderboard data.";
            setError(errorMsg);
            showError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchXPLeaderboard();
    }, [fetchXPLeaderboard]);

    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { y: 30, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.5, ease: "easeOut" }
        }
    };

    const tableRowVariants = {
        hidden: { x: -50, opacity: 0 },
        visible: {
            x: 0,
            opacity: 1,
            transition: { duration: 0.4, ease: "easeOut" }
        }
    };

    const getRankColor = (index) => {
        switch (index) {
            case 0: return "#ffd700"; // Gold
            case 1: return "#c0c0c0"; // Silver
            case 2: return "#cd7f32"; // Bronze
            default: return "#6366f1";
        }
    };

    const getRankIcon = (index) => {
        switch (index) {
            case 0: return "🥇";
            case 1: return "🥈";
            case 2: return "🥉";
            default: return "🏆";
        }
    };

    return (
        <motion.div
            className="leaderboard-container"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <motion.h2
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
            >
                🔥 XP Leaderboard ({period === "weekly" ? "Weekly" : "Monthly"})
            </motion.h2>

            <motion.div
                className="leaderboard-buttons"
                variants={itemVariants}
                role="group"
                aria-label="Leaderboard period filter"
            >
                <motion.button
                    onClick={() => handlePeriodChange("weekly")}
                    className={period === "weekly" ? "active" : ""}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    aria-label="Show weekly XP leaderboard"
                    aria-pressed={period === "weekly"}
                >
                    Weekly
                </motion.button>
                <motion.button
                    onClick={() => handlePeriodChange("monthly")}
                    className={period === "monthly" ? "active" : ""}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    aria-label="Show monthly XP leaderboard"
                    aria-pressed={period === "monthly"}
                >
                    Monthly
                </motion.button>
            </motion.div>

            <AnimatePresence mode="wait">
                {loading ? (
                    <Loading fullScreen={false} size="medium" key="loading" />
                ) : error ? (
                    <motion.div
                        className="error-container"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key="error"
                    >
                        <p className="error-message">{error}</p>
                    </motion.div>
                ) : data.length > 0 ? (
                    <motion.div
                        className="leaderboard-table"
                        variants={itemVariants}
                        key="leaderboard-content"
                    >
                        <motion.table
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <motion.thead
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <tr>
                                    <th>Rank</th>
                                    <th>Username</th>
                                    <th>Total XP</th>
                                </tr>
                            </motion.thead>
                            <motion.tbody>
                                <AnimatePresence>
                                    {data.map((user, index) => (
                                        <motion.tr
                                            key={`${user.username}-${index}`}
                                            variants={tableRowVariants}
                                            initial="hidden"
                                            animate="visible"
                                            whileHover={{
                                                backgroundColor: "rgba(99, 102, 241, 0.05)",
                                                scale: 1.01
                                            }}
                                            transition={{ duration: 0.2 }}
                                            custom={index}
                                        >
                                            <motion.td
                                                className="rank-cell"
                                                whileHover={{
                                                    scale: 1.2,
                                                    color: getRankColor(index)
                                                }}
                                            >
                                                <span className="rank-icon">{getRankIcon(index)}</span>
                                                #{index + 1}
                                            </motion.td>
                                            <motion.td
                                                className="username-cell"
                                                whileHover={{ x: 5, color: "#6366f1" }}
                                            >
                                                {user.username}
                                            </motion.td>
                                            <motion.td
                                                className="xp-cell"
                                                whileHover={{ scale: 1.1, color: "#d946ef" }}
                                            >
                                                <span className="xp-value">{Math.round(user.xp)} XP</span>
                                            </motion.td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </motion.tbody>
                        </motion.table>
                    </motion.div>
                ) : (
                    <motion.div
                        className="no-data"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key="no-data"
                    >
                        <div className="no-data-icon">📊</div>
                        <p>No XP data available.</p>
                        <p className="no-data-subtitle">Start taking quizzes to earn XP!</p>
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
        </motion.div>
    );
};

export default XPLeaderboard;
