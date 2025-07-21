// Enhanced Spinner.jsx with AdminDashboard style
import React from "react";
import { motion } from "framer-motion";
import "./Spinner.css";

const Spinner = ({ message = "Loading..." }) => {
    return (
        <motion.div 
            className="enhanced-spinner-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="enhanced-loading-container">
                <motion.div 
                    className="enhanced-loading-spinner"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <div className="enhanced-spinner-ring"></div>
                </motion.div>
                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="enhanced-loading-text"
                >
                    {message}
                </motion.p>
            </div>
        </motion.div>
    );
};

export default Spinner;
