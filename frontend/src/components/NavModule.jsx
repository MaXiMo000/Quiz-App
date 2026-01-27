import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
// Using Unicode chevron instead of lucide-react for compatibility
import "./NavModule.css";

const NavModule = ({ title, icon, children, defaultExpanded = false, delay = 0 }) => {
    const storageKey = `nav-module-${title.toLowerCase().replace(/\s+/g, '-')}-expanded`;
    const [isExpanded, setIsExpanded] = useState(() => {
        const saved = localStorage.getItem(storageKey);
        return saved !== null ? JSON.parse(saved) : defaultExpanded;
    });

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(isExpanded));
    }, [isExpanded, storageKey]);

    return (
        <motion.div
            className="nav-module"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
        >
            <button
                className="nav-module-header"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} module`}
            >
                <div className="nav-module-title">
                    <span className="nav-module-icon">{icon}</span>
                    <span className="nav-module-text">{title}</span>
                </div>
                <motion.span
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="nav-module-chevron"
                >
                    ▶
                </motion.span>
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        className="nav-module-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <div className="nav-module-items">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default NavModule;
