import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios";
import "../App.css";
import "./AdminQuizzes.css";
import NotificationModal from "../components/NotificationModal";
import CustomDropdown from "../components/CustomDropdown";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { debounce } from "../utils/componentUtils";
import { handlePageChangeWithScrollPreservation, restoreScrollPosition } from "../utils/paginationUtils";
import Loading from "../components/Loading";

// Memoized Quiz Box Component
const AdminQuizBox = memo(({ quiz, index, openAddQuestionModal, openAiQuestionModal, deleteQuiz, navigate }) => {
    const isAdminQuiz = !quiz.createdBy || !quiz.createdBy._id;

    return (
        <motion.div
            key={quiz._id}
            className={`quiz-box ${isAdminQuiz ? 'admin-box' : 'premium-box'}`}
            initial={{ x: -100, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 100, opacity: 0, scale: 0.9 }}
            transition={{
                duration: 0.5,
                delay: index * 0.05,
                type: "spring",
                stiffness: 100
            }}
            whileHover={{
                y: -8,
                scale: 1.02,
                transition: { duration: 0.2 }
            }}
        >
            {isAdminQuiz ? (
                <div className="admin-badge">
                    <span>⚡</span>
                    ADMIN
                </div>
            ) : (
                <div className="premium-badge">
                    <span>👑</span>
                    PREMIUM
                </div>
            )}

            <div className="quiz-content">
                <h3>{quiz.title}</h3>

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

                <div className="quiz-actions" role="group" aria-label={`Actions for quiz: ${quiz.title}`}>
                    <button
                        className="delete-btn admin-delete-btn"
                        aria-label={`Delete quiz: ${quiz.title}`}
                        onClick={() => deleteQuiz(quiz.title)}
                    >
                        🗑️ Delete
                    </button>

                    <button
                        className="add-ai-btn admin-ai-btn"
                        onClick={() => openAiQuestionModal(quiz._id, quiz.category)}
                        aria-label={`Generate AI questions for ${quiz.title}`}
                    >
                        <span>🤖</span>
                        AI Questions
                    </button>

                    <button
                        className="add-question-btn admin-add-btn"
                        onClick={() => openAddQuestionModal(quiz._id)}
                        aria-label={`Add manual question to ${quiz.title}`}
                    >
                        ➕ Add Question
                    </button>

                    <button
                        className="view-questions-btn admin-view-btn"
                        onClick={() => navigate(`/admin/quiz/${quiz._id}`)}
                        aria-label={`View and manage questions for ${quiz.title}`}
                    >
                        📜 View Questions
                    </button>
                </div>

                <ul className={`display-ans ${isAdminQuiz ? 'admin-questions' : 'premium-questions'}`}>
                    {quiz.questions.map((q, i) => (
                        <li key={i}>
                            <div className="question-text">
                                <strong>Q{i + 1}:</strong> {q.question}
                            </div>
                            <div className={`correct-answer ${isAdminQuiz ? 'admin-answer' : 'premium-answer'}`}>
                                {isAdminQuiz ? '⚡' : '👑'} Answer: {q.options && q.options[['A', 'B', 'C', 'D'].indexOf(q.correctAnswer)] || q.correctAnswer}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className={isAdminQuiz ? "admin-bg-effect" : "premium-bg-effect"}></div>
        </motion.div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.quiz._id === nextProps.quiz._id &&
        prevProps.index === nextProps.index &&
        prevProps.quiz.questions?.length === nextProps.quiz.questions?.length
    );
});
AdminQuizBox.displayName = 'AdminQuizBox';

const AdminQuizzes = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuizId, setSelectedQuizId] = useState(null);
    const [aiTopic, setAiTopic] = useState("");
    const [aiNumQuestions, setAiNumQuestions] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const navigate = useNavigate();

    // Search, filter, and sort states (with localStorage persistence)
    const [searchQuery, setSearchQuery] = useState(() => {
        const saved = localStorage.getItem("adminQuizzes_searchQuery");
        return saved || "";
    });
    const [categoryFilter, setCategoryFilter] = useState(() => {
        const saved = localStorage.getItem("adminQuizzes_categoryFilter");
        return saved || "all";
    });
    const [sortBy, setSortBy] = useState(() => {
        const saved = localStorage.getItem("adminQuizzes_sortBy");
        return saved || "title";
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(() => {
        const saved = parseInt(localStorage.getItem("adminQuizzes_currentPage"), 10);
        return saved && !isNaN(saved) ? saved : 1;
    });
    const itemsPerPage = 10;
    const scrollPositionRef = useRef(0);

    // Debounced search query for filtering
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    const debouncedSetSearch = useRef(
        debounce((value) => {
            setDebouncedSearchQuery(value);
            localStorage.setItem("adminQuizzes_searchQuery", value);
        }, 300)
    ).current;

    // Notification system
    const { notification, showSuccess, showError, showWarning, hideNotification } = useNotification();

    // Persist filter changes to localStorage
    useEffect(() => {
        localStorage.setItem("adminQuizzes_categoryFilter", categoryFilter);
    }, [categoryFilter]);

    useEffect(() => {
        localStorage.setItem("adminQuizzes_sortBy", sortBy);
    }, [sortBy]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
        localStorage.setItem("adminQuizzes_currentPage", "1");
    }, [debouncedSearchQuery, categoryFilter, sortBy]);

    // Handle search input with debouncing
    useEffect(() => {
        debouncedSetSearch(searchQuery);
    }, [searchQuery, debouncedSetSearch]);

    // Extract unique categories for filter dropdown
    const uniqueCategories = useMemo(() => {
        const categories = [...new Set(quizzes.map(quiz => quiz.category).filter(Boolean))];
        return categories.sort();
    }, [quizzes]);

    // Filter and sort quizzes
    const filteredQuizzes = useMemo(() => {
        let filtered = [...quizzes];

        // Search filter (using debounced value)
        if (debouncedSearchQuery) {
            const query = debouncedSearchQuery.toLowerCase();
            filtered = filtered.filter(quiz =>
                quiz.title.toLowerCase().includes(query) ||
                quiz.category?.toLowerCase().includes(query)
            );
        }

        // Category filter
        if (categoryFilter !== "all") {
            filtered = filtered.filter(quiz => quiz.category === categoryFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case "duration":
                    return (a.duration || 0) - (b.duration || 0);
                case "questions":
                    return (b.questions?.length || 0) - (a.questions?.length || 0);
                case "marks":
                    return (b.totalMarks || 0) - (a.totalMarks || 0);
                case "category":
                    return (a.category || "").localeCompare(b.category || "");
                case "title":
                default:
                    return (a.title || "").localeCompare(b.title || "");
            }
        });

        return filtered;
    }, [quizzes, debouncedSearchQuery, categoryFilter, sortBy]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredQuizzes.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedQuizzes = filteredQuizzes.slice(startIndex, endIndex);

    // Ensure currentPage doesn't exceed totalPages
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
            localStorage.setItem("adminQuizzes_currentPage", totalPages.toString());
        }
    }, [totalPages]);

    // Persist currentPage to localStorage
    useEffect(() => {
        localStorage.setItem("adminQuizzes_currentPage", currentPage.toString());
    }, [currentPage]);

    // Scroll position preservation for pagination
    useEffect(() => {
        restoreScrollPosition(scrollPositionRef);
    }, [currentPage]);

    const getQuiz = useCallback(async () => {
        try {
            const response = await axios.get('/api/quizzes');
            setQuizzes(response.data);
        } catch (error) {
            console.error("Error fetching quizzes:", error);
            setError("Error fetching Quiz. Try again later.");
            showError("Error fetching Quiz. Try again later.");
        } finally {
            setLoading(false);
        }
    }, [showError]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            // Close any open modals
            const modals = ['ai_question_modal', 'create_quiz_modal', 'add_question_modal'];
            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal && modal.hasAttribute('open')) {
                    modal.close();
                }
            });
            // Clear search if active
            if (searchQuery) {
                setSearchQuery("");
            }
        },
        'Ctrl+F': (e) => {
            e.preventDefault();
            const searchInput = document.querySelector('.admin-quiz-search-input');
            if (searchInput) searchInput.focus();
        },
        'ArrowLeft': (e) => {
            if (currentPage > 1 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                e.stopPropagation();
                handlePageChangeWithScrollPreservation(
                    setCurrentPage,
                    scrollPositionRef,
                    currentPage - 1
                );
            }
        },
        'ArrowRight': (e) => {
            if (currentPage < totalPages && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                e.stopPropagation();
                handlePageChangeWithScrollPreservation(
                    setCurrentPage,
                    scrollPositionRef,
                    currentPage + 1
                );
            }
        },
    }, [searchQuery, currentPage, totalPages]);

    // Pagination handlers
    const handlePageChange = useCallback((newPage) => {
        handlePageChangeWithScrollPreservation(setCurrentPage, scrollPositionRef, newPage);
    }, []);

    const handlePrevPage = useCallback(() => {
        if (currentPage > 1) {
            handlePageChangeWithScrollPreservation(setCurrentPage, scrollPositionRef, currentPage - 1);
        }
    }, [currentPage]);

    const handleNextPage = useCallback(() => {
        if (currentPage < totalPages) {
            handlePageChangeWithScrollPreservation(setCurrentPage, scrollPositionRef, currentPage + 1);
        }
    }, [currentPage, totalPages]);

    // Memoized handlers
    const openAddQuestionModal = useCallback((quizId) => {
        if (!quizId) return showWarning("Please select a quiz first!");
        setSelectedQuizId(quizId);
        document.getElementById("add_question_modal").showModal();
    }, [showWarning]);

    const openAiQuestionModal = useCallback((quizId, category) => {
        setSelectedQuizId(quizId);
        setAiTopic(category);
        setAiNumQuestions(5);
        document.getElementById("ai_question_modal").showModal();
    }, []);

    const deleteQuiz = useCallback(async (title) => {
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
    }, [showWarning, showSuccess, showError, getQuiz]);

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
                    aria-label="Create a new quiz"
                >
                    <span>
                        ➕
                    </span>
                    Create Quiz
                </button>
            </motion.div>

            {/* Search and Filter Controls */}
            <motion.div
                className="admin-quiz-controls"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
            >
                <div className="admin-quiz-search-wrapper">
                    <input
                        type="text"
                        className="admin-quiz-search-input"
                        placeholder="Search quizzes by title or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search quizzes"
                    />
                    {searchQuery && (
                        <button
                            className="admin-quiz-search-clear"
                            onClick={() => setSearchQuery("")}
                            aria-label="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="admin-quiz-filters">
                    <CustomDropdown
                        value={categoryFilter}
                        onChange={setCategoryFilter}
                        options={[
                            { value: "all", label: "All Categories" },
                            ...uniqueCategories.map(cat => ({ value: cat, label: cat }))
                        ]}
                        placeholder="Filter by Category"
                        ariaLabel="Filter quizzes by category"
                    />

                    <CustomDropdown
                        value={sortBy}
                        onChange={setSortBy}
                        options={[
                            { value: "title", label: "Sort by Title" },
                            { value: "category", label: "Sort by Category" },
                            { value: "duration", label: "Sort by Duration" },
                            { value: "questions", label: "Sort by Questions" },
                            { value: "marks", label: "Sort by Marks" }
                        ]}
                        placeholder="Sort by"
                        ariaLabel="Sort quizzes"
                    />
                </div>
            </motion.div>

            {/* Results Count */}
            {filteredQuizzes.length !== quizzes.length && (
                <motion.div
                    className="admin-quiz-results-info"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <span className="results-highlight">
                        Showing {filteredQuizzes.length} of {quizzes.length} quizzes
                    </span>
                    {(searchQuery || categoryFilter !== "all") && (
                        <button
                            className="results-clear-filters"
                            onClick={() => {
                                setSearchQuery("");
                                setCategoryFilter("all");
                            }}
                        >
                            Clear filters
                        </button>
                    )}
                </motion.div>
            )}

            <motion.div
                className="quiz-list"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
            >
                <AnimatePresence mode="wait">
                    {filteredQuizzes.length === 0 ? (
                        <motion.div
                            key="empty"
                            className="empty-state admin-empty-state"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.5 }}
                        >
                            <motion.div
                                className="empty-icon"
                                animate={{
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 10, -10, 0]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity
                                }}
                            >
                                📚
                            </motion.div>
                            <h3>
                                {searchQuery || categoryFilter !== "all"
                                    ? "No Quizzes Match Your Filters"
                                    : "No Quizzes Yet"}
                            </h3>
                            <p>
                                {searchQuery || categoryFilter !== "all"
                                    ? "Try adjusting your search or filter criteria to find more quizzes."
                                    : "Create your first quiz to get started!"}
                            </p>
                            {(searchQuery || categoryFilter !== "all") && (
                                <button
                                    className="empty-clear-filters"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setCategoryFilter("all");
                                    }}
                                >
                                    Clear filters
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="quizzes"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {paginatedQuizzes.map((quiz, index) => (
                                <AdminQuizBox
                                    key={quiz._id}
                                    quiz={quiz}
                                    index={index}
                                    openAddQuestionModal={openAddQuestionModal}
                                    openAiQuestionModal={openAiQuestionModal}
                                    deleteQuiz={deleteQuiz}
                                    navigate={navigate}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
                <motion.div
                    className="admin-quiz-pagination"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                >
                    <button
                        className="pagination-btn"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                    >
                        ← Prev
                    </button>

                    <div className="pagination-numbers">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 1 && page <= currentPage + 1)
                            ) {
                                return (
                                    <button
                                        key={page}
                                        className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => handlePageChange(page)}
                                        aria-label={`Page ${page}`}
                                        aria-current={currentPage === page ? 'page' : undefined}
                                    >
                                        {page}
                                    </button>
                                );
                            } else if (
                                page === currentPage - 2 ||
                                page === currentPage + 2
                            ) {
                                return <span key={page} className="pagination-ellipsis">...</span>;
                            }
                            return null;
                        })}
                    </div>

                    <button
                        className="pagination-btn"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                    >
                        Next →
                    </button>
                </motion.div>
            )}

            {/* Pagination Info */}
            {totalPages > 1 && (
                <motion.div
                    className="pagination-info"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.7 }}
                >
                    Page {currentPage} of {totalPages} • Showing {startIndex + 1}-{Math.min(endIndex, filteredQuizzes.length)} of {filteredQuizzes.length} quizzes
                </motion.div>
            )}

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
