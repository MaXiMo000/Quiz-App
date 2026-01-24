import React from "react";
import { motion } from "framer-motion";
import "./Loading.css";

const Loading = ({ fullScreen = true, size = "large" }) => {
    const containerVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.3 }
    };

    const spinnerVariants = {
        animate: {
            rotate: 360,
            transition: {
                duration: 1.5,
                repeat: Infinity,
                ease: "linear"
            }
        }
    };

    const innerSpinnerVariants = {
        animate: {
            rotate: -360,
            transition: {
                duration: 1,
                repeat: Infinity,
                ease: "linear"
            }
        }
    };

    const pulseVariants = {
        animate: {
            scale: [1, 1.15, 1],
            opacity: [0.7, 1, 0.7],
            transition: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
            }
        }
    };

    const sizeClasses = {
        small: "loading-small",
        medium: "loading-medium",
        large: "loading-large"
    };

    const containerClass = fullScreen ? "loading-fullscreen" : "loading-inline";
    const sizeClass = sizeClasses[size] || sizeClasses.large;

    return (
        <motion.div
            className={`loading-wrapper ${containerClass}`}
            {...containerVariants}
        >
            {/* Animated Background Gradient */}
            <div className="loading-background">
                <div className="loading-gradient-orb loading-orb-1"></div>
                <div className="loading-gradient-orb loading-orb-2"></div>
                <div className="loading-gradient-orb loading-orb-3"></div>
                <div className="loading-gradient-orb loading-orb-4"></div>
            </div>

            {/* Main Spinner Container */}
            <div className={`loading-container ${sizeClass}`}>
                <motion.div
                    className="loading-glass-card"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    {/* Multi-layered Spinner */}
                    <div className="loading-spinner-wrapper">
                        {/* Outer Ring */}
                        <motion.div
                            className="loading-spinner-outer"
                            {...spinnerVariants}
                        >
                            <div className="loading-spinner-ring"></div>
                        </motion.div>

                        {/* Middle Ring */}
                        <motion.div
                            className="loading-spinner-middle"
                            {...innerSpinnerVariants}
                        >
                            <div className="loading-spinner-ring-middle"></div>
                        </motion.div>

                        {/* Inner Ring */}
                        <motion.div
                            className="loading-spinner-inner"
                            {...spinnerVariants}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        >
                            <div className="loading-spinner-core"></div>
                        </motion.div>

                        {/* Pulsing Center Dot */}
                        <motion.div
                            className="loading-spinner-center"
                            {...pulseVariants}
                        >
                            <div className="loading-spinner-dot"></div>
                        </motion.div>

                        {/* Glowing Particles */}
                        <div className="loading-particles">
                            <div className="particle particle-1"></div>
                            <div className="particle particle-2"></div>
                            <div className="particle particle-3"></div>
                            <div className="particle particle-4"></div>
                            <div className="particle particle-5"></div>
                            <div className="particle particle-6"></div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Loading;
