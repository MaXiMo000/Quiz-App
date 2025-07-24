import React, { useEffect, useState, useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import axios from "../utils/axios";
import "./ThemePage.css";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
const ThemePage = () => {
const { theme: currentTheme, changeTheme } = useContext(ThemeContext);
const [unlocked, setUnlocked] = useState([]);
const [userFromStorage, setUserFromStorage] = useState(() => JSON.parse(localStorage.getItem("user")));
const userId = userFromStorage?._id;

// Notification system
const { notification, showSuccess, showError, hideNotification } = useNotification();

useEffect(() => {
    const fetchUser = async () => {
      // Always re-read user from localStorage on refresh
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

    try {
    // Always save theme to backend (including "Default")
    await axios.post(`/api/users/${userId}/theme`, { theme: themeName });
    changeTheme(themeName);
    showSuccess(`Theme "${themeName}" applied!`);
    } catch (err) {
    console.error("Error applying theme:", err);
    showError(`Failed to apply theme "${themeName}". Please try again.`);
    }
};

// --- Preview logic ---
const [previewTheme, setPreviewTheme] = useState(null);
const handlePreview = (themeName) => {
  setPreviewTheme(themeName);
  if (themeName && themeName !== currentTheme) {
    document.documentElement.setAttribute('data-theme', themeName);
  }
};
const clearPreview = () => {
  setPreviewTheme(null);
  if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }
};

const themeDescriptions = {
    Default:           "Clean, neutral base theme.",
    Dark:              "Sleek dark interface with modern aesthetics.",
    Light:            "Simple and bright with light backgrounds.",
    Galaxy:            "Deep purple & blue starry-night vibe.",
    Forest:            "Rich greens and earthy browns of the woods.",
    Sunset:            "Warm oranges, pinks, and purples at dusk.",
    Neon:              "Vibrant neon on an ultra-dark backdrop.",
    "material-light":  "Material Light: crisp surfaces with bright accents.",
    "material-dark":   "Material Dark: deep tones with purple & teal highlights.",
    dracula:           "Dracula: moody purples and pinks on dark gray.",
    nord:              "Nord: cool, arctic-inspired blues and grays.",
    "solarized-light": "Solarized Light: soft cream background with blue text.",
    "solarized-dark":  "Solarized Dark: teal background with warm yellow accents.",
    monokai:           "Monokai: high-contrast dark theme with vibrant oranges & greens.",
    "one-dark":        "One Dark: Atom's signature dark-blue palette.",
    "gruvbox-dark":    "Gruvbox Dark: rich browns with bright green highlights.",
    "gruvbox-light":   "Gruvbox Light: warm beige with earthy accent colors.",
    oceanic:           "Oceanic: deep-sea blues and vivid teal tones.",
    synthwave:         "Synthwave: neon pink & cyan glow on pitch black.",
    "night-owl":       "Night Owl: nighttime blues with bright highlight colors.",
    "tokyo-night":     "Tokyo Night: moody indigos with neon green accents.",
    "ayu-light":       "Ayu Light: gentle pastels with punchy orange highlights."
};



// Level requirements for each theme
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
  "ayu-light": 34
};

// Get user's level (assume from localStorage user object)
const userLevel = userFromStorage?.level || 1;

// Show all themes, not just unlocked
const allThemeNames = [
  "Default",
  "Light",
  "Dark",
  "Galaxy",
  "Forest",
  "Sunset",
  "Neon",
  "material-light",
  "material-dark",
  "dracula",
  "nord",
  "solarized-light",
  "solarized-dark",
  "monokai",
  "one-dark",
  "gruvbox-dark",
  "gruvbox-light",
  "oceanic",
  "synthwave",
  "night-owl",
  "tokyo-night",
  "ayu-light"
];

return (
  <div className="themes-container">
    <h2>Choose a Theme</h2>
    <div className="themes-grid">
      {allThemeNames.map((themeName) => {
        const requiredLevel = themeLevels[themeName];
        const isUnlocked = themeName === "Default" || unlocked.includes(themeName) || (requiredLevel && userLevel >= requiredLevel);
        const isCurrent = currentTheme === themeName;
        const isPreviewing = previewTheme === themeName;
        return (
          <div
            key={themeName}
            className={`theme-card${isCurrent ? ' current' : ''}${isPreviewing ? ' previewing' : ''}`}
            onMouseEnter={() => isUnlocked ? handlePreview(themeName) : null}
            onMouseLeave={clearPreview}
          >
            <h3>{themeName} Theme</h3>
            <p>{themeDescriptions[themeName]}</p>
            <div className="theme-actions">
              {isCurrent ? (
                <span className="current-badge">✨ Current</span>
              ) : isUnlocked ? (
                <button
                  onClick={() => handleApply(themeName)}
                  disabled={isCurrent}
                >
                  Apply
                </button>
              ) : (
                <button disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                  Unlocks at Level {requiredLevel}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>

    {/* Notification Modal */}
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
