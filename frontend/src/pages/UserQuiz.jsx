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
        <motion.div 
            className="user-quiz-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="loading-container">
                <motion.div 
                    className="loading-spinner"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <div className="spinner-ring"></div>
                </motion.div>
                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="loading-text"
                >
                    Loading Available Quizzes...
                </motion.p>
            </div>
        </motion.div>
    );
    
    if (error) return (
        <motion.div 
            className="user-quiz-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div 
                className="error-container"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                <p className="error-message">{error}</p>
            </motion.div>
        </motion.div>
    );

    return (
        <>
        <motion.div 
            className="user-quiz-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            <motion.div
                className="quiz-header"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
            >
                <motion.h2
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <motion.span
                        className="header-icon"
                        animate={{ 
                            rotateY: [0, 360],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                            rotateY: { duration: 4, repeat: Infinity },
                            scale: { duration: 2, repeat: Infinity }
                        }}
                    >
                        📚
                    </motion.span>
                    Available Quizzes
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="quiz-subtitle"
                >
                    Choose a quiz to test your knowledge and skills
                </motion.p>
            </motion.div>

            {quizzes.length === 0 ? (
                <motion.div
                    className="no-quizzes"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <motion.div
                        className="empty-state"
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                    >
                        <span className="empty-icon">📝</span>
                        <h3>No Quizzes Available</h3>
                        <p>Check back later for new quizzes!</p>
                    </motion.div>
                </motion.div>
            ) : (
                <motion.div 
                    className="quiz-grid"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    <AnimatePresence>
                        {quizzes.map((quiz, index) => (
                            <motion.div
                                key={quiz._id}
                                className="quiz-card"
                                initial={{ x: -100, opacity: 0, scale: 0.8 }}
                                animate={{ x: 0, opacity: 1, scale: 1 }}
                                exit={{ x: 100, opacity: 0, scale: 0.8 }}
                                transition={{ 
                                    duration: 0.5, 
                                    delay: index * 0.1,
                                    type: "spring",
                                    stiffness: 100
                                }}
                                whileHover={{ 
                                    y: -15, 
                                    scale: 1.03,
                                    rotateY: 2,
                                    boxShadow: "0 25px 50px rgba(59, 130, 246, 0.25)"
                                }}
                                layout
                            >
                                <motion.div className="quiz-card-content">
                                    <motion.div 
                                        className="quiz-icon"
                                        animate={{ 
                                            rotate: [0, 5, -5, 0],
                                            scale: [1, 1.05, 1]
                                        }}
                                        transition={{ 
                                            duration: 4, 
                                            repeat: Infinity,
                                            delay: index * 0.2
                                        }}
                                    >
                                        🎯
                                    </motion.div>
                                    
                                    <motion.h3
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.5 + index * 0.1 }}
                                        className="quiz-title"
                                    >
                                        {quiz.title}
                                    </motion.h3>
                                    
                                    <motion.div 
                                        className="quiz-details"
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.6 + index * 0.1 }}
                                    >
                                        <motion.div 
                                            className="detail-item"
                                            whileHover={{ x: 5 }}
                                        >
                                            <span className="detail-icon">🏷️</span>
                                            <span>Category: {quiz.category}</span>
                                        </motion.div>
                                        
                                        <motion.div 
                                            className="detail-item"
                                            whileHover={{ x: 5 }}
                                        >
                                            <span className="detail-icon">⏱️</span>
                                            <span>Duration: {quiz.duration} minutes</span>
                                        </motion.div>
                                        
                                        <motion.div 
                                            className="detail-item"
                                            whileHover={{ x: 5 }}
                                        >
                                            <span className="detail-icon">📊</span>
                                            <span>Questions: {quiz.questions?.length || 0}</span>
                                        </motion.div>
                                    </motion.div>
                                    
                                    <div className="quiz-actions">
                                        <motion.button 
                                            className="start-quiz-btn"
                                            onClick={() => navigate(`/user/test/${quiz._id}`)}
                                            initial={{ y: 30, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.7 + index * 0.1 }}
                                            whileHover={{ 
                                                scale: 1.05,
                                                boxShadow: "0 10px 30px rgba(59, 130, 246, 0.3)",
                                                y: -2
                                            }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <motion.span
                                                animate={{ rotate: [0, 10, -10, 0] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            >
                                                🚀
                                            </motion.span>
                                            Start Quiz
                                        </motion.button>
                                        
                                        <motion.button 
                                            className="share-quiz-btn"
                                            onClick={() => {
                                                setSelectedQuiz(quiz);
                                                setShareModalOpen(true);
                                            }}
                                            initial={{ y: 30, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.8 + index * 0.1 }}
                                            whileHover={{ 
                                                scale: 1.05,
                                                boxShadow: "0 8px 25px rgba(34, 197, 94, 0.3)",
                                                y: -2
                                            }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <motion.span
                                                animate={{ scale: [1, 1.1, 1] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                            >
                                                📤
                                            </motion.span>
                                            Share
                                        </motion.button>
                                    </div>
                                </motion.div>
                                
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