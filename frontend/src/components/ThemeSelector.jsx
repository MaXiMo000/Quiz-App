import React from "react";
import { useNavigate } from "react-router-dom";

const ThemeSelector = () => {
const navigate = useNavigate();
return (
    <div className="theme-selector">
    <button className="choose-theme-btn" onClick={() => navigate("/themes")}>
        Choose Theme
    </button>
    </div>
);
};

export default ThemeSelector;
