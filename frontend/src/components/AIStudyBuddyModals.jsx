import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import './AIStudyBuddyModals.css';

// Quiz Creator Modal
export const QuizCreatorModal = ({ isOpen, onClose, onSubmit, initialData = {} }) => {
    const [formData, setFormData] = useState({
        topic: initialData.topic || '',
        difficulty: initialData.difficulty || 'medium',
        questionCount: initialData.questionCount || 5,
        ...initialData
    });
    const [isLoading, setIsLoading] = useState(false);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            if (isOpen && !isLoading) {
                onClose();
            }
        },
    }, [isOpen, isLoading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.topic.trim()) return;

        setIsLoading(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error('Error creating quiz:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="ai-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="quiz-creator-modal-title"
                >
                    <motion.div
                        className="ai-modal-content"
                        initial={{ scale: 0.7, opacity: 0, y: -50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 50 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="ai-modal-header">
                            <h2 id="quiz-creator-modal-title" className="ai-modal-title">
                                🎯 Create Custom Quiz
                            </h2>
                            <button
                                className="ai-modal-close"
                                onClick={onClose}
                                aria-label="Close create quiz modal"
                                disabled={isLoading}
                            >
                                ×
                            </button>
                        </div>

                        <div className="ai-modal-body">
                            <form onSubmit={handleSubmit}>
                                <div className="ai-form-group">
                                    <label htmlFor="quiz-topic" className="ai-form-label">📚 Topic</label>
                                    <input
                                        id="quiz-topic"
                                        type="text"
                                        className="ai-form-input"
                                        placeholder="e.g., Mathematics, History, Science..."
                                        value={formData.topic}
                                        onChange={(e) => handleInputChange('topic', e.target.value)}
                                        required
                                        autoFocus
                                        aria-label="Quiz topic"
                                        aria-required="true"
                                    />
                                </div>

                                <div className="quiz-options-grid">
                                    <div className="ai-form-group">
                                        <label htmlFor="question-count" className="ai-form-label">🔢 Number of Questions</label>
                                        <select
                                            id="question-count"
                                            className="ai-form-select"
                                            value={formData.questionCount}
                                            onChange={(e) => handleInputChange('questionCount', parseInt(e.target.value))}
                                            aria-label="Number of questions"
                                        >
                                            {[...Array(20)].map((_, i) => (
                                                <option key={i + 1} value={i + 1}>
                                                    {i + 1} question{i === 0 ? '' : 's'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="ai-form-group">
                                        <label className="ai-form-label">⚡ Difficulty Level</label>
                                        <div className="difficulty-buttons" role="radiogroup" aria-label="Difficulty level">
                                            {['easy', 'medium', 'hard'].map((level) => (
                                                <button
                                                    key={level}
                                                    type="button"
                                                    className={`difficulty-btn ${level} ${formData.difficulty === level ? 'active' : ''}`}
                                                    onClick={() => handleInputChange('difficulty', level)}
                                                    aria-label={`Set difficulty to ${level}`}
                                                    aria-pressed={formData.difficulty === level}
                                                >
                                                    {level.charAt(0).toUpperCase() + level.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="ai-modal-buttons">
                                    <button
                                        type="button"
                                        className="ai-btn ai-btn-secondary"
                                        onClick={onClose}
                                        disabled={isLoading}
                                        aria-label="Cancel creating quiz"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={`ai-btn ai-btn-primary ${isLoading ? 'loading' : ''}`}
                                        disabled={!formData.topic.trim() || isLoading}
                                        aria-label="Create quiz"
                                        aria-busy={isLoading}
                                    >
                                        {isLoading ? '' : '🚀 Create Quiz'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Quiz Preview Modal
export const QuizPreviewModal = ({ isOpen, onClose, quiz, onTakeQuiz }) => {
    if (!quiz) return null;

    const previewQuestions = quiz.questions?.slice(0, 2) || [];

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            if (isOpen) {
                onClose();
            }
        },
    }, [isOpen]);

    const handleTakeQuiz = () => {
        if (onTakeQuiz) {
            onTakeQuiz(quiz.id);
        } else if (quiz.id) {
            window.location.href = `/user/test/${quiz.id}`;
        }
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="ai-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="quiz-preview-modal-title"
                >
                    <motion.div
                        className="ai-modal-content quiz-preview-modal"
                        initial={{ scale: 0.7, opacity: 0, y: -50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 50 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="ai-modal-header">
                            <h2 id="quiz-preview-modal-title" className="ai-modal-title">
                                👀 Quiz Preview
                            </h2>
                            <button
                                className="ai-modal-close"
                                onClick={onClose}
                                aria-label="Close quiz preview modal"
                            >
                                ×
                            </button>
                        </div>

                        <div className="ai-modal-body">
                            <div className="quiz-preview-content">
                                <h3 style={{ margin: '0 0 15px 0', color: '#2d3748' }}>
                                    {quiz.title}
                                </h3>
                                <div style={{
                                    display: 'flex',
                                    gap: '10px',
                                    marginBottom: '20px',
                                    flexWrap: 'wrap'
                                }}>
                                    <span style={{
                                        background: 'rgba(102, 126, 234, 0.1)',
                                        padding: '4px 12px',
                                        borderRadius: '15px',
                                        fontSize: '0.85rem',
                                        color: '#4a5568',
                                        fontWeight: '500'
                                    }}>
                                        {quiz.questionCount} questions
                                    </span>
                                    <span style={{
                                        background: 'rgba(118, 75, 162, 0.1)',
                                        padding: '4px 12px',
                                        borderRadius: '15px',
                                        fontSize: '0.85rem',
                                        color: '#4a5568',
                                        fontWeight: '500'
                                    }}>
                                        {quiz.difficulty}
                                    </span>
                                    <span style={{
                                        background: 'rgba(72, 187, 120, 0.1)',
                                        padding: '4px 12px',
                                        borderRadius: '15px',
                                        fontSize: '0.85rem',
                                        color: '#4a5568',
                                        fontWeight: '500'
                                    }}>
                                        {quiz.category}
                                    </span>
                                </div>

                                {previewQuestions.length > 0 && (
                                    <div>
                                        <h4 style={{ margin: '0 0 15px 0', color: '#4a5568' }}>
                                            Preview of first {previewQuestions.length} question{previewQuestions.length === 1 ? '' : 's'}:
                                        </h4>
                                        {previewQuestions.map((question, index) => (
                                            <div key={`preview-q-${index}-${question.question?.slice(0, 20)}`} className="quiz-preview-question">
                                                <h4>{index + 1}. {question.question}</h4>
                                                <ul className="quiz-preview-options">
                                                    {question.options?.map((option, optIndex) => (
                                                        <li key={`preview-opt-${index}-${optIndex}`}>
                                                            {String.fromCharCode(65 + optIndex)}) {option}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="ai-modal-buttons">
                                <button
                                    className="ai-btn ai-btn-secondary"
                                    onClick={onClose}
                                    aria-label="Close quiz preview"
                                >
                                    Close Preview
                                </button>
                                <button
                                    className="ai-btn ai-btn-primary"
                                    onClick={handleTakeQuiz}
                                    aria-label={`Take full quiz: ${quiz.title}`}
                                >
                                    🚀 Take Full Quiz
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Concept Explanation Modal
export const ConceptModal = ({ isOpen, onClose, onSubmit, initialConcept = '' }) => {
    const [concept, setConcept] = useState(initialConcept);
    const [isLoading, setIsLoading] = useState(false);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            if (isOpen && !isLoading) {
                onClose();
            }
        },
    }, [isOpen, isLoading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!concept.trim()) return;

        setIsLoading(true);
        try {
            await onSubmit(concept);
            onClose();
        } catch (error) {
            console.error('Error explaining concept:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="ai-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="concept-modal-title"
                >
                    <motion.div
                        className="ai-modal-content"
                        initial={{ scale: 0.7, opacity: 0, y: -50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 50 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="ai-modal-header">
                            <h2 id="concept-modal-title" className="ai-modal-title">
                                💡 Explain Concept
                            </h2>
                            <button
                                className="ai-modal-close"
                                onClick={onClose}
                                aria-label="Close concept explanation modal"
                                disabled={isLoading}
                            >
                                ×
                            </button>
                        </div>

                        <div className="ai-modal-body">
                            <form onSubmit={handleSubmit}>
                                <div className="ai-form-group">
                                    <label htmlFor="concept-input" className="ai-form-label">
                                        🤔 What concept would you like me to explain?
                                    </label>
                                    <textarea
                                        id="concept-input"
                                        className="ai-form-textarea"
                                        placeholder="e.g., Quantum Physics, Photosynthesis, Machine Learning algorithms..."
                                        value={concept}
                                        onChange={(e) => setConcept(e.target.value)}
                                        required
                                        autoFocus
                                        rows={4}
                                        aria-label="Concept to explain"
                                        aria-required="true"
                                    />
                                </div>

                                <div className="ai-modal-buttons">
                                    <button
                                        type="button"
                                        className="ai-btn ai-btn-secondary"
                                        onClick={onClose}
                                        disabled={isLoading}
                                        aria-label="Cancel concept explanation"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={`ai-btn ai-btn-primary ${isLoading ? 'loading' : ''}`}
                                        disabled={!concept.trim() || isLoading}
                                        aria-label="Explain concept"
                                        aria-busy={isLoading}
                                    >
                                        {isLoading ? '' : '💭 Explain It'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Reminder Modal
export const ReminderModal = ({ isOpen, onClose, onSubmit }) => {
    const [reminderText, setReminderText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            if (isOpen && !isLoading) {
                onClose();
            }
        },
    }, [isOpen, isLoading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reminderText.trim()) return;

        setIsLoading(true);
        try {
            await onSubmit(reminderText);
            onClose();
        } catch (error) {
            console.error('Error setting reminder:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const quickReminderOptions = [
        'Daily at 7 PM',
        'Every Monday at 10 AM',
        'Weekdays at 6 PM',
        'Every Saturday at 2 PM'
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="ai-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reminder-modal-title"
                >
                    <motion.div
                        className="ai-modal-content"
                        initial={{ scale: 0.7, opacity: 0, y: -50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 50 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="ai-modal-header">
                            <h2 id="reminder-modal-title" className="ai-modal-title">
                                ⏰ Set Study Reminder
                            </h2>
                            <button
                                className="ai-modal-close"
                                onClick={onClose}
                                aria-label="Close reminder modal"
                                disabled={isLoading}
                            >
                                ×
                            </button>
                        </div>

                        <div className="ai-modal-body">
                            <form onSubmit={handleSubmit}>
                                <div className="ai-form-group">
                                    <label htmlFor="reminder-input" className="ai-form-label">
                                        📅 When would you like to be reminded?
                                    </label>
                                    <input
                                        id="reminder-input"
                                        type="text"
                                        className="ai-form-input"
                                        placeholder="e.g., daily at 7pm, every Monday at 10am"
                                        value={reminderText}
                                        onChange={(e) => setReminderText(e.target.value)}
                                        required
                                        autoFocus
                                        aria-label="Reminder time"
                                        aria-required="true"
                                    />
                                </div>

                                <div className="reminder-examples">
                                    <h4>Quick Options:</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                                        {quickReminderOptions.map((option, index) => (
                                            <button
                                                key={`reminder-${option}-${index}`}
                                                type="button"
                                                style={{
                                                    padding: '6px 12px',
                                                    border: '1px solid rgba(102, 126, 234, 0.3)',
                                                    borderRadius: '15px',
                                                    background: 'rgba(102, 126, 234, 0.1)',
                                                    color: '#4a5568',
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onClick={() => setReminderText(option)}
                                                aria-label={`Set reminder to ${option}`}
                                                onMouseOver={(e) => {
                                                    e.target.style.background = 'rgba(102, 126, 234, 0.2)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.target.style.background = 'rgba(102, 126, 234, 0.1)';
                                                }}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="ai-modal-buttons">
                                    <button
                                        type="button"
                                        className="ai-btn ai-btn-secondary"
                                        onClick={onClose}
                                        disabled={isLoading}
                                        aria-label="Cancel setting reminder"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={`ai-btn ai-btn-primary ${isLoading ? 'loading' : ''}`}
                                        disabled={!reminderText.trim() || isLoading}
                                        aria-label="Set reminder"
                                        aria-busy={isLoading}
                                    >
                                        {isLoading ? '' : '🔔 Set Reminder'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Error Modal (replaces alert)
export const ErrorModal = ({ isOpen, onClose, message, title = "Error" }) => {
    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            if (isOpen) {
                onClose();
            }
        },
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="ai-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="error-modal-title"
                    aria-describedby="error-modal-message"
                >
                    <motion.div
                        className="ai-modal-content"
                        style={{ maxWidth: '400px' }}
                        initial={{ scale: 0.7, opacity: 0, y: -50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 50 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="ai-modal-header">
                            <h2 id="error-modal-title" className="ai-modal-title" style={{ color: '#e53e3e' }}>
                                ❌ {title}
                            </h2>
                            <button
                                className="ai-modal-close"
                                onClick={onClose}
                                aria-label="Close error modal"
                            >
                                ×
                            </button>
                        </div>

                        <div className="ai-modal-body">
                            <p
                                id="error-modal-message"
                                style={{
                                    margin: '0 0 20px 0',
                                    color: '#4a5568',
                                    lineHeight: '1.6',
                                    fontSize: '1rem'
                                }}
                            >
                                {message}
                            </p>

                            <div className="ai-modal-buttons">
                                <button
                                    className="ai-btn ai-btn-primary"
                                    onClick={onClose}
                                    style={{ width: '100%' }}
                                    aria-label="Acknowledge error"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
