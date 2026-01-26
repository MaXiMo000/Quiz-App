import React, { useState, useEffect, useCallback, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../context/ThemeContext';
import axios from '../utils/axios';
import { useNotification } from '../hooks/useNotification';
import NotificationModal from './NotificationModal';
import './QuickThemeSwitcher.css';

const QuickThemeSwitcher = () => {
    const { theme, changeTheme } = useContext(ThemeContext);
    const [isOpen, setIsOpen] = useState(false);
    const [unlockedThemes, setUnlockedThemes] = useState([]);
    const [userLevel, setUserLevel] = useState(1);
    const { notification, showSuccess, showError, hideNotification } = useNotification();

    // Popular themes for quick access (always unlocked)
    const quickThemes = [
        { name: 'Default', display: '🌙 Default', level: 0 },
        { name: 'Dark', display: '🌑 Dark', level: 1 },
        { name: 'Light', display: '☀️ Light', level: 1 },
        { name: 'dracula', display: '🧛 Dracula', level: 5 },
        { name: 'nord', display: '❄️ Nord', level: 5 },
        { name: 'material-dark', display: '🎨 Material Dark', level: 3 },
        { name: 'material-light', display: '🎨 Material Light', level: 3 },
    ];

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (user?._id) {
                    const res = await axios.get(`/api/users/${user._id}`);
                    setUnlockedThemes(res.data.unlockedThemes || []);
                    setUserLevel(res.data.level || 1);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, []);

    const handleThemeChange = useCallback(async (themeName) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user?._id) {
                showError('Please log in to change themes');
                return;
            }

            // Check if theme is unlocked (Default is always unlocked)
            const isUnlocked = themeName === 'Default' || unlockedThemes.includes(themeName);
            if (!isUnlocked) {
                const themeInfo = quickThemes.find(t => t.name === themeName);
                const requiredLevel = themeInfo?.level || 5;
                showError(`This theme unlocks at Level ${requiredLevel}. You are currently Level ${userLevel}.`);
                return;
            }

            // Clear custom theme when applying a regular theme
            localStorage.removeItem('activeCustomTheme');
            localStorage.removeItem('customThemeId');

            // Update theme on server
            await axios.post(`/api/users/${user._id}/theme`, { theme: themeName });

            // Apply theme locally
            changeTheme(themeName);
            setIsOpen(false);
            showSuccess(`🎨 Theme changed to ${quickThemes.find(t => t.name === themeName)?.display || themeName}`);

            // Reload to ensure theme is fully applied
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            console.error('Error changing theme:', error);
            showError(error.response?.data?.error || 'Failed to change theme. Please try again.');
        }
    }, [changeTheme, unlockedThemes, userLevel, showSuccess, showError]);

    return (
        <>
            <motion.div
                className="quick-theme-switcher"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, type: 'spring', stiffness: 200 }}
            >
                <motion.button
                    className="theme-switcher-toggle"
                    onClick={() => setIsOpen(!isOpen)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Quick theme switcher"
                    title="Quick Theme Switcher"
                >
                    🎨
                </motion.button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            className="theme-switcher-panel"
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="theme-switcher-header">
                                <h3>Quick Themes</h3>
                                <button
                                    className="close-theme-switcher"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close theme switcher"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="theme-switcher-list">
                                {quickThemes.map((themeOption) => {
                                    const isUnlocked = themeOption.name === 'Default' || unlockedThemes.includes(themeOption.name);
                                    const isActive = theme === themeOption.name;

                                    return (
                                        <motion.button
                                            key={themeOption.name}
                                            className={`theme-option ${isActive ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`}
                                            onClick={() => isUnlocked && handleThemeChange(themeOption.name)}
                                            disabled={!isUnlocked}
                                            whileHover={isUnlocked ? { scale: 1.05, x: 5 } : {}}
                                            whileTap={isUnlocked ? { scale: 0.95 } : {}}
                                            title={!isUnlocked ? `Unlocks at Level ${themeOption.level}` : themeOption.display}
                                            aria-label={`Switch to ${themeOption.display} theme`}
                                        >
                                            <span className="theme-icon">{themeOption.display.split(' ')[0]}</span>
                                            <span className="theme-name">{themeOption.display.split(' ').slice(1).join(' ')}</span>
                                            {isActive && <span className="active-indicator">✓</span>}
                                            {!isUnlocked && <span className="lock-icon">🔒</span>}
                                        </motion.button>
                                    );
                                })}
                            </div>
                            <div className="theme-switcher-footer">
                                <button
                                    className="view-all-themes-btn"
                                    onClick={() => {
                                        setIsOpen(false);
                                        window.location.href = '/themes';
                                    }}
                                    aria-label="View all themes"
                                >
                                    View All Themes →
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
                autoClose={notification.autoClose}
            />
        </>
    );
};

export default QuickThemeSwitcher;
