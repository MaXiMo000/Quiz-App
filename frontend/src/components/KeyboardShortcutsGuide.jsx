import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKeyboardShortcuts, isMac } from '../hooks/useKeyboardShortcuts';
import './KeyboardShortcutsGuide.css';

const KeyboardShortcutsGuide = () => {
    const [isOpen, setIsOpen] = useState(false);
    const modifierKey = isMac() ? 'Cmd' : 'Ctrl';

    // Define shortcuts by category
    const shortcutsByCategory = [
        {
            category: 'Navigation',
            shortcuts: [
                { keys: ['Escape'], description: 'Close modals, exit fullscreen, go back' },
                { keys: ['ArrowLeft'], description: 'Previous question (in quiz)' },
                { keys: ['ArrowRight'], description: 'Next question (in quiz)' },
                { keys: ['Enter'], description: 'Submit forms, confirm actions' },
            ]
        },
        {
            category: 'Search & Actions',
            shortcuts: [
                { keys: [`${modifierKey}`, 'F'], description: 'Focus search input' },
                { keys: [`${modifierKey}`, 'Z'], description: 'Undo last answer (in quiz)' },
                { keys: ['Space'], description: 'Pause/Resume timer (in quiz)' },
            ]
        },
        {
            category: 'Quiz Taking',
            shortcuts: [
                { keys: ['Escape'], description: 'Exit fullscreen mode' },
                { keys: ['Space'], description: 'Pause/Resume quiz timer' },
                { keys: [`${modifierKey}`, 'Z'], description: 'Undo last answer' },
                { keys: ['ArrowLeft'], description: 'Previous question' },
                { keys: ['ArrowRight'], description: 'Next question' },
            ]
        },
        {
            category: 'General',
            shortcuts: [
                { keys: ['Tab'], description: 'Navigate between elements' },
                { keys: ['Shift', 'Tab'], description: 'Navigate backwards' },
            ]
        }
    ];

    useKeyboardShortcuts({
        '?': (e) => {
            const target = e.target;
            const isInputElement = target.tagName === 'INPUT' ||
                                  target.tagName === 'TEXTAREA' ||
                                  target.isContentEditable;

            if (!isInputElement) {
                e.preventDefault();
                setIsOpen(!isOpen);
            }
        },
    }, [isOpen]);

    return (
        <>
            {/* Floating Help Button */}
            <motion.button
                className="keyboard-shortcuts-toggle"
                onClick={() => setIsOpen(!isOpen)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.5, type: 'spring', stiffness: 200 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Keyboard shortcuts guide (Press ?)"
                title="Keyboard Shortcuts (Press ?)"
            >
                ?
            </motion.button>

            {/* Shortcuts Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="shortcuts-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            className="shortcuts-modal"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="shortcuts-modal-title"
                        >
                            <div className="shortcuts-modal-header">
                                <h2 id="shortcuts-modal-title">⌨️ Keyboard Shortcuts</h2>
                                <button
                                    className="close-shortcuts-btn"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close keyboard shortcuts guide (Escape)"
                                    title="Close (Escape)"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="shortcuts-content">
                                {shortcutsByCategory.map((category, catIdx) => (
                                    <div key={catIdx} className="shortcuts-category">
                                        <h3 className="category-title">{category.category}</h3>
                                        <div className="shortcuts-list">
                                            {category.shortcuts.map((shortcut, idx) => (
                                                <div key={idx} className="shortcut-item">
                                                    <div className="shortcut-keys">
                                                        {shortcut.keys.map((key, keyIdx) => (
                                                            <React.Fragment key={keyIdx}>
                                                                <kbd className="key">{key}</kbd>
                                                                {keyIdx < shortcut.keys.length - 1 && (
                                                                    <span className="key-separator">+</span>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                    <span className="shortcut-description">{shortcut.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="shortcuts-footer">
                                <p className="shortcuts-hint">
                                    💡 Press <kbd>?</kbd> anytime to open this guide
                                </p>
                                <button
                                    className="close-shortcuts-btn-large"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close keyboard shortcuts guide"
                                >
                                    Got it!
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default KeyboardShortcutsGuide;
