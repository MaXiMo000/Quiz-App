import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../utils/axios';
import { useNotification } from '../hooks/useNotification';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import Loading from './Loading';
import './StudyStreakGoals.css';

const StudyStreakGoals = () => {
    const [streakData, setStreakData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showGoalsModal, setShowGoalsModal] = useState(false);
    const [goals, setGoals] = useState({ quizzes: 3, xp: 200, timeMinutes: 30 });
    const { showSuccess, showError } = useNotification();

    const fetchStreakData = useCallback(async () => {
        try {
            const response = await axios.get('/api/users/streak/goals');
            setStreakData(response.data);
            setGoals(response.data.dailyGoals || { quizzes: 3, xp: 200, timeMinutes: 30 });
        } catch (error) {
            console.error('Error fetching streak data:', error);
            showError('Failed to load streak data');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    const updateGoals = useCallback(async () => {
        try {
            await axios.put('/api/users/streak/goals', goals);
            showSuccess('Daily goals updated successfully!');
            setShowGoalsModal(false);
            fetchStreakData();
        } catch (error) {
            console.error('Error updating goals:', error);
            showError('Failed to update goals');
        }
    }, [goals, showSuccess, showError, fetchStreakData]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            if (showGoalsModal) {
                setShowGoalsModal(false);
            }
        },
        'Enter': (e) => {
            if (showGoalsModal) {
                const target = e.target;
                const isInputElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
                if (!isInputElement) {
                    e.preventDefault();
                    updateGoals();
                }
            }
        },
    }, [showGoalsModal, updateGoals]);

    useEffect(() => {
        fetchStreakData();

        // Refresh data every 30 seconds to show updated activity
        const interval = setInterval(() => {
            fetchStreakData();
        }, 30000);

        // Also refresh when page becomes visible (user switches back to tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchStreakData();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchStreakData]);

    const generateCalendarDays = () => {
        const days = [];
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 29); // Last 30 days

        for (let i = 0; i < 30; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateKey = date.toISOString().split('T')[0];
            const isToday = dateKey === today.toISOString().split('T')[0];
            const hasActivity = streakData?.calendarData?.[dateKey]?.hasActivity || false;

            days.push({
                date,
                dateKey,
                isToday,
                hasActivity,
                quizCount: streakData?.calendarData?.[dateKey]?.quizCount || 0,
                xp: streakData?.calendarData?.[dateKey]?.xp || 0
            });
        }

        return days;
    };

    if (loading) {
        return <Loading fullScreen={false} size="medium" />;
    }

    if (!streakData) {
        return null;
    }

    const calendarDays = generateCalendarDays();
    const { currentStreak, longestStreak, goalsProgress, todayActivity } = streakData;

    return (
        <div className="study-streak-container">
            <div className="streak-header">
                <h2 className="streak-title">
                    <span className="streak-icon">🔥</span>
                    Study Streak & Goals
                </h2>
                <button
                    className="edit-goals-btn"
                    onClick={() => setShowGoalsModal(true)}
                    title="Edit daily goals"
                    aria-label="Edit daily goals"
                >
                    ⚙️
                </button>
            </div>

            {/* Streak Display */}
            <div className="streak-display">
                <motion.div
                    className="streak-card current-streak"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="streak-number">{currentStreak}</div>
                    <div className="streak-label">Day Streak</div>
                    <div className="streak-subtitle">Keep it going! 🔥</div>
                </motion.div>

                <motion.div
                    className="streak-card longest-streak"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <div className="streak-number">{longestStreak}</div>
                    <div className="streak-label">Best Streak</div>
                    <div className="streak-subtitle">Your record! 🏆</div>
                </motion.div>
            </div>

            {/* Daily Goals Progress */}
            <div className="goals-section">
                <h3 className="goals-title">Today's Progress</h3>
                <div className="goals-grid">
                    <GoalProgressCard
                        icon="📝"
                        label="Quizzes"
                        current={goalsProgress.quizzes.current}
                        target={goalsProgress.quizzes.target}
                        percentage={goalsProgress.quizzes.percentage}
                        color="accent"
                    />
                    <GoalProgressCard
                        icon="⭐"
                        label="XP"
                        current={goalsProgress.xp.current}
                        target={goalsProgress.xp.target}
                        percentage={goalsProgress.xp.percentage}
                        color="warning"
                    />
                    <GoalProgressCard
                        icon="⏱️"
                        label="Time"
                        current={goalsProgress.time.current}
                        target={goalsProgress.time.target}
                        percentage={goalsProgress.time.percentage}
                        color="info"
                        unit="min"
                    />
                </div>
            </div>

            {/* Calendar View */}
            <div className="calendar-section">
                <h3 className="calendar-title">30-Day Activity Calendar</h3>
                <div className="calendar-grid">
                    {calendarDays.map((day, index) => (
                        <motion.div
                            key={day.dateKey}
                            className={`calendar-day ${day.isToday ? 'today' : ''} ${day.hasActivity ? 'active' : ''}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: index * 0.01 }}
                            title={day.hasActivity ? `${day.quizCount} quiz(es), ${day.xp} XP` : 'No activity'}
                            role="gridcell"
                            aria-label={day.isToday ? `Today, ${day.date.toLocaleDateString()}: ${day.hasActivity ? `${day.quizCount} quiz(es), ${day.xp} XP` : 'No activity'}` : `${day.date.toLocaleDateString()}: ${day.hasActivity ? `${day.quizCount} quiz(es), ${day.xp} XP` : 'No activity'}`}
                        >
                            <div className="day-number">{day.date.getDate()}</div>
                            {day.hasActivity && (
                                <div className="activity-indicator">
                                    <div className="activity-dot"></div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
                <div className="calendar-legend">
                    <div className="legend-item">
                        <div className="legend-dot active"></div>
                        <span>Activity</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-dot today"></div>
                        <span>Today</span>
                    </div>
                </div>
            </div>

            {/* Goals Modal */}
            <AnimatePresence>
                {showGoalsModal && (
                    <motion.div
                        className="goals-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowGoalsModal(false)}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="goals-modal-title"
                    >
                        <motion.div
                            className="goals-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ textAlign: 'center' }}
                        >
                            <div className="modal-header">
                                <h3 id="goals-modal-title">Edit Daily Goals</h3>
                                <button
                                    className="close-btn"
                                    onClick={() => setShowGoalsModal(false)}
                                    aria-label="Close edit goals modal"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="modal-content">
                                <div className="goal-input-group">
                                    <label htmlFor="quizzes-goal">
                                        <span className="goal-icon">📝</span>
                                        Quizzes per day
                                    </label>
                                    <div className="input-wrapper">
                                        <input
                                            id="quizzes-goal"
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={goals.quizzes}
                                            onChange={(e) => setGoals({ ...goals, quizzes: parseInt(e.target.value) || 1 })}
                                            placeholder="Enter number of quizzes"
                                            aria-label="Quizzes per day goal"
                                            aria-describedby="quizzes-hint"
                                        />
                                        <span id="quizzes-hint" className="input-hint">1-20 quizzes</span>
                                    </div>
                                </div>
                                <div className="goal-input-group">
                                    <label htmlFor="xp-goal">
                                        <span className="goal-icon">⭐</span>
                                        XP per day
                                    </label>
                                    <div className="input-wrapper">
                                        <input
                                            id="xp-goal"
                                            type="number"
                                            min="50"
                                            max="2000"
                                            value={goals.xp}
                                            onChange={(e) => setGoals({ ...goals, xp: parseInt(e.target.value) || 50 })}
                                            placeholder="Enter XP target"
                                            aria-label="XP per day goal"
                                            aria-describedby="xp-hint"
                                        />
                                        <span id="xp-hint" className="input-hint">50-2000 XP</span>
                                    </div>
                                </div>
                                <div className="goal-input-group">
                                    <label htmlFor="time-goal">
                                        <span className="goal-icon">⏱️</span>
                                        Study time (minutes)
                                    </label>
                                    <div className="input-wrapper">
                                        <input
                                            id="time-goal"
                                            type="number"
                                            min="5"
                                            max="300"
                                            value={goals.timeMinutes}
                                            onChange={(e) => setGoals({ ...goals, timeMinutes: parseInt(e.target.value) || 5 })}
                                            placeholder="Enter study time"
                                            aria-label="Study time goal in minutes"
                                            aria-describedby="time-hint"
                                        />
                                        <span id="time-hint" className="input-hint">5-300 minutes</span>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button
                                    className="cancel-btn"
                                    onClick={() => setShowGoalsModal(false)}
                                    aria-label="Cancel editing goals"
                                >
                                    <span>Cancel</span>
                                </button>
                                <button
                                    className="save-btn"
                                    onClick={updateGoals}
                                    aria-label="Save daily goals"
                                >
                                    <span>💾 Save Goals</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const GoalProgressCard = ({ icon, label, current, target, percentage, color, unit = '' }) => {
    const getColorClass = () => {
        if (percentage >= 100) return 'success';
        if (percentage >= 50) return color;
        return 'muted';
    };

    return (
        <motion.div
            className={`goal-card ${getColorClass()}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className="goal-header">
                <span className="goal-icon">{icon}</span>
                <span className="goal-label">{label}</span>
            </div>
            <div className="goal-progress">
                <div className="progress-bar-container">
                    <motion.div
                        className="progress-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, percentage)}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    />
                </div>
                <div className="goal-stats">
                    <span className="goal-current">{current}{unit}</span>
                    <span className="goal-separator">/</span>
                    <span className="goal-target">{target}{unit}</span>
                </div>
            </div>
            <div className="goal-percentage">{percentage}%</div>
        </motion.div>
    );
};

export default StudyStreakGoals;
