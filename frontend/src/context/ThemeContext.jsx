import React, { createContext, useState, useEffect } from "react";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState("Default");

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        const storedTheme = storedUser?.selectedTheme || "Default";

        setTheme(storedTheme);
        document.documentElement.setAttribute("data-theme", storedTheme);
    }, []);

    const changeTheme = (newTheme) => {
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