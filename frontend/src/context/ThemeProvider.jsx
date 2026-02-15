import React, { useState, useEffect } from "react";
import { ThemeContext } from "./ThemeContextProvider";
import { safeParseJSON, safeSetItem } from "../utils/localStorage";

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState("Default");

    useEffect(() => {
        const storedUser = safeParseJSON("user", null);
        const storedTheme = storedUser?.selectedTheme || "Default";

        setTheme(storedTheme);
        document.documentElement.setAttribute("data-theme", storedTheme);

        // Check for active custom theme (use safe parse to avoid "undefined" / invalid JSON)
        const customTheme = safeParseJSON('activeCustomTheme', null);
        if (customTheme?.data) {
            try {
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
            } catch (err) {
                console.error('Error applying custom theme:', err);
            }
        }
    }, []);

    // Add effect to listen for localStorage changes (for login events)
    useEffect(() => {
        const handleStorageChange = () => {
            const storedUser = safeParseJSON("user", null);
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
            try {
                const storedUser = safeParseJSON("user", null);
                if (storedUser && typeof storedUser === 'object' && storedUser.selectedTheme && storedUser.selectedTheme !== theme) {
                    setTheme(storedUser.selectedTheme);
                    document.documentElement.setAttribute("data-theme", storedUser.selectedTheme);
                }
            } catch (_) {
                // Never let interval throw – safeParseJSON should not throw; guard anyway
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

        const user = safeParseJSON("user", null);
        if (user) {
            user.selectedTheme = newTheme;
            if (!localStorage.getItem('activeCustomTheme')) {
                delete user.customThemeId;
            }
            safeSetItem("user", user);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, changeTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
