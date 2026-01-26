import React, { useEffect, useState, useContext, useMemo } from "react";
import { ThemeContext } from "../context/ThemeContext";
import axios from "../utils/axios";
import "./ThemePage.css";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

const ThemePage = () => {
    const { theme: currentTheme, changeTheme } = useContext(ThemeContext);
    const [unlocked, setUnlocked] = useState([]);
    const [userFromStorage, setUserFromStorage] = useState(() => JSON.parse(localStorage.getItem("user")));
    const userId = userFromStorage?._id;
    const userLevel = userFromStorage?.level || 1;

    // Notification system
    const { notification, showSuccess, showError, hideNotification } = useNotification();

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            if (searchQuery) {
                setSearchQuery("");
            }
        },
        'Ctrl+F': (e) => {
            // Only prevent browser's find dialog if we have a search input on the page
            const searchInput = document.querySelector('.theme-search-input');
            if (searchInput) {
                e.preventDefault();
                e.stopPropagation();
                searchInput.focus();
                // Select all text for easy replacement
                if (searchInput.select) {
                    searchInput.select();
                }
            }
            // If no search input, let browser's default Ctrl+F work
        },
    }, [searchQuery]);

    useEffect(() => {
        const fetchUser = async () => {
            const latestUser = JSON.parse(localStorage.getItem("user"));
            setUserFromStorage(latestUser);
            const latestUserId = latestUser?._id;
            if (!latestUserId) {
                showError('Please log in to access themes');
                return;
            }
            try {
                const res = await axios.get(`/api/users/${latestUserId}`);
                setUnlocked(res.data.unlockedThemes || []);
            } catch (err) {
                console.error("Error fetching themes:", err);
            }
        };
        fetchUser();
    }, [showError]);

    const handleApply = async (themeName) => {
        if (!userId) {
            showError('Please log in to change themes');
            return;
        }

        // Check if theme is unlocked
        const requiredLevel = themeLevels[themeName];
        const isUnlocked = themeName === "Default" || unlocked.includes(themeName);

        if (!isUnlocked) {
            showError(`This theme unlocks at Level ${requiredLevel}. You are currently Level ${userLevel}. Keep leveling up!`);
            return;
        }

        try {
            await axios.post(`/api/users/${userId}/theme`, { theme: themeName });
            changeTheme(themeName);
            showSuccess(`Theme "${formatThemeName(themeName)}" applied successfully!`);
        } catch (err) {
            console.error("Error applying theme:", err);
            const errorMsg = err.response?.data?.error || `Failed to apply theme "${themeName}". Please try again.`;
            showError(errorMsg);
        }
    };

    // Preview logic
    const [previewTheme, setPreviewTheme] = useState(null);
    const handlePreview = (themeName) => {
        const requiredLevel = themeLevels[themeName];
        const isUnlocked = themeName === "Default" || unlocked.includes(themeName);
        if (isUnlocked && themeName !== currentTheme) {
            setPreviewTheme(themeName);
            document.documentElement.setAttribute('data-theme', themeName);
        }
    };

    const clearPreview = () => {
        setPreviewTheme(null);
        if (currentTheme) {
            document.documentElement.setAttribute('data-theme', currentTheme);
        }
    };

    // Theme data
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

    const themeCategories = {
        "all": { name: "All Themes", icon: "🎨" },
        "standard": { name: "Standard", icon: "⭐", themes: ["Default", "Light", "Dark"] },
        "modern": { name: "Modern", icon: "🌙", themes: ["material-light", "material-dark", "nord", "tokyo-night", "night-owl"] },
        "nature": { name: "Nature", icon: "🌿", themes: ["Forest", "everforest", "oceanic"] },
        "vibrant": { name: "Vibrant", icon: "✨", themes: ["Neon", "synthwave", "dracula", "monokai", "Sunset"] },
        "retro": { name: "Retro", icon: "📼", themes: ["synthwave", "gruvbox-dark", "gruvbox-light", "solarized-dark", "solarized-light"] },
        "warm": { name: "Warm", icon: "🔥", themes: ["Sunset", "kanagawa", "catppuccin-mocha", "catppuccin-latte", "rose-pine"] },
        "professional": { name: "Professional", icon: "💼", themes: ["github-dark", "github-light", "ayu-light", "one-dark"] }
    };

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

    const allThemeNames = [
        "Default", "Light", "Dark", "Galaxy", "Forest", "Sunset", "Neon",
        "material-light", "material-dark", "dracula", "nord", "solarized-light",
        "solarized-dark", "monokai", "one-dark", "gruvbox-dark", "gruvbox-light",
        "oceanic", "synthwave", "night-owl", "tokyo-night", "ayu-light",
        "catppuccin-mocha", "catppuccin-latte", "rose-pine", "everforest",
        "kanagawa", "github-dark", "github-light"
    ];

    // Theme color previews (for visual swatches)
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

    const formatThemeName = (name) => {
        return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    // Filter themes based on search and category
    const filteredThemes = useMemo(() => {
        let filtered = allThemeNames;

        // Filter by category
        if (selectedCategory !== "all") {
            const categoryThemes = themeCategories[selectedCategory]?.themes || [];
            filtered = filtered.filter(theme => categoryThemes.includes(theme));
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(theme => {
                const name = formatThemeName(theme).toLowerCase();
                const desc = (themeDescriptions[theme] || "").toLowerCase();
                return name.includes(query) || desc.includes(query);
            });
        }

        return filtered;
    }, [searchQuery, selectedCategory]);

    return (
        <div className="themes-page">
            <div className="themes-header">
                <div className="themes-header-content">
                    <h1 className="themes-title">
                        <span className="title-icon">🎨</span>
                        Choose Your Perfect Theme
                    </h1>
                    <p className="themes-subtitle">
                        Customize your QuizNest experience with beautiful themes. Unlock more themes as you level up!
                    </p>
                </div>
            </div>

            <div className="themes-controls">
                <div className="search-container">
                    <div className="search-icon">🔍</div>
                    <input
                        type="text"
                        className="theme-search theme-search-input"
                        placeholder="Search themes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search themes"
                        aria-describedby="theme-search-description"
                    />
                    <span id="theme-search-description" className="sr-only">
                        Search themes by name or category
                    </span>
                </div>

                <div className="category-filters">
                    {Object.entries(themeCategories).map(([key, category]) => (
                        <button
                            key={key}
                            className={`category-btn ${selectedCategory === key ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(key)}
                            aria-label={`Filter themes by ${category.name}`}
                            aria-pressed={selectedCategory === key}
                        >
                            <span className="category-icon">{category.icon}</span>
                            <span className="category-name">{category.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="themes-grid">
                {filteredThemes.length === 0 ? (
                    <div className="no-themes-found">
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
                            <div
                                key={themeName}
                                className={`theme-card ${isCurrent ? 'current' : ''} ${isPreviewing ? 'previewing' : ''} ${!isUnlocked ? 'locked' : ''}`}
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
                                    <h3 className="theme-name">{formatThemeName(themeName)}</h3>
                                    <p className="theme-description">{themeDescriptions[themeName]}</p>

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
                                            aria-label={isUnlocked ? `Apply ${themeName} theme` : `Unlock ${themeName} theme at level ${requiredLevel}`}
                                            onClick={() => handleApply(themeName)}
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
                            </div>
                        );
                    })
                )}
            </div>

            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
                autoClose={notification.autoClose}
            />
        </div>
    );
};

export default ThemePage;
