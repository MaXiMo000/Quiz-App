import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "../App.css";
import "./UserQuiz.css";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import ShareQuizModal from "../components/ShareQuizModal";

const UserQuiz = () => {
    const [quizzes, setQuizzes] = useState([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState(null);

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const response = await axios.get(`/api/quizzes`); // auto-token
                setQuizzes(response.data);
            } catch (error) {
                console.error("Error fetching quizzes:", error);
                setError("Error fetching Quiz. Try again later.");
            }
            finally{
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, []);

    const handleQuizShared = (groupCount) => {
        // Show success message
        alert(`Quiz shared successfully with ${groupCount} group${groupCount !== 1 ? 's' : ''}!`);
    };

    if (loading) return (
        <div className="user-quiz-container">
            <div className="loading-container">
                <div className="loading-spinner">
                    <div className="spinner-ring"></div>
                </div>
                <p className="loading-text">
                    Loading Available Quizzes...
                </p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="user-quiz-container">
            <div className="error-container">
                <p className="error-message">{error}</p>
            </div>
        </div>
    );

    return (
        <>
        <motion.div 
            className="user-quiz-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className="quiz-header">
                <h2>
                    <span className="header-icon">📚</span>
                    Available Quizzes
                </h2>
                <p className="quiz-subtitle">
                    Choose a quiz to test your knowledge and skills
                </p>
            </div>

            {quizzes.length === 0 ? (
                <div className="no-quizzes">
                    <div className="empty-state">
                        <span className="empty-icon">📝</span>
                        <h3>No Quizzes Available</h3>
                        <p>Check back later for new quizzes!</p>
                    </div>
                </div>
            ) : (
                <motion.div 
                    className="quiz-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <AnimatePresence>
                        {quizzes.map((quiz, index) => (
                            <motion.div
                                key={quiz._id}
                                className="quiz-card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ 
                                    duration: 0.3, 
                                    delay: index * 0.05
                                }}
                                whileHover={{ y: -8 }}
                                layout
                            >
                                <div className="quiz-card-content">
                                    <div className="quiz-icon">
                                        🎯
                                    </div>
                                    
                                    <h3 className="quiz-title">
                                        {quiz.title}
                                    </h3>
                                    
                                    <div className="quiz-details">
                                        <div className="detail-item">
                                            <span className="detail-icon">🏷️</span>
                                            <span>Category: {quiz.category}</span>
                                        </div>
                                        
                                        <div className="detail-item">
                                            <span className="detail-icon">⏱️</span>
                                            <span>Duration: {quiz.duration} minutes</span>
                                        </div>
                                        
                                        <div className="detail-item">
                                            <span className="detail-icon">📊</span>
                                            <span>Questions: {quiz.questions?.length || 0}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="quiz-actions">
                                        <button 
                                            className="start-quiz-btn"
                                            onClick={() => navigate(`/user/test/${quiz._id}`)}
                                        >
                                            <span>🚀</span>
                                            Start Quiz
                                        </button>
                                        
                                        <button 
                                            className="share-quiz-btn"
                                            onClick={() => {
                                                setSelectedQuiz(quiz);
                                                setShareModalOpen(true);
                                            }}
                                        >
                                            <span>📤</span>
                                            Share
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="quiz-card-bg-effect"></div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
            
            {/* Floating decorative elements */}
            <motion.div
                className="floating-element floating-quiz-1"
                animate={{
                    y: [0, -20, 0],
                    x: [0, 10, 0],
                    rotate: [0, 180, 360]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                className="floating-element floating-quiz-2"
                animate={{
                    y: [0, 15, 0],
                    x: [0, -15, 0],
                    rotate: [0, -180, -360]
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
            />
            <motion.div
                className="floating-element floating-quiz-3"
                animate={{
                    y: [0, -25, 0],
                    x: [0, 20, 0],
                    scale: [1, 1.2, 1]
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 4
                }}
            />
        </motion.div>
        
        <ShareQuizModal 
            quiz={selectedQuiz}
            isOpen={shareModalOpen}
            onClose={() => {
                setShareModalOpen(false);
                setSelectedQuiz(null);
            }}
            onShare={handleQuizShared}
        />
        </>
    );
};

export default UserQuiz;