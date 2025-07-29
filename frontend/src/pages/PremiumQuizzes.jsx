import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios";
import "../App.css";
import "./PremiumQuizzes.css";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";

const PremiumQuizzes = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuizId, setSelectedQuizId] = useState(null);
    const [aiTopic, setAiTopic] = useState("");
    const [aiNumQuestions, setAiNumQuestions] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const navigate = useNavigate();

    // Notification system
    const { notification, showSuccess, showError, showWarning, hideNotification } = useNotification();

    const getQuiz = async () => {
        try {
            const response = await axios.get('/api/quizzes');
            setQuizzes(response.data);
        } catch (error) {
            console.error("Error fetching quizzes:", error);
            setError("Error fetching Quiz. Try again later.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getQuiz();
        
        // Ensure all modals are closed on page load
        const modals = ['ai_question_modal', 'create_quiz_modal', 'add_question_modal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && modal.hasAttribute('open')) {
                modal.close();
            }
        });
    }, []);

    const openAddQuestionModal = (quizId) => {
        if (!quizId) return showWarning("Please select a quiz first!");
        setSelectedQuizId(quizId);
        document.getElementById("add_question_modal").showModal();
    };

    const openAiQuestionModal = (quizId, category) => {
        setSelectedQuizId(quizId);
        setAiTopic(category);
        setAiNumQuestions(5);
        document.getElementById("ai_question_modal").showModal();
    };

    const handleAiSubmit = async (event) => {
        event.preventDefault();
        if (!aiTopic || aiNumQuestions <= 0) {
            showWarning("Please enter a valid topic and number of questions.");
            return;
        }

        setIsGeneratingAI(true);
        try {
            const response = await axios.post(
                `/api/quizzes/${selectedQuizId}/generate-questions`,
                {
                    topic: aiTopic,
                    numQuestions: Number(aiNumQuestions)
                },
                { headers: { "Content-Type": "application/json" } } 
            );

            if (response.status !== 200) {
                throw new Error(`Error Generating questions: ${response.status}`);
            }

            showSuccess("AI-generated questions added successfully!");
            document.getElementById("ai_question_modal").close();
            getQuiz();
        } catch (error) {
            console.error("Error generating AI questions:", error);
            showError("Failed to generate AI questions.");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const createQuiz = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const quizData = {
            title: formData.get("title"),
            category: formData.get("category"),
        };

        try {
            await axios.post('/api/quizzes', quizData);
            document.getElementById("create_quiz_modal").close();
            getQuiz();
        } catch (error) {
            console.error("Error creating quiz:", error);
            showError("Failed to create quiz. Check API response.");
        }
    };

    const addQuestion = async (event) => {
        event.preventDefault();
        if (!selectedQuizId) return showWarning("No quiz selected!");

        const formData = new FormData(event.target);
        const questionData = {
            question: formData.get("question"),
            options: [
                formData.get("optionA"),
                formData.get("optionB"),
                formData.get("optionC"),
                formData.get("optionD"),
            ],
            correctAnswer: formData.get("correctAnswer").toUpperCase(),
            difficulty: formData.get("difficulty"),
        };

        try {
            await axios.post(`/api/quizzes/${selectedQuizId}/questions`, questionData);
            document.getElementById("add_question_modal").close();
            getQuiz();
        } catch (error) {
            console.error("Error adding question:", error);
            showError("Failed to add question. Check API response.");
        }
    };

    const deleteQuiz = async (title) => {
        if (!title) return showWarning("Quiz title is missing!");

        try {
            const response = await axios.delete(`/api/quizzes/delete/quiz?title=${encodeURIComponent(title)}`);
            if (response.status === 200) {
                showSuccess("Quiz deleted successfully!");
                getQuiz();
            }
        } catch (error) {
            console.error("Error deleting quiz:", error);
            showError("Failed to delete quiz. Check the API response.");
        }
    };

    if (loading) return (
        <motion.div 
            className="premium-quiz-container main-content"
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
                    Loading Premium Quizzes...
                </motion.p>
            </div>
        </motion.div>
    );
    
    if (error) return (
        <motion.div 
            className="premium-quiz-container main-content"
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
        <motion.div 
            className="premium-quiz-container main-content"
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
                    <span className="header-icon">
                        💎
                    </span>
                    Premium Quizzes
                </motion.h2>
                <button 
                    className="create-btn" 
                    onClick={() => document.getElementById("create_quiz_modal").showModal()}
                >
                    <span>
                        ✨
                    </span>
                    Create Premium Quiz
                </button>
            </motion.div>

            <motion.div 
                className="quiz-list"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
            >
                <AnimatePresence>
                    {quizzes.map((quiz, _index) => (
                        <div 
                            key={quiz._id} 
                            className="quiz-box premium-box"
                        >
                            <div className="premium-badge">
                                <span>
                                    👑
                                </span>
                                PREMIUM
                            </div>
                            
                            <div className="quiz-content">
                                <h3>
                                    {quiz.title}
                                </h3>
                                
                                <div 
                                    className="quiz-info"
                                >
                                    <p>
                                        <span className="info-icon">🏆</span>
                                        Category: {quiz.category}
                                    </p>
                                    <p>
                                        <span className="info-icon">⏰</span>
                                        Duration: {quiz.duration} minutes
                                    </p>
                                    <p>
                                        <span className="info-icon">⭐</span>
                                        Total Marks: {quiz.totalMarks}
                                    </p>
                                    <p>
                                        <span className="info-icon">🎯</span>
                                        Passing Marks: {quiz.passingMarks}
                                    </p>
                                </div>

                                <div 
                                    className="quiz-actions"
                                >
                                    <button 
                                        className="delete-btn premium-delete-btn" 
                                        onClick={() => deleteQuiz(quiz.title)}
                                    >
                                        🗑️ Delete
                                    </button>
                                    
                                    <button 
                                        className="add-ai-btn premium-ai-btn" 
                                        onClick={() => openAiQuestionModal(quiz._id, quiz.category)}
                                    >
                                        <span>
                                            🤖
                                        </span>
                                        AI Premium
                                    </button>
                                    
                                    <button 
                                        className="add-question-btn premium-add-btn" 
                                        onClick={() => openAddQuestionModal(quiz._id)}
                                    >
                                        ➕ Add Question
                                    </button>
                                    
                                    <button 
                                        className="view-questions-btn premium-view-btn" 
                                        onClick={() => navigate(`/premium/quiz/${quiz._id}`)}
                                    >
                                        📜 View Questions
                                    </button>
                                </div>

                                <ul 
                                    className="display-ans premium-questions"
                                >
                                    {quiz.questions.map((q, i) => (
                                        <li 
                                            key={i}
                                        >
                                            <div className="question-text">
                                                <strong>Q{i + 1}:</strong> {q.question}
                                            </div>
                                            <div className="correct-answer premium-answer">
                                                ✨ Answer: {q.options && q.options[['A', 'B', 'C', 'D'].indexOf(q.correctAnswer)] || q.correctAnswer}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            <div className="premium-bg-effect"></div>
                        </div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* AI Question Generation Modal */}
            <dialog 
                id="ai_question_modal" 
                className="modal premium-modal"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        document.getElementById("ai_question_modal").close();
                    }
                }}
            >
                <div 
                    className="modal-box premium-modal-box"
                >
                    <form onSubmit={handleAiSubmit}>
                        <button 
                            type="button"
                            className="close-btn premium-close"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                document.getElementById("ai_question_modal").close();
                            }}
                        >
                            ✕
                        </button>

                        <h3 
                            className="modal-title premium-title"
                        >
                            <span>
                                🤖
                            </span>
                            Premium AI Generation
                        </h3>
                        
                        <input 
                            type="text" 
                            name="aiTopic" 
                            placeholder="Enter Premium Topic" 
                            value={aiTopic} 
                            onChange={(e) => setAiTopic(e.target.value)} 
                            required 
                        />
                        
                        <input 
                            type="number" 
                            name="aiNumQuestions" 
                            placeholder="Number of Premium Questions" 
                            value={aiNumQuestions} 
                            onChange={(e) => setAiNumQuestions(e.target.value)} 
                            required 
                        />
                        
                        <button 
                            className="submit-btn premium-submit"
                            disabled={isGeneratingAI}
                        >
                            {isGeneratingAI ? '⏳ Generating...' : '✨ Generate Premium Questions'}
                        </button>
                    </form>
                </div>
            </dialog>

            {/* Create Quiz Modal */}
            <dialog 
                id="create_quiz_modal" 
                className="modal premium-modal"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        document.getElementById("create_quiz_modal").close();
                    }
                }}
            >
                <div 
                    className="modal-box premium-modal-box"
                >
                    <form onSubmit={createQuiz}>
                        <button 
                            type="button"
                            className="close-btn premium-close"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                document.getElementById("create_quiz_modal").close();
                            }}
                        >
                            ✕
                        </button>
                        
                        <h3 
                            className="modal-title premium-title"
                        >
                            <span>
                                💎
                            </span>
                            Create Premium Quiz
                        </h3>
                        
                        <input 
                            type="text" 
                            name="title" 
                            placeholder="Enter Premium Quiz Title" 
                            required 
                        />
                        
                        <input 
                            type="text" 
                            name="category" 
                            placeholder="Enter Premium Category" 
                            required 
                        />
                        
                        <button 
                            className="submit-btn premium-submit"
                        >
                            ✨ Create Premium Quiz
                        </button>
                    </form>
                </div>
            </dialog>

            {/* Add Question Modal */}
            <dialog 
                id="add_question_modal" 
                className="modal premium-modal"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        document.getElementById("add_question_modal").close();
                    }
                }}
            >
                <motion.div 
                    className="modal-box premium-modal-box"
                    initial={{ scale: 0.8, opacity: 0, rotateX: -10 }}
                    animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                    transition={{ duration: 0.3, type: "spring" }}
                >
                    <form onSubmit={addQuestion} className="question-form">
                        <button 
                            type="button"
                            className="close-btn premium-close"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                document.getElementById("add_question_modal").close();
                            }}
                        >
                            ✕
                        </button>

                        <motion.h3 
                            className="modal-title premium-title"
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            ➕ Add Premium Question
                        </motion.h3>

                        <motion.input 
                            type="text" 
                            name="question" 
                            placeholder="💎 Enter premium question" 
                            className="form-input" 
                            required 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(251, 191, 36, 0.3)" }}
                        />

                        <motion.div 
                            className="option-pair"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <motion.input 
                                type="text" 
                                name="optionA" 
                                placeholder="Option A" 
                                className="form-input" 
                                required 
                                whileFocus={{ scale: 1.02 }}
                            />
                            <motion.input 
                                type="text" 
                                name="optionB" 
                                placeholder="Option B" 
                                className="form-input" 
                                required 
                                whileFocus={{ scale: 1.02 }}
                            />
                        </motion.div>
                        
                        <motion.div 
                            className="option-pair"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <motion.input 
                                type="text" 
                                name="optionC" 
                                placeholder="Option C" 
                                className="form-input" 
                                required 
                                whileFocus={{ scale: 1.02 }}
                            />
                            <motion.input 
                                type="text" 
                                name="optionD" 
                                placeholder="Option D" 
                                className="form-input" 
                                required 
                                whileFocus={{ scale: 1.02 }}
                            />
                        </motion.div>

                        <motion.select 
                            name="difficulty" 
                            defaultValue="medium" 
                            className="form-select" 
                            required
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(251, 191, 36, 0.3)" }}
                        >
                            <option value="easy">💎 Premium Easy</option>
                            <option value="medium">⭐ Premium Medium</option>
                            <option value="hard">🔥 Premium Hard</option>
                        </motion.select>

                        <motion.input 
                            type="text" 
                            name="correctAnswer" 
                            placeholder="✨ Correct Answer (A/B/C/D)" 
                            className="form-input" 
                            required 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(251, 191, 36, 0.3)" }}
                        />

                        <motion.button 
                            className="submit-btn premium-submit"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(251, 191, 36, 0.3)" }}
                            whileTap={{ scale: 0.95 }}
                        >
                            ✨ Add Premium Question
                        </motion.button>
                    </form>
                </motion.div>
            </dialog>
            
            {/* Floating decorative elements */}
            <motion.div
                className="floating-element floating-premium-1"
                animate={{
                    y: [0, -25, 0],
                    x: [0, 15, 0],
                    rotate: [0, 180, 360]
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                className="floating-element floating-premium-2"
                animate={{
                    y: [0, 20, 0],
                    x: [0, -20, 0],
                    rotate: [0, -180, -360]
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 3
                }}
            />
            <motion.div
                className="floating-element floating-premium-3"
                animate={{
                    y: [0, -30, 0],
                    x: [0, 25, 0],
                    scale: [1, 1.3, 1]
                }}
                transition={{
                    duration: 14,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 5
                }}
            />
            
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

export default PremiumQuizzes;
