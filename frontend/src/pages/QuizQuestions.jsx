import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import "../App.css";
import "./QuizQuestions.css";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import Loading from "../components/Loading";

const QuizQuestions = () => {
    const { id } = useParams();  // Get quiz ID from URL
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);

    // Notification system
    const { notification, showSuccess, showError, hideNotification } = useNotification();

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            navigate("/admin/create");
        },
    }, [navigate]);

    // Fetch the quiz data with questions
    const getQuizDetails = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/quizzes/${id}`);
            setQuiz(response.data);
        } catch (error) {
            console.error("Error fetching quiz details:", error);
            showError("Failed to fetch quiz details.");
        } finally {
            setLoading(false);
        }
    }, [id, showError]);

    useEffect(() => {
        getQuizDetails();
    }, [getQuizDetails]);

    // ✅ Delete a question from the quiz
    const deleteQuestion = async (questionIndex) => {
        if (!window.confirm("Are you sure you want to delete this question?")) return;

        try {
            await axios.delete(`/api/quizzes/${id}/questions/${questionIndex}`);
            showSuccess("Question deleted successfully!");
            getQuizDetails();
        } catch (error) {
            console.error("Error deleting question:", error);
            showError("Failed to delete question.");
        }
    };

    if (loading) return <Loading fullScreen={true} />;

    return (
        <motion.div
            className="quiz-questions-container"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
        >
            <motion.button
                className="back-btn"
                onClick={() => navigate("/admin/create")}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                whileHover={{ scale: 1.05, x: -5 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Go back to admin quizzes page (Escape)"
                title="Back to Quizzes (Escape)"
            >
                🔙 Back to Quizzes
            </motion.button>

            {quiz ? (
                <motion.div
                    className="quiz-details"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                >
                    <motion.h2
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                    >
                        📖 {quiz.title} - Questions
                    </motion.h2>

                    <motion.div
                        className="quiz-info"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                    >
                        <p><strong>Category:</strong> {quiz.category}</p>
                        <p><strong>Duration:</strong> {quiz.duration} minutes</p>
                        <p><strong>Total Marks:</strong> {quiz.totalMarks}</p>
                        <p><strong>Passing Marks:</strong> {quiz.passingMarks}</p>
                    </motion.div>

                    <motion.div
                        className="question-list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                    >
                        {quiz.questions.length > 0 ? (
                            quiz.questions.map((q, index) => {
                                // Check if this is an admin quiz (createdBy._id is null)
                                const isAdminQuiz = !quiz.createdBy || !quiz.createdBy._id;

                                return (
                                    <motion.div
                                        key={index}
                                        className="question-box"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.7 + (index * 0.1), duration: 0.5 }}
                                        whileHover={{ scale: 1.02, y: -5 }}
                                    >
                                        <h3>{index + 1}. {q.question}</h3>
                                        <ul>
                                            {q.options.map((option, i) => (
                                                <motion.li
                                                    key={i}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.8 + (index * 0.1) + (i * 0.05), duration: 0.4 }}
                                                >
                                                    <strong>{String.fromCharCode(65 + i)}.</strong> {option}
                                                </motion.li>
                                            ))}
                                        </ul>
                                        <p className="correct-answer">
                                            <strong>Correct Answer:</strong> {q.correctAnswer}
                                        </p>
                                        <motion.button
                                            className="delete-btn"
                                            onClick={() => deleteQuestion(index)}
                                            disabled={isAdminQuiz}
                                            title={isAdminQuiz ? "Cannot delete questions from admin quizzes" : "Delete question"}
                                            whileHover={!isAdminQuiz ? { scale: 1.05, y: -2 } : {}}
                                            whileTap={!isAdminQuiz ? { scale: 0.95 } : {}}
                                            aria-label={isAdminQuiz ? "Cannot delete questions from admin quizzes" : `Delete question ${index + 1}`}
                                            aria-disabled={isAdminQuiz}
                                        >
                                            🗑️ Delete Question
                                        </motion.button>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <motion.div
                                className="no-questions"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.7, duration: 0.5 }}
                            >
                                <p>No questions added yet.</p>
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            ) : null}

            {/* Notification Modal */}
            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
                autoClose={notification.autoClose}
            />
        </motion.div>
    );
};

export default QuizQuestions;
