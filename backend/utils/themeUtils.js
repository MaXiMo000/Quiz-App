/**
 * Theme utilities for managing user theme unlocks
 * Centralized theme management to avoid duplication
 */

/**
 * Theme unlock configuration
 * Maps user levels to theme names
 */
const THEME_UNLOCK_LEVELS = {
  2: "Light",
  3: "Dark", 
  5: "Galaxy",
  7: "Forest",
  10: "Sunset",
  15: "Neon",
  4: "material-light",    
  6: "material-dark",
  8: "dracula",
  12: "nord",
  14: "solarized-light",
  16: "solarized-dark",
  18: "monokai",
  20: "one-dark",
  22: "gruvbox-dark",
  24: "gruvbox-light",
  26: "oceanic",
  28: "synthwave",
  30: "night-owl",
  32: "tokyo-night",
  34: "ayu-light"
};

/**
 * Default themes available to all users
 */
const DEFAULT_THEMES = ['default'];

/**
 * Unlock themes for a user based on their level
 * @param {Object} user - User object with level and unlockedThemes
 * @returns {Array} - Array of newly unlocked theme names
 */
export const unlockThemesForLevel = (user) => {
  if (!user || typeof user.level !== 'number' || !Array.isArray(user.unlockedThemes)) {
    throw new Error('Invalid user object provided to unlockThemesForLevel');
  }

  const newlyUnlocked = [];
  
  for (const [threshold, themeName] of Object.entries(THEME_UNLOCK_LEVELS)) {
    const levelThreshold = Number(threshold);
    
    if (user.level >= levelThreshold && !user.unlockedThemes.includes(themeName)) {
      user.unlockedThemes.push(themeName);
      newlyUnlocked.push(themeName);
    }
  }

  return newlyUnlocked;
};

/**
 * Get all available themes for a user level
 * @param {number} level - User level
 * @returns {Array} - Array of available theme names
 */
export const getAvailableThemes = (level = 1) => {
  const availableThemes = [...DEFAULT_THEMES];
  
  for (const [threshold, themeName] of Object.entries(THEME_UNLOCK_LEVELS)) {
    if (level >= Number(threshold)) {
      availableThemes.push(themeName);
    }
  }
  
  return availableThemes;
};

/**
 * Check if a theme is available for a user level
 * @param {string} themeName - Theme name to check
 * @param {number} level - User level
 * @returns {boolean} - Whether theme is available
 */
export const isThemeAvailable = (themeName, level = 1) => {
  if (DEFAULT_THEMES.includes(themeName)) {
    return true;
  }
  
  for (const [threshold, theme] of Object.entries(THEME_UNLOCK_LEVELS)) {
    if (theme === themeName && level >= Number(threshold)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Get theme unlock requirements
 * @param {string} themeName - Theme name
 * @returns {Object|null} - Theme unlock info or null if not found
 */
export const getThemeUnlockInfo = (themeName) => {
  if (DEFAULT_THEMES.includes(themeName)) {
    return {
      themeName,
      requiredLevel: 1,
      isDefault: true
    };
  }
  
  for (const [threshold, theme] of Object.entries(THEME_UNLOCK_LEVELS)) {
    if (theme === themeName) {
      return {
        themeName,
        requiredLevel: Number(threshold),
        isDefault: false
      };
    }
  }
  
  return null;
};

/**
 * Get all theme unlock levels
 * @returns {Object} - Theme unlock configuration
 */
export const getThemeUnlockLevels = () => {
  return { ...THEME_UNLOCK_LEVELS };
};

/**
 * Get default themes
 * @returns {Array} - Default theme names
 */
export const getDefaultThemes = () => {
  return [...DEFAULT_THEMES];
};

/**
 * Validate theme name
 * @param {string} themeName - Theme name to validate
 * @returns {boolean} - Whether theme name is valid
 */
export const isValidThemeName = (themeName) => {
  if (typeof themeName !== 'string') {
    return false;
  }
  
  return DEFAULT_THEMES.includes(themeName) || 
         Object.values(THEME_UNLOCK_LEVELS).includes(themeName);
};

/**
 * Get theme statistics for a user
 * @param {Object} user - User object
 * @returns {Object} - Theme statistics
 */
export const getThemeStats = (user) => {
  if (!user || typeof user.level !== 'number' || !Array.isArray(user.unlockedThemes)) {
    return {
      totalUnlocked: 0,
      totalAvailable: 0,
      unlockProgress: 0,
      nextTheme: null
    };
  }

  const totalAvailable = getAvailableThemes(user.level).length;
  const totalUnlocked = user.unlockedThemes.length;
  const unlockProgress = totalAvailable > 0 ? (totalUnlocked / totalAvailable) * 100 : 0;
  
  // Find next theme to unlock
  let nextTheme = null;
  for (const [threshold, themeName] of Object.entries(THEME_UNLOCK_LEVELS)) {
    const levelThreshold = Number(threshold);
    if (levelThreshold > user.level && !user.unlockedThemes.includes(themeName)) {
      nextTheme = {
        name: themeName,
        requiredLevel: levelThreshold,
        levelsNeeded: levelThreshold - user.level
      };
      break;
    }
  }

  return {
    totalUnlocked,
    totalAvailable,
    unlockProgress: Math.round(unlockProgress * 100) / 100,
    nextTheme
  };
};

export default {
  unlockThemesForLevel,
  getAvailableThemes,
  isThemeAvailable,
  getThemeUnlockInfo,
  getThemeUnlockLevels,
  getDefaultThemes,
  isValidThemeName,
  getThemeStats
};
