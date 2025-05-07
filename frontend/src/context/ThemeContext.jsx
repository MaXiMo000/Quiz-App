import React, { createContext, useState, useEffect } from "react";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
const [theme, setTheme] = useState("Default");

useEffect(() => {
    const saved = localStorage.getItem("theme") || "Default";
    setTheme(saved);
    applyTheme(saved);
}, []);

const applyTheme = (themeName) => {
    if (themeName === "Default") {
    document.body.removeAttribute("data-theme");
    } else {
    document.body.setAttribute("data-theme", themeName);
    }
};

const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
};

return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
    {children}
    </ThemeContext.Provider>
);
};
