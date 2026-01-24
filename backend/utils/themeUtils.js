export const unlockThemesForLevel = (user) => {
    const unlockThemeAtLevels = {
        2: "Light",
        3: "Dark",
        4: "material-light",
        5: "Galaxy",
        6: "material-dark",
        7: "Forest",
        8: "dracula",
        10: "Sunset",
        12: "nord",
        14: "solarized-light",
        15: "Neon",
        16: "solarized-dark",
        18: "monokai",
        20: "one-dark",
        22: "gruvbox-dark",
        24: "gruvbox-light",
        26: "oceanic",
        28: "synthwave",
        30: "night-owl",
        32: "tokyo-night",
        34: "ayu-light",
        36: "catppuccin-mocha",
        38: "catppuccin-latte",
        40: "rose-pine",
        42: "everforest",
        44: "kanagawa",
        46: "github-dark",
        48: "github-light"
    };

    for (const [threshold, themeName] of Object.entries(unlockThemeAtLevels)) {
        if (user.level >= Number(threshold) && !user.unlockedThemes.includes(themeName)) {
            user.unlockedThemes.push(themeName);
        }
    }
};
