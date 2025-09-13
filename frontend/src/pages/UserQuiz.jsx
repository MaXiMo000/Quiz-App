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
            transition={{ duration: 0.2 }}
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
                    transition={{ duration: 0.2 }}
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
                                    duration: 0.2,
                                    delay: index * 0.02
                                }}
                                whileHover={{ y: -4 }}
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
                                            onClick={() => {
                                                // Enter fullscreen first, then navigate
                                                const enterFullScreen = () => {
                                                    const element = document.documentElement;
                                                    if (element.requestFullscreen) {
                                                        element.requestFullscreen().then(() => {
                                                            navigate(`/user/test/${quiz._id}`);
                                                        }).catch(err => {
                                                            console.warn("Fullscreen failed:", err);
                                                            navigate(`/user/test/${quiz._id}`);
                                                        });
                                                    } else if (element.mozRequestFullScreen) {
                                                        element.mozRequestFullScreen();
                                                        navigate(`/user/test/${quiz._id}`);
                                                    } else if (element.webkitRequestFullscreen) {
                                                        element.webkitRequestFullscreen();
                                                        navigate(`/user/test/${quiz._id}`);
                                                    } else if (element.msRequestFullscreen) {
                                                        element.msRequestFullscreen();
                                                        navigate(`/user/test/${quiz._id}`);
                                                    } else {
                                                        navigate(`/user/test/${quiz._id}`);
                                                    }
                                                };
                                                enterFullScreen();
                                            }}
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

            {/* Optimized floating decorative elements */}
            <div className="floating-element floating-quiz-1" />
            <div className="floating-element floating-quiz-2" />
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
