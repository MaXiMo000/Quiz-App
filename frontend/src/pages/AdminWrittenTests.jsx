import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios";
import Loading from "../components/Loading";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import "../App.css";
import "./AdminQuizzes.css"; // ✅ Use the enhanced styles as AdminQuizzes

const AdminWrittenTests = () => {
    const [tests, setTests] = useState([]); // ✅ Store written tests
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [duration, setDuration] = useState(30);
    const [selectedTestId, setSelectedTestId] = useState(null); // ✅ Track selected test
    const [newQuestion, setNewQuestion] = useState(""); // ✅ Store new question
    const [newMarks, setNewMarks] = useState(10); // ✅ Store new marks
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingTitle, setDeletingTitle] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);

    // Notification system
    const { notification, showSuccess, showError, hideNotification } = useNotification();

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            if (showCreateModal) {
                setShowCreateModal(false);
            }
            if (showQuestionModal) {
                setShowQuestionModal(false);
            }
        },
    }, [showCreateModal, showQuestionModal]);

    // ✅ Animation variants for enhanced user experience
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.5 }
        }
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.3 }
        },
        exit: {
            opacity: 0,
            scale: 0.8,
            transition: { duration: 0.2 }
        }
    };

    // ✅ Fetch written tests from backend
    const fetchTests = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/written-tests');
            setTests(response.data);
            setError("");
        } catch (error) {
            console.error("Error fetching written tests:", error);
            const errorMsg = "Error fetching Tests. Try again later.";
            setError(errorMsg);
            showError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTests();
    }, [fetchTests]);

    // ✅ Create a new written test
    const createTest = useCallback(async (event) => {
        event.preventDefault();

        try {
            await axios.post('/api/written-tests/create', {
                title,
                category,
                duration,
                questions: []
            });
            await fetchTests();
            setTitle("");
            setCategory("");
            setDuration(30);
            setShowCreateModal(false);
            showSuccess("Written test created successfully!");
        } catch (error) {
            console.error("Error creating written test:", error);
            const errorMsg = "Failed to create written test.";
            setError(errorMsg);
            showError(errorMsg);
        }
    }, [title, category, duration, fetchTests]);

    // ✅ Open the Add Question Modal
    const openAddQuestionModal = useCallback((testId) => {
        setSelectedTestId(testId);
        setShowQuestionModal(true);
    }, []);

    // ✅ Add a question to an existing test
    const addQuestion = useCallback(async (event) => {
        event.preventDefault();
        if (!selectedTestId) {
            const errorMsg = "No test selected!";
            setError(errorMsg);
            showError(errorMsg);
            return;
        }

        try {
            await axios.post(`/api/written-tests/${selectedTestId}/add-question`, {
                question: newQuestion,
                marks: newMarks
            });
            await fetchTests();
            setNewQuestion("");
            setNewMarks(10);
            setShowQuestionModal(false);
            showSuccess("Question added successfully!");
        } catch (error) {
            console.error("Error adding question:", error);
            const errorMsg = "Failed to add question.";
            setError(errorMsg);
            showError(errorMsg);
        }
    }, [selectedTestId, newQuestion, newMarks, fetchTests]);

    const deleteQuiz = useCallback(async (title) => {
        if (!title) {
            const errorMsg = "Quiz title is missing!";
            setError(errorMsg);
            showError(errorMsg);
            return;
        }

        try {
            setDeletingTitle(title);
            const response = await axios.delete(`/api/written-tests/delete/Test?title=${encodeURIComponent(title)}`);

            if (response.status === 200) {
                await fetchTests();
                showSuccess("Test deleted successfully!");
            }
        } catch (error) {
            console.error("Error deleting quiz:", error);
            const errorMsg = "Failed to delete quiz. Check the API response.";
            setError(errorMsg);
            showError(errorMsg);
        } finally {
            setDeletingTitle(null);
        }
    }, [fetchTests]);

    // ✅ Loading state with beautiful animation
    if (loading) {
        return <Loading fullScreen={true} />;
    }

    // ✅ Error state with motion animation
    if (error) {
        return (
            <motion.div
                className="error-container"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <p className="error-text">{error}</p>
                <motion.button
                    className="retry-btn"
                    onClick={() => {
                        setError("");
                        fetchTests();
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Try Again
                </motion.button>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="admin-quiz-container main-content"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div className="quiz-header" variants={itemVariants}>
                <h2>✍️ Manage Written Tests</h2>
                <motion.button
                    className="create-btn"
                    onClick={() => setShowCreateModal(true)}
                    whileHover={{ scale: 1.05, backgroundColor: "#4f46e5" }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    aria-label="Create a new written test"
                >
                    ➕ Create Written Test
                </motion.button>
            </motion.div>

            {/* ✅ List of Written Tests with beautiful animations */}
            <motion.div className="quiz-list" variants={itemVariants}>
                <AnimatePresence>
                    {tests.map((test, index) => (
                        <motion.div
                            key={test._id}
                            className="quiz-box"
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            transition={{ delay: index * 0.1 }}
                            whileHover={{
                                scale: 1.02,
                                boxShadow: "0 10px 30px rgba(99, 102, 241, 0.2)"
                            }}
                        >
                            <h3>{test.title}</h3>
                            <p>Category: {test.category}</p>
                            <p>Duration: {test.duration} minutes</p>
                            <p>Total Questions: {test.questions.length}</p>

                            <div className="quiz-actions" role="group" aria-label={`Actions for test: ${test.title}`}>
                                <motion.button
                                    className="delete-btn"
                                    onClick={() => deleteQuiz(test.title)}
                                    disabled={deletingTitle === test.title}
                                    whileHover={{ scale: 1.05, backgroundColor: "#ef4444" }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    aria-label={`Delete written test: ${test.title}`}
                                    aria-busy={deletingTitle === test.title}
                                >
                                    {deletingTitle === test.title ? "Deleting..." : "🗑️ Delete"}
                                </motion.button>

                                <motion.button
                                    className="add-question-btn"
                                    onClick={() => openAddQuestionModal(test._id)}
                                    whileHover={{ scale: 1.05, backgroundColor: "#10b981" }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    aria-label={`Add question to ${test.title}`}
                                >
                                    ➕ Add Question
                                </motion.button>

                                <motion.button
                                    className="view-questions-btn"
                                    onClick={() => navigate(`/admin/written-test/question/${test._id}`)}
                                    whileHover={{ scale: 1.05, backgroundColor: "#8b5cf6" }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    aria-label={`View and manage questions for ${test.title}`}
                                >
                                    📜 View Questions
                                </motion.button>
                            </div>

                            <motion.ul
                                className="display-ans"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                transition={{ delay: 0.3 }}
                            >
                                {test.questions.map((q, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                    >
                                        {q.question} <br />
                                        <b>Marks:</b> {q.marks}
                                    </motion.li>
                                ))}
                            </motion.ul>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* ✅ Create Test Modal with motion */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        className="modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            className="modal-box"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <form onSubmit={createTest}>
                                <motion.button
                                    type="button"
                                    className="close-btn"
                                    onClick={() => setShowCreateModal(false)}
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    transition={{ duration: 0.2 }}
                                    aria-label="Close create test modal (Escape)"
                                    title="Close Modal (Escape)"
                                >
                                    ✕
                                </motion.button>
                                <h3 className="modal-title">Create Written Test</h3>
                                <motion.input
                                    type="text"
                                    name="title"
                                    placeholder="Enter Test Title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    whileFocus={{ scale: 1.02, borderColor: "#6366f1" }}
                                    transition={{ duration: 0.2 }}
                                    aria-label="Test title"
                                    aria-required="true"
                                />
                                <motion.input
                                    type="text"
                                    name="category"
                                    placeholder="Enter Test Category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    required
                                    whileFocus={{ scale: 1.02, borderColor: "#6366f1" }}
                                    transition={{ duration: 0.2 }}
                                    aria-label="Test category"
                                    aria-required="true"
                                />
                                <motion.input
                                    type="number"
                                    name="duration"
                                    placeholder="Duration (minutes)"
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                                    required
                                    min="1"
                                    whileFocus={{ scale: 1.02, borderColor: "#6366f1" }}
                                    transition={{ duration: 0.2 }}
                                    aria-label="Test duration in minutes"
                                    aria-required="true"
                                />
                                <motion.button
                                    className="submit-btn"
                                    type="submit"
                                    whileHover={{ scale: 1.05, backgroundColor: "#4f46e5" }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    aria-label="Create written test"
                                >
                                    Create Test
                                </motion.button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ✅ Add Question Modal with motion */}
            <AnimatePresence>
                {showQuestionModal && (
                    <motion.div
                        className="modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowQuestionModal(false)}
                    >
                        <motion.div
                            className="modal-box"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <form onSubmit={addQuestion}>
                                <motion.button
                                    type="button"
                                    className="close-btn"
                                    onClick={() => setShowQuestionModal(false)}
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    transition={{ duration: 0.2 }}
                                    aria-label="Close add question modal (Escape)"
                                    title="Close Modal (Escape)"
                                >
                                    ✕
                                </motion.button>
                                <h3 className="modal-title">Add Question</h3>
                                <motion.textarea
                                    name="question"
                                    placeholder="Enter Question"
                                    value={newQuestion}
                                    onChange={(e) => setNewQuestion(e.target.value)}
                                    required
                                    whileFocus={{ scale: 1.02, borderColor: "#6366f1" }}
                                    transition={{ duration: 0.2 }}
                                    aria-label="Question text"
                                    aria-required="true"
                                />
                                <motion.input
                                    type="number"
                                    name="marks"
                                    placeholder="Marks"
                                    value={newMarks}
                                    onChange={(e) => setNewMarks(e.target.value)}
                                    required
                                    whileFocus={{ scale: 1.02, borderColor: "#6366f1" }}
                                    transition={{ duration: 0.2 }}
                                    aria-label="Question marks"
                                    aria-required="true"
                                />
                                <motion.button
                                    className="submit-btn"
                                    type="submit"
                                    whileHover={{ scale: 1.05, backgroundColor: "#4f46e5" }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    aria-label="Add question to test"
                                >
                                    Add Question
                                </motion.button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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

export default AdminWrittenTests;
