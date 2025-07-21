import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const ThemeSelector = () => {
const navigate = useNavigate();
return (
    <div className="theme-selector">
    <motion.button 
        className="choose-theme-btn" 
        onClick={() => navigate("/themes")}
        whileHover={{ 
            scale: 1.05,
            y: -2,
            transition: { duration: 0.3 }
        }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
    >
        🎨 Choose Theme
    </motion.button>
    </div>
);
};

export default ThemeSelector;
