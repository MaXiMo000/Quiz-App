import React, { useState, useEffect } from "react";
import { ThemeContext } from "./ThemeContextProvider";

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState("Default");

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        const storedTheme = storedUser?.selectedTheme || "Default";

        setTheme(storedTheme);
        document.documentElement.setAttribute("data-theme", storedTheme);

        // Check for active custom theme
        const activeCustomTheme = localStorage.getItem('activeCustomTheme');
        if (activeCustomTheme) {
            try {
                const customTheme = JSON.parse(activeCustomTheme);
                if (customTheme.data) {
                    // Apply custom theme CSS variables
                    const root = document.documentElement;
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

                    Object.keys(customTheme.data).forEach(key => {
                        if (cssVarMap[key]) {
                            root.style.setProperty(cssVarMap[key], customTheme.data[key]);
                        }
                    });
                }
            } catch (err) {
                console.error('Error applying custom theme:', err);
            }
        }
    }, []);

    // Add effect to listen for localStorage changes (for login events)
    useEffect(() => {
        const handleStorageChange = () => {
            const storedUser = JSON.parse(localStorage.getItem("user"));
            if (storedUser && storedUser.selectedTheme) {
                console.log('ThemeContext: Storage changed, updating theme to:', storedUser.selectedTheme);
                setTheme(storedUser.selectedTheme);
                document.documentElement.setAttribute("data-theme", storedUser.selectedTheme);
            }
        };

        // Listen for storage events and manual checks
        window.addEventListener('storage', handleStorageChange);

        // Also check periodically for user changes (like after login)
        const intervalId = setInterval(() => {
            const storedUser = JSON.parse(localStorage.getItem("user"));
            if (storedUser && storedUser.selectedTheme && storedUser.selectedTheme !== theme) {
                console.log('ThemeContext: User theme changed, updating to:', storedUser.selectedTheme);
                setTheme(storedUser.selectedTheme);
                document.documentElement.setAttribute("data-theme", storedUser.selectedTheme);
            }
        }, 1000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(intervalId);
        };
    }, [theme]);

    const changeTheme = (newTheme) => {
        setTheme(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);

        // Clear custom theme when switching to a regular theme
        if (newTheme !== 'Default' || !localStorage.getItem('activeCustomTheme')) {
            localStorage.removeItem('activeCustomTheme');
            localStorage.removeItem('customThemeId');
            // Reset CSS variables by removing inline styles
            document.documentElement.removeAttribute('style');
        }

        const user = JSON.parse(localStorage.getItem("user"));
        if (user) {
            user.selectedTheme = newTheme;
            if (!localStorage.getItem('activeCustomTheme')) {
                delete user.customThemeId;
            }
            localStorage.setItem("user", JSON.stringify(user));
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, changeTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
