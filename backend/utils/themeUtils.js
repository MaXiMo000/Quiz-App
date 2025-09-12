/**
 * A centralized utility for managing theme unlocks based on user level.
 */

const unlockThemeAtLevels = {
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
 * Checks a user's level and unlocks themes if they meet the level requirements.
 * This function modifies the user object directly.
 *
 * @param {object} user - The user object, which must have `level` and `unlockedThemes` properties.
 * @returns {boolean} - True if any new themes were unlocked, false otherwise.
 */
export const unlockThemesForLevel = (user) => {
    let updated = false;
    if (!user || typeof user.level !== 'number' || !Array.isArray(user.unlockedThemes)) {
        console.error("Invalid user object passed to unlockThemesForLevel");
        return false;
    }

    for (const [threshold, themeName] of Object.entries(unlockThemeAtLevels)) {
        if (user.level >= Number(threshold) && !user.unlockedThemes.includes(themeName)) {
            user.unlockedThemes.push(themeName);
            updated = true;
        }
    }
    return updated;
};
