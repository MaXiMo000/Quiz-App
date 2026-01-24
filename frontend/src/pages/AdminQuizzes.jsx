import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios";
import "../App.css";
import "./AdminQuizzes.css";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import Loading from "../components/Loading";

const AdminQuizzes = () => {
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

        // Add class to body for CSS targeting
        document.body.classList.add('admin-quizzes-page');
        document.documentElement.classList.add('admin-quizzes-page');

        // Cleanup on unmount
        return () => {
            document.body.classList.remove('admin-quizzes-page');
            document.documentElement.classList.remove('admin-quizzes-page');
        };
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

    if (loading) return <Loading fullScreen={true} />;

    if (error) return (
        <motion.div
            className="admin-quiz-container main-content"
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
            className="admin-quiz-container main-content"
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
                        🛡️
                    </span>
                    Admin Quizzes
                </motion.h2>
                <button
                    className="create-btn"
                    onClick={() => document.getElementById("create_quiz_modal").showModal()}
                >
                    <span>
                        ➕
                    </span>
                    Create Quiz
                </button>
            </motion.div>

            <motion.div
                className="quiz-list"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
            >
                <AnimatePresence>
                    {quizzes.length === 0 ? (
                        <motion.div
                            className="empty-state"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="empty-icon">📚</div>
                            <h3>No Quizzes Yet</h3>
                            <p>Create your first quiz to get started!</p>
                        </motion.div>
                    ) : (
                        quizzes.map((quiz, index) => (
                            <motion.div
                                key={quiz._id}
                                className={`quiz-box ${quiz.createdBy?._id ? 'premium-box' : 'admin-box'}`}
                                initial={{ x: -100, opacity: 0, scale: 0.9 }}
                                animate={{ x: 0, opacity: 1, scale: 1 }}
                                exit={{ x: 100, opacity: 0, scale: 0.9 }}
                                transition={{
                                    duration: 0.5,
                                    delay: index * 0.1,
                                    type: "spring",
                                    stiffness: 100
                                }}
                                whileHover={{
                                    y: -8,
                                    scale: 1.02,
                                    transition: { duration: 0.2 }
                                }}
                            >
                                {quiz.createdBy?._id ? (
                                    <div className="premium-badge">
                                        <span>
                                            👑
                                        </span>
                                        PREMIUM
                                    </div>
                                ) : (
                                    <div className="admin-badge">
                                        <span>
                                            ⚡
                                        </span>
                                        ADMIN
                                    </div>
                                )}

                                <div className="quiz-content">
                                    <h3>
                                        {quiz.title}
                                    </h3>

                                    <div className="quiz-info">
                                        <p>
                                            <span className="info-icon">🏷️</span>
                                            Category: {quiz.category}
                                        </p>
                                        <p>
                                            <span className="info-icon">⏰</span>
                                            Duration: {quiz.duration} minutes
                                        </p>
                                        <p>
                                            <span className="info-icon">📊</span>
                                            Total Marks: {quiz.totalMarks}
                                        </p>
                                        <p>
                                            <span className="info-icon">✅</span>
                                            Passing Marks: {quiz.passingMarks}
                                        </p>
                                    </div>

                                    <div className="quiz-actions">
                                        <button
                                            className="delete-btn admin-delete-btn"
                                            onClick={() => deleteQuiz(quiz.title)}
                                        >
                                            🗑️ Delete
                                        </button>

                                        <button
                                            className="add-ai-btn admin-ai-btn"
                                            onClick={() => openAiQuestionModal(quiz._id, quiz.category)}
                                        >
                                            <span>
                                                🤖
                                            </span>
                                            AI Questions
                                        </button>

                                        <button
                                            className="add-question-btn admin-add-btn"
                                            onClick={() => openAddQuestionModal(quiz._id)}
                                        >
                                            ➕ Add Question
                                        </button>

                                        <button
                                            className="view-questions-btn admin-view-btn"
                                            onClick={() => navigate(`/admin/quiz/${quiz._id}`)}
                                        >
                                            📜 View Questions
                                        </button>
                                    </div>

                                    <ul className={`display-ans ${quiz.createdBy?._id ? 'premium-questions' : 'admin-questions'}`}>
                                        {quiz.questions.map((q, i) => (
                                            <li key={i}>
                                                <div className="question-text">
                                                    <strong>Q{i + 1}:</strong> {q.question}
                                                </div>
                                                <div className={`correct-answer ${quiz.createdBy?._id ? 'premium-answer' : 'admin-answer'}`}>
                                                    {quiz.createdBy?._id ? '👑' : '⚡'} Answer: {q.options && q.options[['A', 'B', 'C', 'D'].indexOf(q.correctAnswer)] || q.correctAnswer}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className={quiz.createdBy?._id ? "premium-bg-effect" : "admin-bg-effect"}></div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </motion.div>

            {/* AI Question Generation Modal */}
            <dialog
                id="ai_question_modal"
                className="modal admin-modal"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        document.getElementById("ai_question_modal").close();
                    }
                }}
            >
                <div className="modal-box admin-modal-box">
                    <form onSubmit={handleAiSubmit}>
                        <button
                            type="button"
                            className="close-btn admin-close"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                document.getElementById("ai_question_modal").close();
                            }}
                        >
                            ✕
                        </button>

                        <h3 className="modal-title admin-title">
                            <span>
                                🤖
                            </span>
                            AI Question Generation
                        </h3>

                        <input
                            type="text"
                            name="aiTopic"
                            placeholder="Enter Topic"
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            required
                            className="admin-input"
                        />

                        <input
                            type="number"
                            name="aiNumQuestions"
                            placeholder="Number of Questions"
                            value={aiNumQuestions}
                            onChange={(e) => setAiNumQuestions(e.target.value)}
                            required
                            className="admin-input"
                        />

                        <button
                            className="submit-btn admin-submit"
                            disabled={isGeneratingAI}
                        >
                            {isGeneratingAI ? '⏳ Generating...' : '⚡ Generate Questions'}
                        </button>
                    </form>
                </div>
            </dialog>

            {/* Create Quiz Modal */}
            <dialog
                id="create_quiz_modal"
                className="modal admin-modal"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        document.getElementById("create_quiz_modal").close();
                    }
                }}
            >
                <div className="modal-box admin-modal-box">
                    <form onSubmit={createQuiz}>
                        <button
                            type="button"
                            className="close-btn admin-close"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                document.getElementById("create_quiz_modal").close();
                            }}
                        >
                            ✕
                        </button>

                        <h3 className="modal-title admin-title">
                            <span>
                                🛡️
                            </span>
                            Create New Quiz
                        </h3>

                        <input
                            type="text"
                            name="title"
                            placeholder="Enter Quiz Title"
                            required
                            className="admin-input"
                        />

                        <input
                            type="text"
                            name="category"
                            placeholder="Enter Quiz Category"
                            required
                            className="admin-input"
                        />

                        <button
                            className="submit-btn admin-submit"
                        >
                            ⚡ Create Quiz
                        </button>
                    </form>
                </div>
            </dialog>

            {/* Add Question Modal */}
            <dialog
                id="add_question_modal"
                className="modal admin-modal"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        document.getElementById("add_question_modal").close();
                    }
                }}
            >
                <motion.div
                    className="modal-box admin-modal-box"
                    initial={{ scale: 0.8, opacity: 0, rotateX: -10 }}
                    animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                    transition={{ duration: 0.3, type: "spring" }}
                >
                    <form onSubmit={addQuestion} className="question-form">
                        <button
                            type="button"
                            className="close-btn admin-close"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                document.getElementById("add_question_modal").close();
                            }}
                        >
                            ✕
                        </button>

                        <motion.h3
                            className="modal-title admin-title"
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            ➕ Add New Question
                        </motion.h3>

                        <motion.input
                            type="text"
                            name="question"
                            placeholder="📝 Enter your question"
                            className="form-input admin-input"
                            required
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            whileFocus={{ scale: 1.02 }}
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
                                className="form-input admin-input"
                                required
                                whileFocus={{ scale: 1.02 }}
                            />
                            <motion.input
                                type="text"
                                name="optionB"
                                placeholder="Option B"
                                className="form-input admin-input"
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
                                className="form-input admin-input"
                                required
                                whileFocus={{ scale: 1.02 }}
                            />
                            <motion.input
                                type="text"
                                name="optionD"
                                placeholder="Option D"
                                className="form-input admin-input"
                                required
                                whileFocus={{ scale: 1.02 }}
                            />
                        </motion.div>

                        <motion.select
                            name="difficulty"
                            defaultValue="medium"
                            className="form-select admin-select"
                            required
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            whileFocus={{ scale: 1.02 }}
                        >
                            <option value="easy">🌱 Easy</option>
                            <option value="medium">🌿 Medium</option>
                            <option value="hard">🔥 Hard</option>
                        </motion.select>

                        <motion.input
                            type="text"
                            name="correctAnswer"
                            placeholder="✅ Correct Answer (A/B/C/D)"
                            className="form-input admin-input"
                            required
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            whileFocus={{ scale: 1.02 }}
                        />

                        <motion.button
                            className="submit-btn admin-submit"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            ⚡ Add Question
                        </motion.button>
                    </form>
                </motion.div>
            </dialog>

            {/* Floating decorative elements */}
            <motion.div
                className="floating-element floating-admin-1"
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
                className="floating-element floating-admin-2"
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
                className="floating-element floating-admin-3"
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

export default AdminQuizzes;
