import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./CustomDropdown.css";

const CustomDropdown = ({
    value,
    onChange,
    options,
    placeholder = "Select...",
    className = "",
    ariaLabel = "",
    icon = "▼"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [isOpen]);

    // Close dropdown on Escape key
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === "Escape" && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    const handleSelect = (optionValue) => {
        onChange({ target: { value: optionValue } });
        setIsOpen(false);
    };

    return (
        <div
            className={`custom-dropdown ${isOpen ? 'dropdown-open' : ''} ${className}`}
            ref={dropdownRef}
        >
            <button
                type="button"
                className="custom-dropdown-button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={ariaLabel || placeholder}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <span className="custom-dropdown-value">
                    {selectedOption?.label || placeholder}
                </span>
                <motion.span
                    className="custom-dropdown-icon"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {icon}
                </motion.span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="custom-dropdown-menu"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        role="listbox"
                    >
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`custom-dropdown-item ${
                                    value === option.value ? "active" : ""
                                }`}
                                onClick={() => handleSelect(option.value)}
                                role="option"
                                aria-selected={value === option.value}
                            >
                                <span className="custom-dropdown-item-label">
                                    {option.label}
                                </span>
                                {value === option.value && (
                                    <span className="custom-dropdown-checkmark">✓</span>
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomDropdown;
