import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
                            <h2 className="ai-modal-title">
                                🎯 Create Custom Quiz
                            </h2>
                            <button className="ai-modal-close" onClick={onClose}>
                                ×
                            </button>
                        </div>
                        
                        <div className="ai-modal-body">
                            <form onSubmit={handleSubmit}>
                                <div className="ai-form-group">
                                    <label className="ai-form-label">📚 Topic</label>
                                    <input
                                        type="text"
                                        className="ai-form-input"
                                        placeholder="e.g., Mathematics, History, Science..."
                                        value={formData.topic}
                                        onChange={(e) => handleInputChange('topic', e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="quiz-options-grid">
                                    <div className="ai-form-group">
                                        <label className="ai-form-label">🔢 Number of Questions</label>
                                        <select
                                            className="ai-form-select"
                                            value={formData.questionCount}
                                            onChange={(e) => handleInputChange('questionCount', parseInt(e.target.value))}
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
                                        <div className="difficulty-buttons">
                                            {['easy', 'medium', 'hard'].map((level) => (
                                                <button
                                                    key={level}
                                                    type="button"
                                                    className={`difficulty-btn ${level} ${formData.difficulty === level ? 'active' : ''}`}
                                                    onClick={() => handleInputChange('difficulty', level)}
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
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={`ai-btn ai-btn-primary ${isLoading ? 'loading' : ''}`}
                                        disabled={!formData.topic.trim() || isLoading}
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

    const handleTakeQuiz = () => {
        if (onTakeQuiz) {
            onTakeQuiz(quiz.id);
        } else if (quiz.id) {
            window.open(`/user/test/${quiz.id}`, '_blank');
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
                            <h2 className="ai-modal-title">
                                👀 Quiz Preview
                            </h2>
                            <button className="ai-modal-close" onClick={onClose}>
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
                                            <div key={index} className="quiz-preview-question">
                                                <h4>{index + 1}. {question.question}</h4>
                                                <ul className="quiz-preview-options">
                                                    {question.options?.map((option, optIndex) => (
                                                        <li key={optIndex}>
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
                                >
                                    Close Preview
                                </button>
                                <button
                                    className="ai-btn ai-btn-primary"
                                    onClick={handleTakeQuiz}
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
                            <h2 className="ai-modal-title">
                                💡 Explain Concept
                            </h2>
                            <button className="ai-modal-close" onClick={onClose}>
                                ×
                            </button>
                        </div>
                        
                        <div className="ai-modal-body">
                            <form onSubmit={handleSubmit}>
                                <div className="ai-form-group">
                                    <label className="ai-form-label">
                                        🤔 What concept would you like me to explain?
                                    </label>
                                    <textarea
                                        className="ai-form-textarea"
                                        placeholder="e.g., Quantum Physics, Photosynthesis, Machine Learning algorithms..."
                                        value={concept}
                                        onChange={(e) => setConcept(e.target.value)}
                                        required
                                        autoFocus
                                        rows={4}
                                    />
                                </div>

                                <div className="ai-modal-buttons">
                                    <button
                                        type="button"
                                        className="ai-btn ai-btn-secondary"
                                        onClick={onClose}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={`ai-btn ai-btn-primary ${isLoading ? 'loading' : ''}`}
                                        disabled={!concept.trim() || isLoading}
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
                            <h2 className="ai-modal-title">
                                ⏰ Set Study Reminder
                            </h2>
                            <button className="ai-modal-close" onClick={onClose}>
                                ×
                            </button>
                        </div>
                        
                        <div className="ai-modal-body">
                            <form onSubmit={handleSubmit}>
                                <div className="ai-form-group">
                                    <label className="ai-form-label">
                                        📅 When would you like to be reminded?
                                    </label>
                                    <input
                                        type="text"
                                        className="ai-form-input"
                                        placeholder="e.g., daily at 7pm, every Monday at 10am"
                                        value={reminderText}
                                        onChange={(e) => setReminderText(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="reminder-examples">
                                    <h4>Quick Options:</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                                        {quickReminderOptions.map((option, index) => (
                                            <button
                                                key={index}
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
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={`ai-btn ai-btn-primary ${isLoading ? 'loading' : ''}`}
                                        disabled={!reminderText.trim() || isLoading}
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
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="ai-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
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
                            <h2 className="ai-modal-title" style={{ color: '#e53e3e' }}>
                                ❌ {title}
                            </h2>
                            <button className="ai-modal-close" onClick={onClose}>
                                ×
                            </button>
                        </div>
                        
                        <div className="ai-modal-body">
                            <p style={{ 
                                margin: '0 0 20px 0', 
                                color: '#4a5568', 
                                lineHeight: '1.6',
                                fontSize: '1rem'
                            }}>
                                {message}
                            </p>

                            <div className="ai-modal-buttons">
                                <button
                                    className="ai-btn ai-btn-primary"
                                    onClick={onClose}
                                    style={{ width: '100%' }}
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
