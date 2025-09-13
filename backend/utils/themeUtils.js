export const unlockThemesForLevel = (user) => {
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

    for (const [threshold, themeName] of Object.entries(unlockThemeAtLevels)) {
        if (user.level >= Number(threshold) && !user.unlockedThemes.includes(themeName)) {
            user.unlockedThemes.push(themeName);
        }
    }
};
