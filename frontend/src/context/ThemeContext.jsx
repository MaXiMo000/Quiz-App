import React, { createContext, useState, useEffect } from "react";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState("Default");

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        const storedTheme = storedUser?.selectedTheme || "Default";

        console.log('ThemeContext: Setting theme to:', storedTheme); // Debug log
        setTheme(storedTheme);
        document.documentElement.setAttribute("data-theme", storedTheme);
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
        console.log('Changing theme to:', newTheme); // Debug log
        setTheme(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);

        const user = JSON.parse(localStorage.getItem("user"));
        if (user) {
            user.selectedTheme = newTheme;
            localStorage.setItem("user", JSON.stringify(user));
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, changeTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};