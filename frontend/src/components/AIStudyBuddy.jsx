import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './AIStudyBuddy.css';
import { 
    QuizCreatorModal, 
    QuizPreviewModal, 
    ConceptModal, 
    ReminderModal, 
    ErrorModal 
} from './AIStudyBuddyModals';

const AIStudyBuddy = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [_sessionId, setSessionId] = useState(null); // Using underscore to indicate internal use
    const [userProfile, setUserProfile] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Modal states
    const [modals, setModals] = useState({
        quizCreator: false,
        quizPreview: false,
        concept: false,
        reminder: false,
        error: false
    });
    const [modalData, setModalData] = useState({
        quizPreview: null,
        error: { message: '', title: 'Error' }
    });

    // Modal helper functions
    const openModal = (modalName, data = null) => {
        setModals(prev => ({ ...prev, [modalName]: true }));
        if (data) {
            setModalData(prev => ({ ...prev, [modalName]: data }));
        }
    };

    const closeModal = (modalName) => {
        setModals(prev => ({ ...prev, [modalName]: false }));
    };

    const showError = (message, title = 'Error') => {
        setModalData(prev => ({ 
            ...prev, 
            error: { message, title } 
        }));
        openModal('error');
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Auto-focus input when session becomes active
        if (isSessionActive && inputRef.current) {
            setTimeout(() => {
                inputRef.current.focus();
            }, 100);
        }
    }, [isSessionActive]);

    const startSession = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/api/ai-study-buddy/start-session`,
                { 
                    preferences: {
                        learningStyle: 'visual',
                        difficulty: 'intermediate'
                    }
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setSessionId(response.data.sessionId);
            setUserProfile(response.data.userProfile);
            setMessages([{
                id: Date.now(),
                role: 'assistant',
                content: response.data.message,
                timestamp: new Date()
            }]);
            setIsSessionActive(true);
            
            // Get recommendations
            loadRecommendations();
            
        } catch (error) {
            console.error('Error starting AI session:', error);
            showError('Failed to start AI Study Buddy session. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadRecommendations = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${import.meta.env.VITE_BACKEND_URL}/api/ai-study-buddy/recommendations`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setRecommendations(response.data.recommendations);
        } catch (error) {
            console.error('Error loading recommendations:', error);
        }
    };

    const sendMessage = useCallback(async (message, requestType = 'general') => {
        if (!message.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: message,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);
        setIsTyping(true);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/api/ai-study-buddy/chat`,
                { 
                    message: message,
                    requestType: requestType
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setIsTyping(false);

            const aiMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: response.data.response,
                timestamp: new Date(),
                actions: response.data.actions || []
            };

            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error('Error sending message:', error);
            setIsTyping(false);
            
            const errorMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date(),
                isError: true
            };
            
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    const generateQuiz = async (topic, difficulty = 'medium', questionCount = 5) => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            
            // Validate inputs
            const validDifficulties = ['easy', 'medium', 'hard'];
            const normalizedDifficulty = validDifficulties.includes(difficulty.toLowerCase()) 
                ? difficulty.toLowerCase() 
                : 'medium';
            
            const validQuestionCount = Math.min(Math.max(parseInt(questionCount) || 5, 1), 20);
            
            // Add immediate feedback message
            const generatingMessage = {
                id: Date.now(),
                role: 'assistant',
                content: `🎯 Generating your personalized ${normalizedDifficulty} quiz on "${topic || 'general knowledge'}" with ${validQuestionCount} questions... This may take a moment while I create the perfect questions for your level!`,
                timestamp: new Date(),
                isGenerating: true
            };
            
            setMessages(prev => [...prev, generatingMessage]);
            
            const response = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/api/ai-study-buddy/generate-quiz`,
                { 
                    topic: topic || 'general knowledge',
                    difficulty: normalizedDifficulty,
                    questionCount: validQuestionCount
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            const quizMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: response.data.message,
                timestamp: new Date(),
                quiz: response.data.quiz
                // Removed actions: ['take_quiz'] since we have the button in quiz preview
            };

            setMessages(prev => [...prev, quizMessage]);

        } catch (error) {
            console.error('Error generating quiz:', error);
            const errorMessage = {
                id: Date.now(),
                role: 'assistant',
                content: 'Sorry, I had trouble generating that quiz. Let me try a different approach or you can try again with different parameters.',
                timestamp: new Date(),
                actions: ['generate_quiz']
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const endSession = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/api/ai-study-buddy/end-session`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setIsSessionActive(false);
            setMessages([]);
            setSessionId(null);
            setUserProfile(null);
            setRecommendations([]);

        } catch (error) {
            console.error('Error ending session:', error);
        }
    };

    const handleQuickAction = (action, data) => {
        switch (action) {
            case 'request_quiz': {
                // Use the generateQuiz function directly
                generateQuiz(data.topic || 'general knowledge', 'intermediate', 5);
                break;
            }
            case 'generate_quiz': {
                // Smart quiz generation using modal
                openModal('quizCreator');
                break;
            }
            case 'generate_custom_quiz': {
                // Allow for custom quiz generation using modal
                openModal('quizCreator');
                break;
            }
            case 'explain_concept': {
                // Use modal for concept explanation
                openModal('concept');
                break;
            }
            case 'study_plan': {
                sendMessage('Help me create a study plan', 'study_plan');
                break;
            }
            case 'create_study_plan': {
                sendMessage('Help me create a personalized study plan', 'study_plan');
                break;
            }
            case 'weak_areas': {
                sendMessage('Help me improve my weak areas', 'weak_areas');
                break;
            }
            case 'practice_weak_areas': {
                sendMessage('I want to practice my weak areas. Can you help me?', 'weak_areas');
                break;
            }
            case 'analyze_weak_areas': {
                sendMessage('Please analyze my weak areas and suggest improvements', 'weak_areas');
                break;
            }
            case 'offer_practice': {
                sendMessage('I would like some practice questions on this topic', 'quiz_request');
                break;
            }
            case 'suggest_related_topics': {
                sendMessage('Can you suggest related topics I should study?', 'general');
                break;
            }
            case 'save_study_plan': {
                handleSaveStudyPlan();
                break;
            }
            case 'set_reminders': {
                openModal('reminder');
                break;
            }
            case 'track_improvement': {
                handleTrackImprovement();
                break;
            }
            case 'take_quiz': {
                // Navigate to quiz if ID is provided
                if (data.quizId) {
                    window.open(`/user/test/${data.quizId}`, '_blank');
                }
                break;
            }
            default: {
                sendMessage(data.message || `I'd like help with ${action}`);
                break;
            }
        }
    };

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputMessage.trim() && !isLoading) {
                sendMessage(inputMessage);
            }
        }
    }, [inputMessage, isLoading, sendMessage]);

    const handleInputChange = useCallback((e) => {
        const value = e.target.value;
        setInputMessage(value);
    }, []);

    const handleInputFocus = () => {
        // Ensure the input is focused and ready
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Handler for saving study plan
    const handleSaveStudyPlan = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            
            // Get the last study plan from messages
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
                const response = await axios.post(
                    `${import.meta.env.VITE_BACKEND_URL}/api/ai-study-buddy/save-study-plan`,
                    { 
                        studyPlanContent: lastMessage.content,
                        timestamp: new Date()
                    },
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
                
                // Add confirmation message
                const confirmationMessage = {
                    id: Date.now(),
                    role: 'assistant',
                    content: response.data.message || 'Study plan saved successfully! You can access it from your dashboard.',
                    timestamp: new Date()
                };
                
                setMessages(prev => [...prev, confirmationMessage]);
            }
        } catch (error) {
            console.error('Error saving study plan:', error);
            const errorMessage = {
                id: Date.now(),
                role: 'assistant',
                content: 'Sorry, I couldn\'t save your study plan right now. Please try again later.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handler for setting reminders
    const handleSetReminders = async (reminderTime) => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/api/ai-study-buddy/set-reminder`,
                { 
                    reminderText: reminderTime,
                    context: 'study_session'
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            const confirmationMessage = {
                id: Date.now(),
                role: 'assistant',
                content: response.data.message || `Great! I'll remind you ${reminderTime}. Check your notifications for updates.`,
                timestamp: new Date()
            };
            
            setMessages(prev => [...prev, confirmationMessage]);
        } catch (error) {
            console.error('Error setting reminder:', error);
            const errorMessage = {
                id: Date.now(),
                role: 'assistant',
                content: 'Sorry, I couldn\'t set up your reminder right now. Please try again later.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handler for tracking improvement
    const handleTrackImprovement = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await axios.get(
                `${import.meta.env.VITE_BACKEND_URL}/api/ai-study-buddy/track-progress`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            const progressMessage = {
                id: Date.now(),
                role: 'assistant',
                content: response.data.progressReport || 'Here\'s your progress summary: Keep up the great work!',
                timestamp: new Date(),
                actions: ['practice_weak_areas', 'generate_quiz']
            };
            
            setMessages(prev => [...prev, progressMessage]);
        } catch (error) {
            console.error('Error tracking improvement:', error);
            const errorMessage = {
                id: Date.now(),
                role: 'assistant',
                content: 'Let me help you track your improvement. You\'ve been making steady progress! Would you like to take a quiz to see how much you\'ve improved?',
                timestamp: new Date(),
                actions: ['generate_quiz', 'practice_weak_areas']
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const QuickActions = () => (
        <div className="quick-actions">
            <motion.button
                className="quick-action-btn"
                onClick={() => handleQuickAction('request_quiz', { topic: 'mathematics' })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                📊 Generate Math Quiz
            </motion.button>
            <motion.button
                className="quick-action-btn"
                onClick={() => openModal('quizCreator')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                🎯 Custom Quiz
            </motion.button>
            <motion.button
                className="quick-action-btn"
                onClick={() => handleQuickAction('study_plan', {})}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                📅 Study Plan
            </motion.button>
            <motion.button
                className="quick-action-btn"
                onClick={() => handleQuickAction('weak_areas', {})}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                🎯 Improve Skills
            </motion.button>
            <motion.button
                className="quick-action-btn"
                onClick={() => openModal('concept')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                💡 Explain Concept
            </motion.button>
        </div>
    );

    const MessageBubble = ({ message }) => (
        <motion.div
            className={`message ${message.role}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="message-content">
                {message.content}
                
                {/* Quiz Component */}
                {message.quiz && (
                    <div className="quiz-preview">
                        <h4>🎯 {message.quiz.title}</h4>
                        <div className="quiz-details">
                            <span className="quiz-count">{message.quiz.questionCount} questions</span>
                            <span className="quiz-difficulty">{message.quiz.difficulty}</span>
                            <span className="quiz-category">{message.quiz.category}</span>
                        </div>
                        <div className="quiz-actions">
                            <motion.button
                                className="take-quiz-btn primary"
                                onClick={() => handleQuickAction('take_quiz', { quizId: message.quiz.id })}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                🚀 Take Quiz Now
                            </motion.button>
                            <motion.button
                                className="preview-quiz-btn secondary"
                                onClick={() => {
                                    setModalData(prev => ({ 
                                        ...prev, 
                                        quizPreview: message.quiz 
                                    }));
                                    openModal('quizPreview');
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                👀 Preview
                            </motion.button>
                        </div>
                    </div>
                )}
                
                {/* Action Buttons */}
                {message.actions && message.actions.length > 0 && (
                    <div className="message-actions">
                        {message.actions.map((action, index) => {
                            // Add emoji and better formatting for action buttons
                            const formatActionText = (actionName) => {
                                const actionMap = {
                                    'generate_quiz': '🎯 Generate Quiz',
                                    'explain_concept': '💡 Explain Concept',
                                    'create_study_plan': '📅 Create Study Plan',
                                    'save_study_plan': '💾 Save Study Plan',
                                    'set_reminders': '⏰ Set Reminders',
                                    'practice_weak_areas': '🎯 Practice Weak Areas',
                                    'track_improvement': '📈 Track Progress',
                                    'analyze_weak_areas': '🔍 Analyze Weak Areas',
                                    'offer_practice': '📝 Practice Questions',
                                    'suggest_related_topics': '🔗 Related Topics'
                                };
                                
                                return actionMap[actionName] || actionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            };

                            return (
                                <motion.button
                                    key={index}
                                    className="action-btn"
                                    data-action={action}
                                    onClick={() => handleQuickAction(action, {})}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {formatActionText(action)}
                                </motion.button>
                            );
                        })}
                    </div>
                )}
            </div>
            <div className="message-time">
                {message.timestamp.toLocaleTimeString()}
            </div>
        </motion.div>
    );

    const TypingIndicator = () => (
        <motion.div
            className="message assistant typing-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </motion.div>
    );

    if (!isSessionActive) {
        return (
            <div className="ai-study-buddy">
                <div className="ai-welcome">
                    <motion.div
                        className="ai-avatar"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    >
                        🤖
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        AI Study Buddy
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        Your personalized AI tutor is ready to help you learn, practice, and improve your quiz performance!
                    </motion.p>
                    
                    <div className="features-preview">
                        <div className="feature">
                            <span className="feature-icon">🎯</span>
                            <span>Personalized Quizzes</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">📚</span>
                            <span>Smart Explanations</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">📈</span>
                            <span>Progress Tracking</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">🎮</span>
                            <span>Interactive Learning</span>
                        </div>
                    </div>

                    <motion.button
                        className="start-session-btn"
                        onClick={startSession}
                        disabled={isLoading}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        {isLoading ? 'Starting...' : 'Start Learning Session 🚀'}
                    </motion.button>
                </div>
            </div>
        );
    }

    return (
        <div className="ai-study-buddy active">
            {/* Header */}
            <div className="chat-header">
                <div className="ai-info">
                    <div className="ai-avatar small">🤖</div>
                    <div>
                        <h3>AI Study Buddy</h3>
                        {userProfile && (
                            <p>Level {userProfile.level} • {userProfile.xp} XP</p>
                        )}
                    </div>
                </div>
                <motion.button
                    className="end-session-btn"
                    onClick={endSession}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    End Session
                </motion.button>
            </div>

            {/* Recommendations Panel */}
            {/* {recommendations.length > 0 && (
                <div className="recommendations-panel">
                    <h4>📋 Study Recommendations</h4>
                    <div className="recommendations-list">
                        {recommendations.slice(0, 3).map((rec, index) => (
                            <motion.div
                                key={index}
                                className={`recommendation ${rec.priority}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="rec-title">{rec.title}</div>
                                <div className="rec-action">{rec.action}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )} */}

            {/* Chat Area */}
            <div className="chat-area">
                <div className="messages-container">
                    <AnimatePresence>
                        {messages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
                        ))}
                        {isTyping && <TypingIndicator />}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                <QuickActions />

                {/* Input Area */}
                <div className="input-area">
                    <div 
                        className="input-container"
                        onClick={() => {
                            console.log('Container clicked');
                            if (inputRef.current) {
                                inputRef.current.focus();
                            }
                        }}
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputMessage}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyPress}
                            onFocus={handleInputFocus}
                            onClick={(e) => {
                                console.log('Input clicked');
                                e.stopPropagation();
                            }}
                            placeholder="Ask me anything about studying, request a quiz, or get help with concepts..."
                            disabled={isLoading}
                            style={{ 
                                flex: 1,
                                border: 'none',
                                background: 'transparent',
                                fontSize: '0.95rem',
                                padding: '8px 0',
                                outline: 'none',
                                pointerEvents: 'auto',
                                userSelect: 'text',
                                color: '#2d3748',
                                fontWeight: '500'
                            }}
                            autoComplete="off"
                            spellCheck="false"
                            tabIndex="0"
                        />
                        <motion.button
                            className="send-btn"
                            onClick={() => sendMessage(inputMessage)}
                            disabled={isLoading || !inputMessage.trim()}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {isLoading ? '⏳' : '🚀'}
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <QuizCreatorModal
                isOpen={modals.quizCreator}
                onClose={() => closeModal('quizCreator')}
                onSubmit={(formData) => {
                    generateQuiz(formData.topic, formData.difficulty, formData.questionCount);
                }}
            />

            <QuizPreviewModal
                isOpen={modals.quizPreview}
                onClose={() => closeModal('quizPreview')}
                quiz={modalData.quizPreview}
                onTakeQuiz={(quizId) => {
                    handleQuickAction('take_quiz', { quizId });
                }}
            />

            <ConceptModal
                isOpen={modals.concept}
                onClose={() => closeModal('concept')}
                onSubmit={(concept) => {
                    sendMessage(`Can you explain ${concept}?`, 'explanation');
                }}
            />

            <ReminderModal
                isOpen={modals.reminder}
                onClose={() => closeModal('reminder')}
                onSubmit={(reminderTime) => {
                    handleSetReminders(reminderTime);
                }}
            />

            <ErrorModal
                isOpen={modals.error}
                onClose={() => closeModal('error')}
                message={modalData.error.message}
                title={modalData.error.title}
            />
        </div>
    );
};

export default AIStudyBuddy;
