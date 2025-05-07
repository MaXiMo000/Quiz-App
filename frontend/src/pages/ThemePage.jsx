import React, { useEffect, useState, useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import axios from "../utils/axios";
import "./ThemePage.css";
const ThemePage = () => {
const { changeTheme } = useContext(ThemeContext);
const [unlocked, setUnlocked] = useState([]);
const userId = JSON.parse(localStorage.getItem("user"))?._id;

useEffect(() => {
    const fetchUser = async () => {
    try {
        const res = await axios.get(`/api/users/${userId}`);
        setUnlocked(res.data.unlockedThemes || []);
    } catch (err) {
        console.error("Error fetching themes:", err);
    }
    };
    fetchUser();
}, [userId]);

const handleApply = async (themeName) => {
    try {
    // Only call backend if not "Default"
    if (themeName !== "Default") {
        await axios.post(`/api/users/${userId}/theme`, { theme: themeName });
    }
    changeTheme(themeName);
    alert(`Theme "${themeName}" applied!`);
    } catch (err) {
    console.error("Error applying theme:", err);
    }
};

const themeDescriptions = {
    Default:           "Clean, neutral base theme.",
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


// Combine "Default" with unlocked themes (avoid duplication)
const themesToShow = ["Default", ...unlocked.filter((t) => t !== "Default")];

return (
    <div className="themes-container">
    <h2>Choose a Theme</h2>
    <div className="themes-grid">
        {themesToShow.map((themeName) => (
        <div key={themeName} className="theme-card">
            <h3>{themeName} Theme</h3>
            <p>{themeDescriptions[themeName]}</p>
            <button onClick={() => handleApply(themeName)}>Apply</button>
        </div>
        ))}
    </div>
    </div>
);
};

export default ThemePage;
