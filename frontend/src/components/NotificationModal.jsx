import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const NotificationModal = ({ isOpen, message, type = "info", onClose, autoClose = true }) => {
    // Auto-close after 4 seconds if autoClose is true
    React.useEffect(() => {
        if (isOpen && autoClose) {
            const timer = setTimeout(() => {
                onClose();
            }, 4000);

            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose, autoClose]);

    // Get the appropriate emoji and colors based on type
    const getNotificationConfig = (type) => {
        switch (type) {
            case "success":
                return {
                    emoji: "✅",
                    gradient: "linear-gradient(135deg, #10b981, #065f46)",
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    iconColor: "#10b981"
                };
            case "error":
                return {
                    emoji: "❌",
                    gradient: "linear-gradient(135deg, #ef4444, #991b1b)",
                    borderColor: "#ef4444",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    iconColor: "#ef4444"
                };
            case "warning":
                return {
                    emoji: "⚠️",
                    gradient: "linear-gradient(135deg, #f59e0b, #92400e)",
                    borderColor: "#f59e0b",
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                    iconColor: "#f59e0b"
                };
            case "info":
            default:
                return {
                    emoji: "ℹ️",
                    gradient: "linear-gradient(135deg, #3b82f6, #1e40af)",
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    iconColor: "#3b82f6"
                };
        }
    };

    const config = getNotificationConfig(type);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="notification-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="notification-modal-content"
                        style={{
                            background: `var(--card-bg-glass)`,
                            backdropFilter: "blur(25px)",
                            border: `1px solid ${config.borderColor}`,
                            boxShadow: `
                                0 25px 50px rgba(0, 0, 0, 0.2),
                                0 0 30px ${config.backgroundColor},
                                inset 0 1px 0 rgba(255, 255, 255, 0.1)
                            `
                        }}
                        initial={{ 
                            scale: 0.7, 
                            opacity: 0, 
                            y: -50,
                            rotateX: -15 
                        }}
                        animate={{ 
                            scale: 1, 
                            opacity: 1, 
                            y: 0,
                            rotateX: 0 
                        }}
                        exit={{ 
                            scale: 0.8, 
                            opacity: 0, 
                            y: 50,
                            rotateX: 15 
                        }}
                        transition={{ 
                            duration: 0.4, 
                            type: "spring", 
                            stiffness: 200,
                            damping: 20
                        }}
                        onClick={(e) => e.stopPropagation()}
                        whileHover={{ scale: 1.02 }}
                    >
                        {/* Header with gradient */}
                        <motion.div 
                            className="notification-header"
                            style={{ background: config.gradient }}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                        />

                        {/* Icon */}
                        <motion.div 
                            className="notification-icon"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ 
                                delay: 0.1, 
                                duration: 0.5, 
                                type: "spring",
                                stiffness: 300 
                            }}
                        >
                            <motion.span
                                animate={{ 
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 5, -5, 0] 
                                }}
                                transition={{ 
                                    duration: 2, 
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            >
                                {config.emoji}
                            </motion.span>
                        </motion.div>

                        {/* Message */}
                        <motion.div 
                            className="notification-message"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                        >
                            {message}
                        </motion.div>

                        {/* Close Button */}
                        <motion.button
                            className="notification-close-btn"
                            onClick={onClose}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4, duration: 0.3 }}
                            whileHover={{ 
                                scale: 1.1, 
                                rotate: 90,
                                backgroundColor: config.backgroundColor
                            }}
                            whileTap={{ scale: 0.9 }}
                        >
                            ✕
                        </motion.button>

                        {/* Progress bar for auto-close */}
                        {autoClose && (
                            <motion.div 
                                className="notification-progress"
                                style={{ backgroundColor: config.borderColor }}
                                initial={{ scaleX: 1 }}
                                animate={{ scaleX: 0 }}
                                transition={{ duration: 4, ease: "linear" }}
                            />
                        )}

                        {/* Floating particles */}
                        <motion.div
                            className="notification-particle notification-particle-1"
                            style={{ backgroundColor: config.iconColor }}
                            animate={{
                                y: [0, -20, 0],
                                x: [0, 10, 0],
                                opacity: [0.3, 0.8, 0.3]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                        <motion.div
                            className="notification-particle notification-particle-2"
                            style={{ backgroundColor: config.iconColor }}
                            animate={{
                                y: [0, -15, 0],
                                x: [0, -8, 0],
                                opacity: [0.2, 0.6, 0.2]
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 1
                            }}
                        />
                        <motion.div
                            className="notification-particle notification-particle-3"
                            style={{ backgroundColor: config.iconColor }}
                            animate={{
                                y: [0, -25, 0],
                                x: [0, 5, 0],
                                opacity: [0.4, 0.9, 0.4]
                            }}
                            transition={{
                                duration: 2.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 2
                            }}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default NotificationModal;
