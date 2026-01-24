import React, { useState, useContext, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AdvancedThemeSelector.css';
import { useNotification } from '../hooks/useNotification';
import NotificationModal from './NotificationModal';
import { ThemeContext } from '../context/ThemeContext';
import axios from '../utils/axios';

// Utility functions for color conversion
const rgbaToHex = (rgba) => {
    if (!rgba || typeof rgba !== 'string') return '#000000';

    // If already hex, return as is
    if (rgba.startsWith('#')) {
        return rgba.length === 7 ? rgba : '#000000';
    }

    // Parse rgba string
    const rgbaMatch = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (!rgbaMatch) return '#000000';

    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);

    const toHex = (n) => {
        const hex = n.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToRgba = (hex, alpha = 1) => {
    if (!hex || typeof hex !== 'string') return `rgba(0, 0, 0, ${alpha})`;

    // If already rgba, return as is
    if (hex.startsWith('rgba')) return hex;

    // Remove # if present
    const cleanHex = hex.replace('#', '');

    // Handle 3-digit hex
    const fullHex = cleanHex.length === 3
        ? cleanHex.split('').map(char => char + char).join('')
        : cleanHex;

    if (fullHex.length !== 6) return `rgba(0, 0, 0, ${alpha})`;

    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Check if a color value is rgba format
const isRgba = (color) => {
    return color && typeof color === 'string' && color.startsWith('rgba');
};

// Extract alpha from rgba if exists, otherwise return 1
const getAlpha = (rgba) => {
    if (!isRgba(rgba)) return 1;
    const match = rgba.match(/rgba?\([^)]+,\s*([\d.]+)\)/);
    return match ? parseFloat(match[1]) : 1;
};

const AdvancedThemeSelector = () => {
    const { theme: currentTheme, changeTheme } = useContext(ThemeContext);
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('select'); // 'select' or 'customize'
    const [previewTheme, setPreviewTheme] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [unlocked, setUnlocked] = useState([]);
    const [userFromStorage, setUserFromStorage] = useState(() => JSON.parse(localStorage.getItem("user")));
    const userLevel = userFromStorage?.level || 1;
    const { notification, showSuccess, showError, hideNotification } = useNotification();
    const [customThemeName, setCustomThemeName] = useState('');
    const [savedCustomThemes, setSavedCustomThemes] = useState([]);
    const [maxCustomThemes, setMaxCustomThemes] = useState(0);
    const [canCreateMore, setCanCreateMore] = useState(false);

    // Expanded customization state - All theme variables
    const [customTheme, setCustomTheme] = useState({
        // Accent colors
        accent: '#6366f1',
        accent2: '#8b5cf6',
        accentLight: 'rgba(99, 102, 241, 0.15)',
        accentHover: '#5855eb',

        // Background colors
        bgDark: '#0a0e1a',
        bgSecondary: '#141b2e',
        bgTertiary: '#1a2332',

        // Card colors
        cardBg: 'rgba(26, 35, 50, 0.85)',
        cardBgGlass: 'rgba(255, 255, 255, 0.03)',
        cardBorder: 'rgba(255, 255, 255, 0.08)',

        // Text colors
        textColor: '#f1f5f9',
        textLight: '#ffffff',
        textMuted: '#94a3b8',
        textDisabled: '#64748b',

        // Status colors
        success: '#10b981',
        successLight: 'rgba(16, 185, 129, 0.15)',
        warning: '#f59e0b',
        warningLight: 'rgba(245, 158, 11, 0.15)',
        danger: '#ef4444',
        dangerLight: 'rgba(239, 68, 68, 0.15)',
        info: '#06b6d4',
        infoLight: 'rgba(6, 182, 212, 0.15)',

        // Border colors
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderFocus: '#6366f1',

        // Glassmorphism
        glassBg: 'rgba(255, 255, 255, 0.05)',
        glassBorder: 'rgba(255, 255, 255, 0.1)',

        // Shadow
        shadow: 'rgba(0, 0, 0, 0.4)',

        // Sidebar colors
        colorSidebarGradientStart: '#0a0e1a',
        colorSidebarGradientEnd: '#141b2e',
        colorScrollbarThumb: '#6366f1',
        colorScrollbarTrack: '#141b2e',
        colorSidebarShadow: 'rgba(0, 0, 0, 0.25)',

        // Logout colors
        colorLogoutBg: '#ef4444',
        colorLogoutHoverBg: '#dc2626',
        colorLogoutText: '#ffffff',

        // Toggle colors
        colorToggleBg: 'rgba(255, 255, 255, 0.05)',
        colorToggleHoverBg: 'rgba(99, 102, 241, 0.15)',
        colorToggleText: '#ffffff',

        // Close button colors
        colorCloseBtn: '#f1f5f9',
        colorCloseBtnHover: '#ef4444',

        // Style options
        borderRadius: '1rem',
        shadowIntensity: 'medium'
    });

    useEffect(() => {
        const fetchUser = async () => {
            const latestUser = JSON.parse(localStorage.getItem("user"));
            setUserFromStorage(latestUser);
            const latestUserId = latestUser?._id;
            if (!latestUserId) return;
            try {
                const res = await axios.get(`/api/users/${latestUserId}`);
                setUnlocked(res.data.unlockedThemes || []);

                // Update userFromStorage with latest data to ensure userLevel is current
                if (res.data.level) {
                    const updatedUser = { ...latestUser, level: res.data.level };
                    setUserFromStorage(updatedUser);
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                }

                // Fetch custom themes
                try {
                    const customRes = await axios.get(`/api/users/${latestUserId}/custom-themes`);
                    setSavedCustomThemes(customRes.data.customThemes || []);
                    setMaxCustomThemes(customRes.data.maxCustomThemes || 0);
                    setCanCreateMore(customRes.data.canCreateMore || false);
                } catch (customErr) {
                    console.error("Error fetching custom themes:", customErr);
                    // Set defaults if fetch fails
                    const currentLevel = res.data.level || latestUser?.level || 1;
                    setSavedCustomThemes([]);
                    setMaxCustomThemes(Math.floor(currentLevel / 5));
                    setCanCreateMore(true);
                }
            } catch (err) {
                console.error("Error fetching themes:", err);
                // Set defaults if fetch fails
                const currentLevel = latestUser?.level || 1;
                setUnlocked([]);
                setSavedCustomThemes([]);
                setMaxCustomThemes(Math.floor(currentLevel / 5));
                setCanCreateMore(true);
            }
        };
        if (isOpen) {
            fetchUser();
        }
    }, [isOpen]);

    const themeLevels = {
        "Light": 2,
        "Dark": 3,
        "Galaxy": 5,
        "Forest": 7,
        "Sunset": 10,
        "Neon": 15,
        "material-light": 4,
        "material-dark": 6,
        "dracula": 8,
        "nord": 12,
        "solarized-light": 14,
        "solarized-dark": 16,
        "monokai": 18,
        "one-dark": 20,
        "gruvbox-dark": 22,
        "gruvbox-light": 24,
        "oceanic": 26,
        "synthwave": 28,
        "night-owl": 30,
        "tokyo-night": 32,
        "ayu-light": 34,
        "catppuccin-mocha": 36,
        "catppuccin-latte": 38,
        "rose-pine": 40,
        "everforest": 42,
        "kanagawa": 44,
        "github-dark": 46,
        "github-light": 48
    };

    const themeDescriptions = {
        Default: "Clean, neutral base theme perfect for everyone.",
        Light: "Simple and bright with light backgrounds for daytime use.",
        Dark: "Sleek dark interface with modern aesthetics.",
        Galaxy: "Deep purple & blue starry-night vibe.",
        Forest: "Rich greens and earthy browns of the woods.",
        Sunset: "Warm oranges, pinks, and purples at dusk.",
        Neon: "Vibrant neon on an ultra-dark backdrop.",
        "material-light": "Material Light: crisp surfaces with bright accents.",
        "material-dark": "Material Dark: deep tones with purple & teal highlights.",
        dracula: "Dracula: moody purples and pinks on dark gray.",
        nord: "Nord: cool, arctic-inspired blues and grays.",
        "solarized-light": "Solarized Light: soft cream background with blue text.",
        "solarized-dark": "Solarized Dark: teal background with warm yellow accents.",
        monokai: "Monokai: high-contrast dark theme with vibrant oranges & greens.",
        "one-dark": "One Dark: Atom's signature dark-blue palette.",
        "gruvbox-dark": "Gruvbox Dark: rich browns with bright green highlights.",
        "gruvbox-light": "Gruvbox Light: warm beige with earthy accent colors.",
        oceanic: "Oceanic: deep-sea blues and vivid teal tones.",
        synthwave: "Synthwave: neon pink & cyan glow on pitch black.",
        "night-owl": "Night Owl: nighttime blues with bright highlight colors.",
        "tokyo-night": "Tokyo Night: moody indigos with neon green accents.",
        "ayu-light": "Ayu Light: gentle pastels with punchy orange highlights.",
        "catppuccin-mocha": "Catppuccin Mocha: warm dark theme with soft pastels.",
        "catppuccin-latte": "Catppuccin Latte: warm light theme with gentle colors.",
        "rose-pine": "Rose Pine: elegant dark theme with rose accents.",
        everforest: "Everforest: soothing green theme inspired by nature.",
        kanagawa: "Kanagawa: Japanese-inspired theme with warm oranges.",
        "github-dark": "GitHub Dark: official GitHub dark theme.",
        "github-light": "GitHub Light: clean GitHub light theme."
    };

    const themeColors = {
        Default: ["#6366f1", "#8b5cf6", "#0a0e1a"],
        Light: ["#2563eb", "#7c3aed", "#ffffff"],
        Dark: ["#3b82f6", "#8b5cf6", "#0f0f0f"],
        Galaxy: ["#8b5cf6", "#6366f1", "#1a1b26"],
        Forest: ["#4ade80", "#22c55e", "#0a1f0a"],
        Sunset: ["#f97316", "#ea580c", "#fff8f0"],
        Neon: ["#00ff00", "#ff00ff", "#000000"],
        "material-light": ["#6200ea", "#03dac6", "#fafafa"],
        "material-dark": ["#bb86fc", "#03dac6", "#121212"],
        dracula: ["#bd93f9", "#ff79c6", "#282a36"],
        nord: ["#81a1c1", "#88c0d0", "#2e3440"],
        "solarized-light": ["#268bd2", "#2aa198", "#fdf6e3"],
        "solarized-dark": ["#b58900", "#cb4b16", "#002b36"],
        monokai: ["#fd971f", "#a6e22e", "#272822"],
        "one-dark": ["#61afef", "#c678dd", "#282c34"],
        "gruvbox-dark": ["#b8bb26", "#fabd2f", "#1d2021"],
        "gruvbox-light": ["#b8bb26", "#d65d0e", "#fbf1c7"],
        oceanic: ["#6699cc", "#99c794", "#1b2b34"],
        synthwave: ["#00d9ff", "#ff0095", "#0d0221"],
        "night-owl": ["#82aaff", "#7e57c2", "#011627"],
        "tokyo-night": ["#7aa2f7", "#bb9af7", "#1a1b26"],
        "ayu-light": ["#f97d58", "#01d293", "#fafafa"],
        "catppuccin-mocha": ["#cba6f7", "#f38ba8", "#1e1e2e"],
        "catppuccin-latte": ["#8839ef", "#ea76cb", "#eff1f5"],
        "rose-pine": ["#eb6f92", "#c4a7e7", "#191724"],
        everforest: ["#a7c080", "#83c092", "#2d353b"],
        kanagawa: ["#ffa066", "#c34043", "#1f1f28"],
        "github-dark": ["#58a6ff", "#bc8cff", "#0d1117"],
        "github-light": ["#0969da", "#8250df", "#ffffff"]
    };

    const themeCategories = {
        "all": { name: "All Themes", icon: "🎨" },
        "standard": { name: "Standard", icon: "⭐", themes: ["Default", "Light", "Dark"] },
        "modern": { name: "Modern", icon: "🌙", themes: ["material-light", "material-dark", "nord", "tokyo-night", "night-owl"] },
        "nature": { name: "Nature", icon: "🌿", themes: ["Forest", "everforest", "oceanic"] },
        "vibrant": { name: "Vibrant", icon: "✨", themes: ["Neon", "synthwave", "dracula", "monokai", "Sunset"] },
        "retro": { name: "Retro", icon: "📼", themes: ["synthwave", "gruvbox-dark", "gruvbox-light", "solarized-dark", "solarized-light"] },
        "warm": { name: "Warm", icon: "🔥", themes: ["Sunset", "kanagawa", "catppuccin-mocha", "catppuccin-latte", "rose-pine"] },
        "professional": { name: "Professional", icon: "💼", themes: ["github-dark", "github-light", "ayu-light", "one-dark"] },
        "custom": { name: "Custom", icon: "✨", themes: [] }
    };

    const allThemeNames = [
        "Default", "Light", "Dark", "Galaxy", "Forest", "Sunset", "Neon",
        "material-light", "material-dark", "dracula", "nord", "solarized-light",
        "solarized-dark", "monokai", "one-dark", "gruvbox-dark", "gruvbox-light",
        "oceanic", "synthwave", "night-owl", "tokyo-night", "ayu-light",
        "catppuccin-mocha", "catppuccin-latte", "rose-pine", "everforest",
        "kanagawa", "github-dark", "github-light"
    ];

    const formatThemeName = (name) => {
        // Handle custom theme IDs (format: "custom-{id}")
        if (name && name.startsWith('custom-')) {
            const themeId = name.replace('custom-', '');
            const customThemeItem = savedCustomThemes.find(t => t._id === themeId);
            if (customThemeItem && customThemeItem.name) {
                return customThemeItem.name;
            }
            return 'Custom Theme';
        }
        return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    // Filter themes
    const filteredThemes = useMemo(() => {
        let filtered = allThemeNames;

        if (selectedCategory !== "all") {
            const categoryThemes = themeCategories[selectedCategory]?.themes || [];
            filtered = filtered.filter(theme => categoryThemes.includes(theme));
        }

        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase();
            filtered = filtered.filter(theme => {
                const name = formatThemeName(theme).toLowerCase();
                const desc = (themeDescriptions[theme] || "").toLowerCase();
                return name.includes(query) || desc.includes(query);
            });
        }

        return filtered;
    }, [searchTerm, selectedCategory]);

    const handlePreview = (themeName) => {
        // Handle custom theme preview
        if (themeName.startsWith('custom-')) {
            const themeId = themeName.replace('custom-', '');
            const customThemeItem = savedCustomThemes.find(t => t._id === themeId);
            if (customThemeItem && customThemeItem.themeData) {
                setPreviewTheme(themeName);
                applySavedCustomTheme(customThemeItem.themeData);
            }
            return;
        }

        // Handle regular theme preview
        const requiredLevel = themeLevels[themeName];
        const isUnlocked = themeName === "Default" || unlocked.includes(themeName);
        if (isUnlocked && themeName !== currentTheme) {
            setPreviewTheme(themeName);
            document.documentElement.setAttribute('data-theme', themeName);
        }
    };

    const clearPreview = (skipThemeRestore = false) => {
        setPreviewTheme(null);

        // If skipThemeRestore is true, don't restore the previous theme
        // This is useful when loading a theme for editing
        if (skipThemeRestore) {
            return;
        }

        // Check if there's an active custom theme
        const activeCustomTheme = localStorage.getItem('activeCustomTheme');
        if (activeCustomTheme) {
            try {
                const customTheme = JSON.parse(activeCustomTheme);
                if (customTheme.data) {
                    applySavedCustomTheme(customTheme.data);
                    return;
                }
            } catch (err) {
                console.error('Error parsing active custom theme:', err);
            }
        }

        // Otherwise, apply the regular theme
        if (currentTheme) {
            document.documentElement.setAttribute('data-theme', currentTheme);
            // Clear any inline styles from custom theme preview
            document.documentElement.removeAttribute('style');
        }
    };

    const handleApplyTheme = async (themeName) => {
        // Handle custom theme application
        if (themeName && themeName.startsWith('custom-')) {
            const themeId = themeName.replace('custom-', '');
            const customThemeItem = savedCustomThemes.find(t => t._id === themeId);
            if (customThemeItem && customThemeItem.themeData) {
                handleApplyCustomTheme(customThemeItem.themeData, customThemeItem.name, customThemeItem._id);
                return;
            } else {
                showError('Custom theme not found. Please try again.');
                return;
            }
        }

        const requiredLevel = themeLevels[themeName];
        const isUnlocked = themeName === "Default" || unlocked.includes(themeName);

        if (!isUnlocked) {
            showError(`This theme unlocks at Level ${requiredLevel}. You are currently Level ${userLevel}. Keep leveling up!`);
            return;
        }

        try {
            // Clear custom theme when applying a regular theme
            localStorage.removeItem('activeCustomTheme');
            localStorage.removeItem('customThemeId');

            const userId = userFromStorage?._id;
            if (userId) {
                await axios.post(`/api/users/${userId}/theme`, { theme: themeName });
            }

            // Reset CSS variables to default
            const root = document.documentElement;
            root.removeAttribute('style'); // Remove inline styles

            changeTheme(themeName);
            setIsOpen(false);
            setPreviewTheme(null);
            showSuccess(`🎨 ${formatThemeName(themeName)} theme applied successfully!`);

            // Reload to ensure theme is fully applied
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (err) {
            console.error("Error applying theme:", err);
            const errorMsg = err.response?.data?.error || `Failed to apply theme "${themeName}". Please try again.`;
            showError(errorMsg);
        }
    };

    // Apply custom theme preview - All variables
    const applyCustomPreview = (themeToApply = null) => {
        const root = document.documentElement;
        const theme = themeToApply || customTheme;

        // Accent colors
        root.style.setProperty('--accent', theme.accent);
        root.style.setProperty('--accent2', theme.accent2);
        root.style.setProperty('--accent-light', theme.accentLight);
        root.style.setProperty('--accent-hover', theme.accentHover);

        // Background colors
        root.style.setProperty('--bg-dark', theme.bgDark);
        root.style.setProperty('--bg-secondary', theme.bgSecondary);
        root.style.setProperty('--bg-tertiary', theme.bgTertiary);

        // Card colors
        root.style.setProperty('--card-bg', theme.cardBg);
        root.style.setProperty('--card-bg-glass', theme.cardBgGlass);
        root.style.setProperty('--card-border', theme.cardBorder);

        // Text colors
        root.style.setProperty('--text-color', theme.textColor);
        root.style.setProperty('--text-light', theme.textLight);
        root.style.setProperty('--text-muted', theme.textMuted);
        root.style.setProperty('--text-disabled', theme.textDisabled);

        // Status colors
        root.style.setProperty('--success', theme.success);
        root.style.setProperty('--success-light', theme.successLight);
        root.style.setProperty('--warning', theme.warning);
        root.style.setProperty('--warning-light', theme.warningLight);
        root.style.setProperty('--danger', theme.danger);
        root.style.setProperty('--danger-light', theme.dangerLight);
        root.style.setProperty('--info', theme.info);
        root.style.setProperty('--info-light', theme.infoLight);

        // Border colors
        root.style.setProperty('--border-color', theme.borderColor);
        root.style.setProperty('--border-focus', theme.borderFocus);

        // Glassmorphism
        root.style.setProperty('--glass-bg', theme.glassBg);
        root.style.setProperty('--glass-border', theme.glassBorder);

        // Shadow
        root.style.setProperty('--shadow', theme.shadow);

        // Sidebar colors
        root.style.setProperty('--color-sidebar-gradient-start', theme.colorSidebarGradientStart);
        root.style.setProperty('--color-sidebar-gradient-end', theme.colorSidebarGradientEnd);
        root.style.setProperty('--color-scrollbar-thumb', theme.colorScrollbarThumb);
        root.style.setProperty('--color-scrollbar-track', theme.colorScrollbarTrack);
        root.style.setProperty('--color-sidebar-shadow', theme.colorSidebarShadow);

        // Logout colors
        root.style.setProperty('--color-logout-bg', theme.colorLogoutBg);
        root.style.setProperty('--color-logout-hover-bg', theme.colorLogoutHoverBg);
        root.style.setProperty('--color-logout-text', theme.colorLogoutText);

        // Toggle colors
        root.style.setProperty('--color-toggle-bg', theme.colorToggleBg);
        root.style.setProperty('--color-toggle-hover-bg', theme.colorToggleHoverBg);
        root.style.setProperty('--color-toggle-text', theme.colorToggleText);

        // Close button colors
        root.style.setProperty('--color-close-btn', theme.colorCloseBtn);
        root.style.setProperty('--color-close-btn-hover', theme.colorCloseBtnHover);

        // Style options
        root.style.setProperty('--radius-xl', theme.borderRadius);
    };

    // Apply saved custom theme - All variables
    const applySavedCustomTheme = (themeData) => {
        const root = document.documentElement;

        // Map theme data keys to CSS variables
        const cssVarMap = {
            // Accent colors
            accent: '--accent',
            accent2: '--accent2',
            accentLight: '--accent-light',
            accentHover: '--accent-hover',

            // Background colors
            bgDark: '--bg-dark',
            bgSecondary: '--bg-secondary',
            bgTertiary: '--bg-tertiary',

            // Card colors
            cardBg: '--card-bg',
            cardBgGlass: '--card-bg-glass',
            cardBorder: '--card-border',

            // Text colors
            textColor: '--text-color',
            textLight: '--text-light',
            textMuted: '--text-muted',
            textDisabled: '--text-disabled',

            // Status colors
            success: '--success',
            successLight: '--success-light',
            warning: '--warning',
            warningLight: '--warning-light',
            danger: '--danger',
            dangerLight: '--danger-light',
            info: '--info',
            infoLight: '--info-light',

            // Border colors
            borderColor: '--border-color',
            borderFocus: '--border-focus',

            // Glassmorphism
            glassBg: '--glass-bg',
            glassBorder: '--glass-border',

            // Shadow
            shadow: '--shadow',

            // Sidebar colors
            colorSidebarGradientStart: '--color-sidebar-gradient-start',
            colorSidebarGradientEnd: '--color-sidebar-gradient-end',
            colorScrollbarThumb: '--color-scrollbar-thumb',
            colorScrollbarTrack: '--color-scrollbar-track',
            colorSidebarShadow: '--color-sidebar-shadow',

            // Logout colors
            colorLogoutBg: '--color-logout-bg',
            colorLogoutHoverBg: '--color-logout-hover-bg',
            colorLogoutText: '--color-logout-text',

            // Toggle colors
            colorToggleBg: '--color-toggle-bg',
            colorToggleHoverBg: '--color-toggle-hover-bg',
            colorToggleText: '--color-toggle-text',

            // Close button colors
            colorCloseBtn: '--color-close-btn',
            colorCloseBtnHover: '--color-close-btn-hover',

            // Style options
            borderRadius: '--radius-xl'
        };

        Object.keys(themeData).forEach(key => {
            if (cssVarMap[key]) {
                root.style.setProperty(cssVarMap[key], themeData[key]);
            }
        });
    };

    // Load custom theme for editing
    const handleLoadCustomTheme = (customThemeData) => {
        // Ensure customThemeData is an object
        if (!customThemeData || typeof customThemeData !== 'object') {
            showError('Invalid theme data. Please try again.');
            return;
        }

        // Clear any active preview first
        setPreviewTheme(null);

        // Remove data-theme attribute to ensure custom theme colors apply
        document.documentElement.removeAttribute('data-theme');

        // Ensure all required fields are present with defaults
        const loadedTheme = {
            // Accent colors
            accent: customThemeData.accent || '#6366f1',
            accent2: customThemeData.accent2 || '#8b5cf6',
            accentLight: customThemeData.accentLight || 'rgba(99, 102, 241, 0.15)',
            accentHover: customThemeData.accentHover || '#5855eb',

            // Background colors
            bgDark: customThemeData.bgDark || '#0a0e1a',
            bgSecondary: customThemeData.bgSecondary || '#141b2e',
            bgTertiary: customThemeData.bgTertiary || '#1a2332',

            // Card colors
            cardBg: customThemeData.cardBg || 'rgba(26, 35, 50, 0.85)',
            cardBgGlass: customThemeData.cardBgGlass || 'rgba(255, 255, 255, 0.03)',
            cardBorder: customThemeData.cardBorder || 'rgba(255, 255, 255, 0.08)',

            // Text colors
            textColor: customThemeData.textColor || '#f1f5f9',
            textLight: customThemeData.textLight || '#ffffff',
            textMuted: customThemeData.textMuted || '#94a3b8',
            textDisabled: customThemeData.textDisabled || '#64748b',

            // Status colors
            success: customThemeData.success || '#10b981',
            successLight: customThemeData.successLight || 'rgba(16, 185, 129, 0.15)',
            warning: customThemeData.warning || '#f59e0b',
            warningLight: customThemeData.warningLight || 'rgba(245, 158, 11, 0.15)',
            danger: customThemeData.danger || '#ef4444',
            dangerLight: customThemeData.dangerLight || 'rgba(239, 68, 68, 0.15)',
            info: customThemeData.info || '#06b6d4',
            infoLight: customThemeData.infoLight || 'rgba(6, 182, 212, 0.15)',

            // Border colors
            borderColor: customThemeData.borderColor || 'rgba(255, 255, 255, 0.1)',
            borderFocus: customThemeData.borderFocus || '#6366f1',

            // Glassmorphism
            glassBg: customThemeData.glassBg || 'rgba(255, 255, 255, 0.05)',
            glassBorder: customThemeData.glassBorder || 'rgba(255, 255, 255, 0.1)',

            // Shadow
            shadow: customThemeData.shadow || 'rgba(0, 0, 0, 0.4)',

            // Sidebar colors
            colorSidebarGradientStart: customThemeData.colorSidebarGradientStart || '#0a0e1a',
            colorSidebarGradientEnd: customThemeData.colorSidebarGradientEnd || '#141b2e',
            colorScrollbarThumb: customThemeData.colorScrollbarThumb || '#6366f1',
            colorScrollbarTrack: customThemeData.colorScrollbarTrack || '#141b2e',
            colorSidebarShadow: customThemeData.colorSidebarShadow || 'rgba(0, 0, 0, 0.25)',

            // Logout colors
            colorLogoutBg: customThemeData.colorLogoutBg || '#ef4444',
            colorLogoutHoverBg: customThemeData.colorLogoutHoverBg || '#dc2626',
            colorLogoutText: customThemeData.colorLogoutText || '#ffffff',

            // Toggle colors
            colorToggleBg: customThemeData.colorToggleBg || 'rgba(255, 255, 255, 0.05)',
            colorToggleHoverBg: customThemeData.colorToggleHoverBg || 'rgba(99, 102, 241, 0.15)',
            colorToggleText: customThemeData.colorToggleText || '#ffffff',

            // Close button colors
            colorCloseBtn: customThemeData.colorCloseBtn || '#f1f5f9',
            colorCloseBtnHover: customThemeData.colorCloseBtnHover || '#ef4444',

            // Style options
            borderRadius: customThemeData.borderRadius || '1rem',
            shadowIntensity: customThemeData.shadowIntensity || 'medium'
        };

        setCustomTheme(loadedTheme);

        // Apply preview immediately with the loaded theme data (don't wait for state update)
        // This ensures colors are applied even if React state hasn't updated yet
        applyCustomPreview(loadedTheme);

        setActiveTab('customize');

        // Force a small delay to ensure state updates and DOM changes are applied
        setTimeout(() => {
            // Scroll to top of customize tab if needed
            const customizeTab = document.querySelector('.customize-tab');
            if (customizeTab) {
                customizeTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            showSuccess('Custom theme loaded! You can now edit it.');
        }, 100);
    };

    // Apply custom theme
    const handleApplyCustomTheme = async (customThemeData, themeName, themeId) => {
        try {
            // Apply the custom theme immediately
            applySavedCustomTheme(customThemeData);

            // Store custom theme data and identifier in localStorage
            localStorage.setItem('activeCustomTheme', JSON.stringify({
                id: themeId,
                name: themeName,
                data: customThemeData
            }));

            // Update user's selected theme to indicate custom theme is active
            const userId = userFromStorage?._id;
            if (userId) {
                // We'll use a special identifier "custom" to indicate a custom theme is active
                await axios.post(`/api/users/${userId}/theme`, { theme: 'Default' });
                // Store the custom theme ID separately
                localStorage.setItem('customThemeId', themeId);
            }

            // Update local user storage
            const user = JSON.parse(localStorage.getItem("user"));
            if (user) {
                user.selectedTheme = 'Default'; // Set to default, custom will override
                user.customThemeId = themeId;
                localStorage.setItem("user", JSON.stringify(user));
            }

            setIsOpen(false);
            setPreviewTheme(null);
            showSuccess(`🎨 Custom theme "${themeName}" applied successfully!`);

            // Reload page to ensure theme persists
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (err) {
            console.error("Error applying custom theme:", err);
            showError('Failed to apply custom theme. Please try again.');
        }
    };

    // Delete custom theme
    const handleDeleteCustomTheme = async (themeId, themeName) => {
        if (!window.confirm(`Are you sure you want to delete "${themeName}"?`)) {
            return;
        }

        try {
            const userId = userFromStorage?._id;
            if (!userId) {
                showError('User not found. Please log in again.');
                return;
            }

            // Check if this is the currently active custom theme
            const activeCustomTheme = localStorage.getItem('activeCustomTheme');
            let isActiveTheme = false;
            if (activeCustomTheme) {
                try {
                    const customTheme = JSON.parse(activeCustomTheme);
                    if (customTheme.id === themeId) {
                        isActiveTheme = true;
                    }
                } catch (err) {
                    console.error('Error parsing active custom theme:', err);
                }
            }

            await axios.delete(`/api/users/${userId}/custom-theme`, {
                data: { themeId }
            });

            // If this was the active theme, switch to default
            if (isActiveTheme) {
                // Clear custom theme from localStorage
                localStorage.removeItem('activeCustomTheme');
                localStorage.removeItem('customThemeId');

                // Clear inline styles
                document.documentElement.removeAttribute('style');

                // Apply default theme
                try {
                    await axios.post(`/api/users/${userId}/theme`, { theme: 'Default' });
                    changeTheme('Default');

                    // Update local user storage
                    const user = JSON.parse(localStorage.getItem("user"));
                    if (user) {
                        user.selectedTheme = 'Default';
                        delete user.customThemeId;
                        localStorage.setItem("user", JSON.stringify(user));
                    }

                    showSuccess(`Custom theme "${themeName}" deleted and switched to Default theme!`);
                } catch (themeErr) {
                    console.error("Error switching to default theme:", themeErr);
                    showSuccess(`Custom theme "${themeName}" deleted successfully!`);
                }
            } else {
                showSuccess(`Custom theme "${themeName}" deleted successfully!`);
            }

            // Refresh custom themes list
            const customRes = await axios.get(`/api/users/${userId}/custom-themes`);
            setSavedCustomThemes(customRes.data.customThemes || []);
            setMaxCustomThemes(customRes.data.maxCustomThemes || 0);
            setCanCreateMore(customRes.data.canCreateMore || false);

            // Reload page if active theme was deleted to ensure clean state
            if (isActiveTheme) {
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        } catch (err) {
            console.error("Error deleting custom theme:", err);
            const errorMsg = err.response?.data?.error || 'Failed to delete custom theme. Please try again.';
            showError(errorMsg);
        }
    };

    const resetCustomPreview = () => {
        if (currentTheme) {
            document.documentElement.setAttribute('data-theme', currentTheme);
        }
    };

    const handleSaveCustomTheme = async () => {
        if (!customThemeName.trim()) {
            showError('Please enter a name for your custom theme');
            return;
        }

        // Check level lock
        const maxAllowed = Math.floor(userLevel / 5);
        if (savedCustomThemes.length >= maxAllowed) {
            showError(`You can only create ${maxAllowed} custom theme(s) at Level ${userLevel}. Level up to create more! (1 custom theme per 5 levels)`);
            return;
        }

        try {
            const userId = userFromStorage?._id;
            if (!userId) {
                showError('User not found. Please log in again.');
                return;
            }

            const response = await axios.post(`/api/users/${userId}/custom-theme`, {
                name: customThemeName.trim(),
                themeData: customTheme
            });

            // Refresh user data and custom themes list
            const userRes = await axios.get(`/api/users/${userId}`);
            if (userRes.data.level) {
                const updatedUser = { ...userFromStorage, level: userRes.data.level };
                setUserFromStorage(updatedUser);
                localStorage.setItem("user", JSON.stringify(updatedUser));
            }

            const customRes = await axios.get(`/api/users/${userId}/custom-themes`);
            setSavedCustomThemes(customRes.data.customThemes || []);
            setMaxCustomThemes(customRes.data.maxCustomThemes || 0);
            setCanCreateMore(customRes.data.canCreateMore || false);

            showSuccess(`🎨 Custom theme "${customThemeName}" saved successfully!`);
            setCustomThemeName('');
            resetCustomPreview();
        } catch (err) {
            console.error("Error saving custom theme:", err);
            const errorMsg = err.response?.data?.error || 'Failed to save custom theme. Please try again.';
            showError(errorMsg);
        }
    };

    return (
        <>
            <motion.button
                className="theme-selector-trigger"
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                🎨 Customize Theme
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="theme-selector-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            setIsOpen(false);
                            clearPreview();
                            resetCustomPreview();
                        }}
                    >
                        <motion.div
                            className="theme-selector-modal"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>🎨 Customize Your Theme</h2>
                                <button
                                    className="close-btn"
                                    onClick={() => {
                                        setIsOpen(false);
                                        clearPreview();
                                        resetCustomPreview();
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="modal-tabs">
                                <button
                                    className={`modal-tab ${activeTab === 'select' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('select');
                                        resetCustomPreview();
                                    }}
                                >
                                    <span className="tab-icon">🎨</span>
                                    Select Theme
                                </button>
                                <button
                                    className={`modal-tab ${activeTab === 'customize' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('customize');
                                        applyCustomPreview();
                                    }}
                                >
                                    <span className="tab-icon">✨</span>
                                    Customize Theme
                                </button>
                            </div>

                            {/* Select Theme Tab */}
                            {activeTab === 'select' && (
                                <div className="tab-content select-tab-content">
                                    <div className="theme-controls">
                                        <div className="search-bar">
                                            <input
                                                type="text"
                                                placeholder="Search themes..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                            <span className="search-icon">🔍</span>
                                        </div>

                                        <div className="category-tabs">
                                            {Object.entries(themeCategories).map(([key, category]) => (
                                                <button
                                                    key={key}
                                                    className={`category-tab ${selectedCategory === key ? 'active' : ''}`}
                                                    onClick={() => setSelectedCategory(key)}
                                                >
                                                    <span className="tab-icon">{category.icon}</span>
                                                    {category.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Themes Section */}
                                    {savedCustomThemes.length > 0 && (
                                        <div className="custom-themes-section">
                                            <h3 className="section-header">
                                                <span className="section-icon">✨</span>
                                                Your Custom Themes
                                            </h3>
                                            <div className="custom-themes-grid">
                                                {savedCustomThemes.map((customThemeItem) => {
                                                    // Ensure themeData exists and is an object
                                                    const themeData = (customThemeItem.themeData && typeof customThemeItem.themeData === 'object')
                                                        ? customThemeItem.themeData
                                                        : {};

                                                    const colors = [
                                                        themeData.accent || '#6366f1',
                                                        themeData.accent2 || '#8b5cf6',
                                                        themeData.bgDark || '#0a0e1a'
                                                    ];

                                                    return (
                                                        <motion.div
                                                            key={customThemeItem._id}
                                                            className="theme-card custom-theme-card"
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            onMouseEnter={() => {
                                                                applySavedCustomTheme(themeData);
                                                                setPreviewTheme(`custom-${customThemeItem._id}`);
                                                            }}
                                                            onMouseLeave={() => {
                                                                clearPreview();
                                                            }}
                                                        >
                                                            <div className="theme-preview">
                                                                <div className="color-swatches">
                                                                    {colors.map((color, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            className="color-swatch"
                                                                            style={{ backgroundColor: color }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <div className="custom-badge">
                                                                    <span>✨</span>
                                                                    <span>Custom</span>
                                                                </div>
                                                            </div>

                                                            <div className="theme-info">
                                                                <h3>{customThemeItem.name}</h3>
                                                                <p>Created at Level {customThemeItem.levelCreated}</p>
                                                            </div>

                                                            <div className="theme-actions">
                                                                <button
                                                                    className="apply-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleApplyCustomTheme(themeData, customThemeItem.name, customThemeItem._id);
                                                                    }}
                                                                >
                                                                    Apply Theme
                                                                </button>
                                                                <div className="custom-theme-actions">
                                                                    <button
                                                                        className="load-btn"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            e.preventDefault();
                                                                            if (!themeData || typeof themeData !== 'object') {
                                                                                showError('Theme data is invalid.');
                                                                                return;
                                                                            }
                                                                            handleLoadCustomTheme(themeData);
                                                                        }}
                                                                        title="Edit theme"
                                                                    >
                                                                        ✏️ Edit
                                                                    </button>
                                                                    <button
                                                                        className="delete-btn"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteCustomTheme(customThemeItem._id, customThemeItem.name);
                                                                        }}
                                                                        title="Delete theme"
                                                                    >
                                                                        🗑️ Delete
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Regular Themes Section */}
                                    <div className="themes-grid">
                                        {filteredThemes.length === 0 ? (
                                            <div className="no-themes">
                                                <div className="no-themes-icon">🔍</div>
                                                <h3>No themes found</h3>
                                                <p>Try adjusting your search or filter criteria</p>
                                            </div>
                                        ) : (
                                            filteredThemes.map((themeName) => {
                                                const requiredLevel = themeLevels[themeName];
                                                const isUnlocked = themeName === "Default" || unlocked.includes(themeName);
                                                const isCurrent = currentTheme === themeName;
                                                const isPreviewing = previewTheme === themeName;
                                                const colors = themeColors[themeName] || ["#6366f1", "#8b5cf6", "#0a0e1a"];
                                                const levelsNeeded = requiredLevel ? Math.max(0, requiredLevel - userLevel) : 0;

                                                return (
                                                    <motion.div
                                                        key={themeName}
                                                        className={`theme-card ${isCurrent ? 'current' : ''} ${isPreviewing ? 'previewing' : ''} ${!isUnlocked ? 'locked' : ''}`}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        onMouseEnter={() => handlePreview(themeName)}
                                                        onMouseLeave={clearPreview}
                                                    >
                                                        {!isUnlocked && (
                                                            <div className="lock-overlay">
                                                                <div className="lock-icon">🔒</div>
                                                                <div className="lock-text">Locked</div>
                                                            </div>
                                                        )}

                                                        <div className="theme-preview">
                                                            <div className="color-swatches">
                                                                {colors.map((color, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="color-swatch"
                                                                        style={{ backgroundColor: color }}
                                                                    />
                                                                ))}
                                                            </div>
                                                            {isCurrent && (
                                                                <div className="current-indicator">
                                                                    <span className="sparkle">✨</span>
                                                                    <span>Current</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="theme-info">
                                                            <h3>{formatThemeName(themeName)}</h3>
                                                            <p>{themeDescriptions[themeName]}</p>

                                                            {!isUnlocked && requiredLevel && (
                                                                <div className="unlock-info">
                                                                    <div className="level-requirement">
                                                                        <span className="level-icon">📊</span>
                                                                        <span>Unlocks at Level {requiredLevel}</span>
                                                                    </div>
                                                                    {userLevel < requiredLevel && (
                                                                        <div className="progress-info">
                                                                            <span>{levelsNeeded} more level{levelsNeeded !== 1 ? 's' : ''} needed</span>
                                                                            <div className="progress-bar">
                                                                                <div
                                                                                    className="progress-fill"
                                                                                    style={{ width: `${Math.min(100, (userLevel / requiredLevel) * 100)}%` }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="theme-actions">
                                                            {isCurrent ? (
                                                                <button className="current-btn" disabled>
                                                                    <span className="sparkle">✨</span>
                                                                    Current Theme
                                                                </button>
                                                            ) : isUnlocked ? (
                                                                <button
                                                                    className="apply-btn"
                                                                    onClick={() => handleApplyTheme(themeName)}
                                                                >
                                                                    Apply Theme
                                                                </button>
                                                            ) : (
                                                                <button className="locked-btn" disabled>
                                                                    <span className="lock-icon-small">🔒</span>
                                                                    Locked
                                                                </button>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Customize Theme Tab */}
                            {activeTab === 'customize' && (
                                <div className="tab-content customize-tab">
                                    <div className="customize-header">
                                        <p className="customize-description">
                                            Customize colors, styles, and appearance. Changes apply instantly for preview.
                                        </p>
                                    </div>

                                    <div className="customize-grid">
                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">🎨</span>
                                                Accent Colors
                                            </h3>
                                            <div className="color-picker-group">
                                                <div className="color-picker-item">
                                                    <label>Primary Accent</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.accent)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.accent)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.accent))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, accent: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.accent}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, accent: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Secondary Accent</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.accent2)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.accent2)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.accent2))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, accent2: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.accent2}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, accent2: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">🌑</span>
                                                Background Colors
                                            </h3>
                                            <div className="color-picker-group">
                                                <div className="color-picker-item">
                                                    <label>Dark Background</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.bgDark)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.bgDark)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.bgDark))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, bgDark: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.bgDark}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, bgDark: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Secondary Background</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.bgSecondary)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.bgSecondary)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.bgSecondary))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, bgSecondary: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.bgSecondary}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, bgSecondary: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">📝</span>
                                                Text Colors
                                            </h3>
                                            <div className="color-picker-group">
                                                <div className="color-picker-item">
                                                    <label>Text Color</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.textColor)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.textColor)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.textColor))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, textColor: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.textColor}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, textColor: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Light Text</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.textLight)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.textLight)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.textLight))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, textLight: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.textLight}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, textLight: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Muted Text</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.textMuted)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.textMuted)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.textMuted))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, textMuted: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.textMuted}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, textMuted: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Disabled Text</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.textDisabled)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.textDisabled)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.textDisabled))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, textDisabled: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.textDisabled}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, textDisabled: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">🎨</span>
                                                Card & UI Colors
                                            </h3>
                                            <div className="color-picker-group">
                                                <div className="color-picker-item">
                                                    <label>Tertiary Background</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.bgTertiary)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.bgTertiary)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.bgTertiary))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, bgTertiary: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.bgTertiary}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, bgTertiary: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Card Background</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.cardBg)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.cardBg)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.cardBg))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, cardBg: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.cardBg}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, cardBg: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Card Border</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.cardBorder)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.cardBorder)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.cardBorder))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, cardBorder: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.cardBorder}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, cardBorder: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Card Glass Background</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.cardBgGlass)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.cardBgGlass)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.cardBgGlass))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, cardBgGlass: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.cardBgGlass}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, cardBgGlass: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">🔲</span>
                                                Border Colors
                                            </h3>
                                            <div className="color-picker-group">
                                                <div className="color-picker-item">
                                                    <label>Border Color</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.borderColor)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.borderColor)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.borderColor))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, borderColor: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.borderColor}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, borderColor: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Border Focus</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.borderFocus)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.borderFocus)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.borderFocus))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, borderFocus: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.borderFocus}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, borderFocus: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">✨</span>
                                                Glassmorphism
                                            </h3>
                                            <div className="color-picker-group">
                                                <div className="color-picker-item">
                                                    <label>Glass Background</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.glassBg)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.glassBg)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.glassBg))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, glassBg: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.glassBg}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, glassBg: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Glass Border</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.glassBorder)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.glassBorder)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.glassBorder))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, glassBorder: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.glassBorder}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, glassBorder: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">🌑</span>
                                                Shadow
                                            </h3>
                                            <div className="color-picker-group">
                                                <div className="color-picker-item">
                                                    <label>Shadow Color</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.shadow)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.shadow)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.shadow))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, shadow: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.shadow}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, shadow: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">📋</span>
                                                Sidebar Colors
                                            </h3>
                                            <div className="color-picker-group">
                                                <div className="color-picker-item">
                                                    <label>Sidebar Gradient Start</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.colorSidebarGradientStart)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.colorSidebarGradientStart)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.colorSidebarGradientStart))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, colorSidebarGradientStart: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.colorSidebarGradientStart}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, colorSidebarGradientStart: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Sidebar Gradient End</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.colorSidebarGradientEnd)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.colorSidebarGradientEnd)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.colorSidebarGradientEnd))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, colorSidebarGradientEnd: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.colorSidebarGradientEnd}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, colorSidebarGradientEnd: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Scrollbar Thumb</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.colorScrollbarThumb)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.colorScrollbarThumb)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.colorScrollbarThumb))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, colorScrollbarThumb: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.colorScrollbarThumb}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, colorScrollbarThumb: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Scrollbar Track</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.colorScrollbarTrack)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.colorScrollbarTrack)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.colorScrollbarTrack))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, colorScrollbarTrack: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.colorScrollbarTrack}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, colorScrollbarTrack: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">🚪</span>
                                                Logout Button Colors
                                            </h3>
                                            <div className="color-picker-group">
                                                <div className="color-picker-item">
                                                    <label>Logout Background</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.colorLogoutBg)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.colorLogoutBg)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.colorLogoutBg))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, colorLogoutBg: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.colorLogoutBg}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, colorLogoutBg: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Logout Hover Background</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.colorLogoutHoverBg)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.colorLogoutHoverBg)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.colorLogoutHoverBg))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, colorLogoutHoverBg: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.colorLogoutHoverBg}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, colorLogoutHoverBg: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Logout Text</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.colorLogoutText)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.colorLogoutText)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.colorLogoutText))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, colorLogoutText: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.colorLogoutText}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, colorLogoutText: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">🔄</span>
                                                Toggle Button Colors
                                            </h3>
                                            <div className="color-picker-group">
                                                <div className="color-picker-item">
                                                    <label>Toggle Background</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.colorToggleBg)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.colorToggleBg)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.colorToggleBg))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, colorToggleBg: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.colorToggleBg}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, colorToggleBg: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Toggle Hover Background</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.colorToggleHoverBg)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.colorToggleHoverBg)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.colorToggleHoverBg))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, colorToggleHoverBg: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.colorToggleHoverBg}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, colorToggleHoverBg: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Toggle Text</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.colorToggleText)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.colorToggleText)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.colorToggleText))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, colorToggleText: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.colorToggleText}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, colorToggleText: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">✕</span>
                                                Close Button Colors
                                            </h3>
                                            <div className="color-picker-group">
                                                <div className="color-picker-item">
                                                    <label>Close Button Color</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.colorCloseBtn)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.colorCloseBtn)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.colorCloseBtn))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, colorCloseBtn: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.colorCloseBtn}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, colorCloseBtn: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Close Button Hover</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.colorCloseBtnHover)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.colorCloseBtnHover)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.colorCloseBtnHover))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, colorCloseBtnHover: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.colorCloseBtnHover}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, colorCloseBtnHover: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">✨</span>
                                                Accent Variants
                                            </h3>
                                            <div className="color-picker-group">
                                                <div className="color-picker-item">
                                                    <label>Accent Light</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.accentLight)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.accentLight)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.accentLight))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, accentLight: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.accentLight}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, accentLight: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Accent Hover</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.accentHover)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.accentHover)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.accentHover))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, accentHover: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.accentHover}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, accentHover: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">🎨</span>
                                                Status Colors
                                            </h3>
                                            <div className="color-picker-group">
                                                <div className="color-picker-item">
                                                    <label>Success</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.success)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.success)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.success))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, success: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.success}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, success: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Warning</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.warning)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.warning)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.warning))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, warning: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.warning}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, warning: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Danger</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.danger)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.danger)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.danger))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, danger: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.danger}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, danger: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Info</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.info)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.info)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.info))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, info: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.info}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, info: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">💡</span>
                                                Status Color Variants
                                            </h3>
                                            <div className="color-picker-group">
                                                <div className="color-picker-item">
                                                    <label>Success Light</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.successLight)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.successLight)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.successLight))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, successLight: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.successLight}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, successLight: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Warning Light</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.warningLight)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.warningLight)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.warningLight))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, warningLight: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.warningLight}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, warningLight: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Danger Light</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.dangerLight)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.dangerLight)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.dangerLight))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, dangerLight: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.dangerLight}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, dangerLight: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="color-picker-item">
                                                    <label>Info Light</label>
                                                    <div className="color-input-wrapper">
                                                        <input
                                                            type="color"
                                                            value={rgbaToHex(customTheme.infoLight)}
                                                            onChange={(e) => {
                                                                const newValue = isRgba(customTheme.infoLight)
                                                                    ? hexToRgba(e.target.value, getAlpha(customTheme.infoLight))
                                                                    : e.target.value;
                                                                setCustomTheme({ ...customTheme, infoLight: newValue });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-picker"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={customTheme.infoLight}
                                                            onChange={(e) => {
                                                                setCustomTheme({ ...customTheme, infoLight: e.target.value });
                                                                applyCustomPreview();
                                                            }}
                                                            className="color-text-input"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="customize-section">
                                            <h3 className="section-title">
                                                <span className="section-icon">🎯</span>
                                                Style Options
                                            </h3>
                                            <div className="style-options">
                                                <div className="style-option-item">
                                                    <label>Border Radius</label>
                                                    <select
                                                        value={customTheme.borderRadius}
                                                        onChange={(e) => {
                                                            setCustomTheme({ ...customTheme, borderRadius: e.target.value });
                                                            applyCustomPreview();
                                                        }}
                                                        className="style-select"
                                                    >
                                                        <option value="0.5rem">Small</option>
                                                        <option value="0.75rem">Medium</option>
                                                        <option value="1rem">Large</option>
                                                        <option value="1.5rem">Extra Large</option>
                                                        <option value="2rem">Round</option>
                                                    </select>
                                                </div>
                                                <div className="style-option-item">
                                                    <label>Shadow Intensity</label>
                                                    <select
                                                        value={customTheme.shadowIntensity}
                                                        onChange={(e) => {
                                                            setCustomTheme({ ...customTheme, shadowIntensity: e.target.value });
                                                            applyCustomPreview();
                                                        }}
                                                        className="style-select"
                                                    >
                                                        <option value="none">None</option>
                                                        <option value="small">Small</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="large">Large</option>
                                                        <option value="extra-large">Extra Large</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="customize-section">
                                        <h3 className="section-title">
                                            <span className="section-icon">📝</span>
                                            Theme Name
                                        </h3>
                                        <div className="theme-name-input-wrapper">
                                            <input
                                                type="text"
                                                placeholder="Enter a name for your custom theme..."
                                                value={customThemeName}
                                                onChange={(e) => setCustomThemeName(e.target.value)}
                                                className="theme-name-input"
                                                maxLength={50}
                                            />
                                        </div>
                                        <div className="level-lock-info">
                                            <div className="lock-info-text">
                                                <span className="lock-icon">🔒</span>
                                                <span>
                                                    Level {userLevel}: You can create <strong>{maxCustomThemes}</strong> custom theme(s)
                                                    {savedCustomThemes.length > 0 && ` (${savedCustomThemes.length} created, ${Math.max(0, maxCustomThemes - savedCustomThemes.length)} available)`}
                                                    {savedCustomThemes.length === 0 && ` (${maxCustomThemes} available)`}
                                                    {!canCreateMore && savedCustomThemes.length >= maxCustomThemes && ` - Level up to create more!`}
                                                </span>
                                            </div>
                                            {savedCustomThemes.length > 0 && (
                                                <div className="saved-themes-list">
                                                    <strong>Your Custom Themes:</strong>
                                                    <ul>
                                                        {savedCustomThemes.map((theme, idx) => (
                                                            <li key={theme._id || idx}>
                                                                {theme.name} (Level {theme.levelCreated})
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="customize-actions">
                                        <button
                                            className="preview-btn"
                                            onClick={applyCustomPreview}
                                        >
                                            👁️ Preview Changes
                                        </button>
                                        <button
                                            className="reset-btn"
                                            onClick={() => {
                                                resetCustomPreview();
                                                setCustomTheme({
                                                    // Accent colors
                                                    accent: '#6366f1',
                                                    accent2: '#8b5cf6',
                                                    accentLight: 'rgba(99, 102, 241, 0.15)',
                                                    accentHover: '#5855eb',

                                                    // Background colors
                                                    bgDark: '#0a0e1a',
                                                    bgSecondary: '#141b2e',
                                                    bgTertiary: '#1a2332',

                                                    // Card colors
                                                    cardBg: 'rgba(26, 35, 50, 0.85)',
                                                    cardBgGlass: 'rgba(255, 255, 255, 0.03)',
                                                    cardBorder: 'rgba(255, 255, 255, 0.08)',

                                                    // Text colors
                                                    textColor: '#f1f5f9',
                                                    textLight: '#ffffff',
                                                    textMuted: '#94a3b8',
                                                    textDisabled: '#64748b',

                                                    // Status colors
                                                    success: '#10b981',
                                                    successLight: 'rgba(16, 185, 129, 0.15)',
                                                    warning: '#f59e0b',
                                                    warningLight: 'rgba(245, 158, 11, 0.15)',
                                                    danger: '#ef4444',
                                                    dangerLight: 'rgba(239, 68, 68, 0.15)',
                                                    info: '#06b6d4',
                                                    infoLight: 'rgba(6, 182, 212, 0.15)',

                                                    // Border colors
                                                    borderColor: 'rgba(255, 255, 255, 0.1)',
                                                    borderFocus: '#6366f1',

                                                    // Glassmorphism
                                                    glassBg: 'rgba(255, 255, 255, 0.05)',
                                                    glassBorder: 'rgba(255, 255, 255, 0.1)',

                                                    // Shadow
                                                    shadow: 'rgba(0, 0, 0, 0.4)',

                                                    // Sidebar colors
                                                    colorSidebarGradientStart: '#0a0e1a',
                                                    colorSidebarGradientEnd: '#141b2e',
                                                    colorScrollbarThumb: '#6366f1',
                                                    colorScrollbarTrack: '#141b2e',
                                                    colorSidebarShadow: 'rgba(0, 0, 0, 0.25)',

                                                    // Logout colors
                                                    colorLogoutBg: '#ef4444',
                                                    colorLogoutHoverBg: '#dc2626',
                                                    colorLogoutText: '#ffffff',

                                                    // Toggle colors
                                                    colorToggleBg: 'rgba(255, 255, 255, 0.05)',
                                                    colorToggleHoverBg: 'rgba(99, 102, 241, 0.15)',
                                                    colorToggleText: '#ffffff',

                                                    // Close button colors
                                                    colorCloseBtn: '#f1f5f9',
                                                    colorCloseBtnHover: '#ef4444',

                                                    // Style options
                                                    borderRadius: '1rem',
                                                    shadowIntensity: 'medium'
                                                });
                                            }}
                                        >
                                            🔄 Reset
                                        </button>
                                        <button
                                            className={`save-btn ${!canCreateMore ? 'disabled' : ''}`}
                                            onClick={handleSaveCustomTheme}
                                            disabled={!canCreateMore || !customThemeName.trim()}
                                            title={!canCreateMore ? `You can only create ${maxCustomThemes} custom theme(s) at Level ${userLevel}` : ''}
                                        >
                                            💾 Save Custom Theme
                                            {!canCreateMore && ` (Max: ${maxCustomThemes})`}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {previewTheme && previewTheme !== currentTheme && activeTab === 'select' && (
                                <div className="preview-notice">
                                    <div className="preview-info">
                                        <span className="preview-icon">👁️</span>
                                        <span className="preview-text">
                                            Previewing: <strong>{formatThemeName(previewTheme)}</strong>
                                        </span>
                                    </div>
                                    <button
                                        className="apply-preview-btn"
                                        onClick={() => handleApplyTheme(previewTheme)}
                                    >
                                        Apply This Theme
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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

export default AdvancedThemeSelector;
