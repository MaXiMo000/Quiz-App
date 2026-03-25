import React, { useState, useEffect, useCallback, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../context/ThemeContext';
import axios from '../utils/axios';
import { useNotification } from '../hooks/useNotification';
import { safeParseJSON } from '../utils/localStorage';
import NotificationModal from './NotificationModal';
import './QuickThemeSwitcher.css';

/** Small inline SVGs — crisp at any DPI, no emoji */
const Glyph = ({ name, className }) => {
    const common = { className, width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true };
    switch (name) {
        case 'default':
            return (
                <svg {...common}>
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" opacity="0.95" />
                </svg>
            );
        case 'dark':
            return (
                <svg {...common}>
                    <path d="M12 3a9 9 0 109 9c0-4.97-4.03-9-9-9zm0 16a7 7 0 110-14 7 7 0 010 14z" fill="currentColor" />
                </svg>
            );
        case 'light':
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="4" fill="currentColor" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            );
        case 'dracula':
            return (
                <svg {...common}>
                    <path d="M12 2C8.5 2 6 4.5 6 8c0 3 1 5 3 7v5l3-2 3 2v-5c2-2 3-4 3-7 0-3.5-2.5-6-6-6z" fill="currentColor" opacity="0.9" />
                </svg>
            );
        case 'nord':
            return (
                <svg {...common}>
                    <path d="M12 2l1.09 3.26L16 6l-3.09 1.74L12 11l-1.91-3.26L7 6l3.09-1.74L12 2zM5 13l.82 2.46L8 16l-2.18 1.23L5 19.5 3.82 17.23 2 16l2.18-1.23L5 13zm14 0l.82 2.46L18 16l-2.18 1.23L15 19.5l-1.18-2.27L12 16l2.18-1.23L19 13z" fill="currentColor" />
                </svg>
            );
        case 'material':
            return (
                <svg {...common}>
                    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zM6.5 12c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3.5-4C9.67 8 9 7.33 9 6.5S9.67 5 10.5 5s1.5.67 1.5 1.5S11.33 8 10.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S14.67 5 15.5 5 17 5.67 17 6.5 16.33 8 15.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S17.67 9 18.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor" />
                </svg>
            );
        default:
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                </svg>
            );
    }
};

const quickThemes = [
    { name: 'Default', label: 'Default', glyph: 'default', level: 0 },
    { name: 'Dark', label: 'Dark', glyph: 'dark', level: 1 },
    { name: 'Light', label: 'Light', glyph: 'light', level: 1 },
    { name: 'dracula', label: 'Dracula', glyph: 'dracula', level: 5 },
    { name: 'nord', label: 'Nord', glyph: 'nord', level: 5 },
    { name: 'material-dark', label: 'Material Dark', glyph: 'material', level: 3 },
    { name: 'material-light', label: 'Material Light', glyph: 'material', level: 3 },
];

const QuickThemeSwitcher = () => {
    const { theme, changeTheme } = useContext(ThemeContext);
    const [isOpen, setIsOpen] = useState(false);
    const [unlockedThemes, setUnlockedThemes] = useState([]);
    const [userLevel, setUserLevel] = useState(1);
    const { notification, showSuccess, showError, hideNotification } = useNotification();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const user = safeParseJSON('user', null);
                if (user?._id) {
                    const res = await axios.get(`/api/users/${user._id}`);
                    const data = res.data?.user ?? res.data;
                    setUnlockedThemes(data?.unlockedThemes || []);
                    setUserLevel(data?.level || 1);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, []);

    const handleThemeChange = useCallback(async (themeName) => {
        try {
            const user = safeParseJSON('user', null);
            if (!user?._id) {
                showError('Please log in to change themes');
                return;
            }

            const isUnlocked = themeName === 'Default' || unlockedThemes.includes(themeName);
            if (!isUnlocked) {
                const themeInfo = quickThemes.find(t => t.name === themeName);
                const requiredLevel = themeInfo?.level || 5;
                showError(`This theme unlocks at Level ${requiredLevel}. You are currently Level ${userLevel}.`);
                return;
            }

            localStorage.removeItem('activeCustomTheme');
            localStorage.removeItem('customThemeId');

            await axios.post(`/api/users/${user._id}/theme`, { theme: themeName });

            changeTheme(themeName);
            setIsOpen(false);
            const label = quickThemes.find(t => t.name === themeName)?.label || themeName;
            showSuccess(`Theme changed to ${label}`);

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
                    type="button"
                    className="theme-switcher-toggle"
                    onClick={() => setIsOpen(!isOpen)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    aria-label="Open quick theme menu"
                    title="Themes"
                >
                    <svg className="theme-toggle-glyph" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.75" />
                        <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" fill="currentColor" fillOpacity="0.2" />
                    </svg>
                </motion.button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            className="theme-switcher-panel"
                            role="dialog"
                            aria-label="Quick themes"
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            transition={{ duration: 0.18 }}
                        >
                            <div className="theme-switcher-header">
                                <h3 className="theme-switcher-title">Themes</h3>
                                <button
                                    type="button"
                                    className="close-theme-switcher"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close theme menu"
                                >
                                    <svg className="close-theme-switcher-icon" viewBox="0 0 24 24" aria-hidden>
                                        <path
                                            className="close-theme-switcher-x"
                                            d="M18 6L6 18M6 6l12 12"
                                            fill="none"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </button>
                            </div>
                            <ul className="theme-switcher-list" role="listbox">
                                {quickThemes.map((themeOption) => {
                                    const isUnlocked = themeOption.name === 'Default' || unlockedThemes.includes(themeOption.name);
                                    const isActive = theme === themeOption.name;

                                    return (
                                        <li key={themeOption.name} className="theme-option-li">
                                            <motion.button
                                                type="button"
                                                className={`theme-option ${isActive ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`}
                                                onClick={() => isUnlocked && handleThemeChange(themeOption.name)}
                                                disabled={!isUnlocked}
                                                whileHover={isUnlocked ? { y: -1 } : {}}
                                                whileTap={isUnlocked ? { scale: 0.98 } : {}}
                                                title={!isUnlocked ? `Unlocks at Level ${themeOption.level}` : `Use ${themeOption.label}`}
                                                aria-label={!isUnlocked ? `${themeOption.label}, locked until level ${themeOption.level}` : themeOption.label}
                                                aria-selected={isActive}
                                            >
                                                <span className="theme-icon-wrap" aria-hidden>
                                                    <Glyph name={themeOption.glyph} className="theme-glyph" />
                                                </span>
                                                <span className="theme-name">{themeOption.label}</span>
                                                {isActive && (
                                                    <span className="active-indicator" aria-hidden>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M20 6L9 17l-5-5" />
                                                        </svg>
                                                    </span>
                                                )}
                                                {!isUnlocked && (
                                                    <span className="lock-wrap" aria-hidden title="Locked">
                                                        <svg className="lock-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M18 10h-1V8c0-2.76-2.24-5-5-5S7 5.24 7 8v2H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3-9H9V8c0-1.66 1.34-3 3-3s3 1.34 3 3v2z" />
                                                        </svg>
                                                    </span>
                                                )}
                                            </motion.button>
                                        </li>
                                    );
                                })}
                            </ul>
                            <div className="theme-switcher-footer">
                                <button
                                    type="button"
                                    className="view-all-themes-btn"
                                    onClick={() => {
                                        setIsOpen(false);
                                        window.location.href = '/themes';
                                    }}
                                >
                                    All themes
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
