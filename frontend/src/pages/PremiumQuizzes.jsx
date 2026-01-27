import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios";
import "../App.css";
import "./PremiumQuizzes.css";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import Loading from "../components/Loading";
import { debounce } from "../utils/componentUtils";
import CustomDropdown from "../components/CustomDropdown";

// Memoized Premium Quiz Box Component
const PremiumQuizBox = memo(({ quiz, index, isAdminQuiz, handleRestrictedAction, deleteQuiz, openAiQuestionModal, openAddQuestionModal, navigate }) => {
    return (
        <motion.div
            className="quiz-box premium-box"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
                duration: 0.3,
                delay: index * 0.05
            }}
            whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(251, 191, 36, 0.3)" }}
        >
            <div className="premium-badge">
                <span>
                    {isAdminQuiz(quiz) ? "🛡️" : "👑"}
                </span>
                {isAdminQuiz(quiz) ? "ADMIN QUIZ" : "PREMIUM"}
            </div>

            <div className="quiz-content">
                <h3>
                    {quiz.title}
                </h3>

                <div className="quiz-info">
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
                    role="group"
                    aria-label={`Actions for quiz: ${quiz.title}`}
                >
                    <button
                        className="delete-btn premium-delete-btn"
                        onClick={() => isAdminQuiz(quiz)
                            ? handleRestrictedAction("You cannot delete admin quizzes.")
                            : deleteQuiz(quiz.title)}
                        style={isAdminQuiz(quiz) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        aria-label={isAdminQuiz(quiz) ? "Cannot delete admin quizzes" : `Delete quiz: ${quiz.title}`}
                        aria-disabled={isAdminQuiz(quiz)}
                    >
                        🗑️ Delete
                    </button>

                    <button
                        className="add-ai-btn premium-ai-btn"
                        onClick={() => isAdminQuiz(quiz)
                            ? handleRestrictedAction("You cannot add AI questions to admin quizzes.")
                            : openAiQuestionModal(quiz._id, quiz.category)}
                        style={isAdminQuiz(quiz) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        aria-label={isAdminQuiz(quiz) ? "Cannot add AI questions to admin quizzes" : `Generate AI questions for ${quiz.title}`}
                        aria-disabled={isAdminQuiz(quiz)}
                    >
                        <span>
                            🤖
                        </span>
                        AI Premium
                    </button>

                    <button
                        className="add-question-btn premium-add-btn"
                        onClick={() => isAdminQuiz(quiz)
                            ? handleRestrictedAction("You cannot add questions to admin quizzes.")
                            : openAddQuestionModal(quiz._id)}
                        style={isAdminQuiz(quiz) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        aria-label={isAdminQuiz(quiz) ? "Cannot add questions to admin quizzes" : `Add manual question to ${quiz.title}`}
                        aria-disabled={isAdminQuiz(quiz)}
                    >
                        ➕ Add Question
                    </button>

                    <button
                        className="view-questions-btn premium-view-btn"
                        aria-label={`View and manage questions for ${quiz.title}`}
                        onClick={() => navigate(`/premium/quiz/${quiz._id}`)}
                    >
                        📜 View Questions
                    </button>
                </div>

                <ul className="display-ans premium-questions">
                    {quiz.questions.map((q, i) => (
                        <li key={i}>
                            <div className="question-text">
                                <strong>Q{i + 1}:</strong> {q.question}
                            </div>
                            <div className="correct-answer premium-answer">
                                ✨ Answer: {q.options && q.options[['A', 'B', 'C', 'D'].indexOf(q.correctAnswer)] || q.correctAnswer}
                            </div>
                        </li>
                    ))}
                </ul>

                <div className="premium-bg-effect"></div>
            </div>
        </motion.div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.quiz._id === nextProps.quiz._id &&
        prevProps.index === nextProps.index
    );
});

PremiumQuizBox.displayName = 'PremiumQuizBox';

const PremiumQuizzes = () => {
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
        const saved = localStorage.getItem("premiumQuizzes_searchQuery");
        return saved || "";
    });
    const [categoryFilter, setCategoryFilter] = useState(() => {
        const saved = localStorage.getItem("premiumQuizzes_categoryFilter");
        return saved || "all";
    });
    const [sortBy, setSortBy] = useState(() => {
        const saved = localStorage.getItem("premiumQuizzes_sortBy");
        return saved || "title";
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(() => {
        const saved = parseInt(localStorage.getItem("premiumQuizzes_currentPage"), 10);
        return saved && !isNaN(saved) ? saved : 1;
    });
    const itemsPerPage = 10;
    const scrollPositionRef = useRef(0);

    // Debounced search query for filtering
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    const debouncedSetSearch = useRef(
        debounce((value) => {
            setDebouncedSearchQuery(value);
            localStorage.setItem("premiumQuizzes_searchQuery", value);
        }, 300)
    ).current;

    // Notification system
    const { notification, showSuccess, showError, showWarning, hideNotification } = useNotification();

    // Persist filter changes to localStorage
    useEffect(() => {
        localStorage.setItem("premiumQuizzes_categoryFilter", categoryFilter);
    }, [categoryFilter]);

    useEffect(() => {
        localStorage.setItem("premiumQuizzes_sortBy", sortBy);
    }, [sortBy]);

    // Reset to page 1 when filters change
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
            localStorage.setItem("premiumQuizzes_currentPage", "1");
        }
    }, [debouncedSearchQuery, categoryFilter, sortBy]);

    // Persist current page
    useEffect(() => {
        localStorage.setItem("premiumQuizzes_currentPage", currentPage.toString());
    }, [currentPage]);

    // Handle search input with debouncing
    useEffect(() => {
        debouncedSetSearch(searchQuery);
    }, [searchQuery, debouncedSetSearch]);

    // Get unique categories from quizzes
    const categories = useMemo(() => {
        const cats = new Set(quizzes.map(q => q.category).filter(Boolean));
        return Array.from(cats).sort();
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
            localStorage.setItem("premiumQuizzes_currentPage", totalPages.toString());
        }
    }, [currentPage, totalPages]);

    // Preserve scroll position when page changes
    useEffect(() => {
        // Only restore scroll if we have a saved position (user clicked pagination)
        if (scrollPositionRef.current > 0) {
            // Immediately prevent any scroll
            const savedScroll = scrollPositionRef.current;

            // Use multiple requestAnimationFrame calls to ensure DOM has fully updated
            const restoreScroll = () => {
                const maxScroll = Math.max(
                    document.documentElement.scrollHeight - window.innerHeight,
                    0
                );
                const targetScroll = Math.min(savedScroll, maxScroll);
                if (targetScroll >= 0) {
                    // Temporarily disable scroll behavior
                    const originalScrollBehavior = document.documentElement.style.scrollBehavior;
                    document.documentElement.style.scrollBehavior = 'auto';

                    window.scrollTo({
                        top: targetScroll,
                        behavior: 'auto'
                    });

                    // Restore scroll behavior after a short delay
                    setTimeout(() => {
                        document.documentElement.style.scrollBehavior = originalScrollBehavior;
                    }, 50);
                }
            };

            // Prevent scroll immediately
            restoreScroll();

            // Also restore after animations complete
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(restoreScroll);
                });
            });
        }
    }, [currentPage, paginatedQuizzes]);

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
            // Focus search input
            const searchInput = document.querySelector('.premium-search-input');
            if (searchInput) {
                e.preventDefault();
                e.stopPropagation();
                searchInput.focus();
                if (searchInput.select) {
                    searchInput.select();
                }
            }
        },
        'ArrowLeft': (e) => {
            // Navigate to previous page if not in input field
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && currentPage > 1) {
                e.preventDefault();
                e.stopPropagation();
                // Save scroll position before page change
                const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                scrollPositionRef.current = currentScroll;

                // Prevent scroll during state update
                const preventScroll = () => {
                    window.scrollTo({
                        top: currentScroll,
                        behavior: 'auto'
                    });
                };

                setCurrentPage(prev => prev - 1);

                // Prevent scroll during render
                requestAnimationFrame(preventScroll);
                setTimeout(preventScroll, 0);
            }
        },
        'ArrowRight': (e) => {
            // Navigate to next page if not in input field
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && currentPage < totalPages) {
                e.preventDefault();
                e.stopPropagation();
                // Save scroll position before page change
                const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                scrollPositionRef.current = currentScroll;

                // Prevent scroll during state update
                const preventScroll = () => {
                    window.scrollTo({
                        top: currentScroll,
                        behavior: 'auto'
                    });
                };

                setCurrentPage(prev => prev + 1);

                // Prevent scroll during render
                requestAnimationFrame(preventScroll);
                setTimeout(preventScroll, 0);
            }
        },
    }, [searchQuery, currentPage, totalPages]);

    const getQuiz = useCallback(async () => {
        try {
            const response = await axios.get('/api/quizzes');
            setQuizzes(response.data);
        } catch (error) {
            console.error("Error fetching quizzes:", error);
            setError("Error fetching Quiz. Try again later.");
        } finally {
            setLoading(false);
        }
    }, []);

    const isAdminQuiz = useCallback((quiz) => {
        return !quiz.createdBy || !quiz.createdBy._id || quiz.createdBy.name === "admin" || quiz.createdBy.name === "Admin";
    }, []);

    const handleRestrictedAction = useCallback((message) => {
        showWarning(message);
    }, [showWarning]);

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
        document.body.classList.add('premium-quizzes-page');
        document.documentElement.classList.add('premium-quizzes-page');

        // Cleanup on unmount
        return () => {
            document.body.classList.remove('premium-quizzes-page');
            document.documentElement.classList.remove('premium-quizzes-page');
        };
    }, []);

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
    }, [getQuiz, showSuccess, showError, showWarning]);

    if (loading) return <Loading fullScreen={true} />;

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
                <div className="quiz-header-text-wrapper">
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
                </div>
                <button
                    className="create-btn"
                    onClick={() => document.getElementById("create_quiz_modal").showModal()}
                    aria-label="Create a new premium quiz"
                >
                    <span>
                        ✨
                    </span>
                    Create Premium Quiz
                </button>
            </motion.div>

            {/* Search, Filter, and Sort Controls */}
            <motion.div
                className="premium-quiz-controls"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="premium-search-container">
                    <div className="premium-search-wrapper">
                        <input
                            type="text"
                            placeholder="🔍 Search premium quizzes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="premium-search-input"
                            aria-label="Search premium quizzes"
                            aria-describedby="premium-search-description"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="premium-search-clear"
                                onClick={() => setSearchQuery("")}
                                aria-label="Clear search"
                                title="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <span id="premium-search-description" className="sr-only">
                        Search premium quizzes by title or category
                    </span>
                </div>

                <div className="premium-filter-controls">
                    <CustomDropdown
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        options={[
                            { value: "all", label: "All Categories" },
                            ...categories.map(cat => ({ value: cat, label: cat }))
                        ]}
                        className="premium-filter-select"
                        ariaLabel="Filter by category"
                    />

                    <CustomDropdown
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        options={[
                            { value: "title", label: "Sort by Title" },
                            { value: "duration", label: "Sort by Duration" },
                            { value: "questions", label: "Sort by Questions" },
                            { value: "marks", label: "Sort by Marks" },
                            { value: "category", label: "Sort by Category" }
                        ]}
                        className="premium-sort-select"
                        ariaLabel="Sort premium quizzes"
                    />
                </div>

                <div className="premium-results-count">
                    {filteredQuizzes.length > 0 ? (
                        <>
                            <span className="results-highlight">
                                {startIndex + 1}-{Math.min(endIndex, filteredQuizzes.length)}
                            </span>
                            {' of '}
                            <span className="results-total">{filteredQuizzes.length}</span>
                            {' premium quiz'}
                            {filteredQuizzes.length !== 1 ? 'zes' : ''}
                            {filteredQuizzes.length !== quizzes.length && (
                                <span className="results-filtered">
                                    {' '}(filtered from {quizzes.length} total)
                                </span>
                            )}
                        </>
                    ) : (
                        <>
                            <span className="results-none">No premium quizzes found</span>
                            {searchQuery || categoryFilter !== "all" ? (
                                <button
                                    className="results-clear-filters"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setCategoryFilter("all");
                                    }}
                                    aria-label="Clear all filters"
                                >
                                    Clear filters
                                </button>
                            ) : null}
                        </>
                    )}
                </div>
            </motion.div>

            {filteredQuizzes.length === 0 ? (
                <motion.div
                    className="premium-no-quizzes"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="premium-empty-state">
                        <motion.span
                            className="premium-empty-icon"
                            animate={{
                                y: [0, -10, 0],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            💎
                        </motion.span>
                        <h3>
                            {searchQuery || categoryFilter !== "all"
                                ? "No Premium Quizzes Match Your Filters"
                                : "No Premium Quizzes Available"}
                        </h3>
                        <p>
                            {searchQuery || categoryFilter !== "all"
                                ? "Try adjusting your search or filter criteria to find more quizzes."
                                : "Create your first premium quiz to get started!"}
                        </p>
                        {(searchQuery || categoryFilter !== "all") && (
                            <button
                                className="premium-empty-clear-filters"
                                onClick={() => {
                                    setSearchQuery("");
                                    setCategoryFilter("all");
                                }}
                                aria-label="Clear all filters"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </motion.div>
            ) : (
                <>
                    <motion.div
                        className="quiz-list"
                        initial={false}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        <AnimatePresence mode="wait">
                            {paginatedQuizzes.map((quiz, index) => (
                                <PremiumQuizBox
                                    key={quiz._id}
                                    quiz={quiz}
                                    index={index}
                                    isAdminQuiz={isAdminQuiz}
                                    handleRestrictedAction={handleRestrictedAction}
                                    deleteQuiz={deleteQuiz}
                                    openAiQuestionModal={openAiQuestionModal}
                                    openAddQuestionModal={openAddQuestionModal}
                                    navigate={navigate}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>

                    {/* Pagination Controls */}
                    {filteredQuizzes.length > itemsPerPage && (
                        <motion.div
                            className="premium-pagination-container"
                            initial={false}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="premium-pagination-info">
                                Page {currentPage} of {totalPages}
                            </div>
                            <div className="premium-pagination-controls">
                                <button
                                    className="premium-pagination-btn"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Save scroll position before page change
                                        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                                        scrollPositionRef.current = currentScroll;

                                        // Prevent any scroll during state update
                                        const preventScroll = () => {
                                            window.scrollTo({
                                                top: currentScroll,
                                                behavior: 'auto'
                                            });
                                        };

                                        setCurrentPage(prev => Math.max(1, prev - 1));

                                        // Prevent scroll during render
                                        requestAnimationFrame(preventScroll);
                                        setTimeout(preventScroll, 0);
                                    }}
                                    disabled={currentPage === 1}
                                    aria-label="Go to previous page"
                                >
                                    &larr; Previous
                                </button>
                                <div className="premium-pagination-numbers">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                className={`premium-pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    // Save scroll position before page change
                                                    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                                                    scrollPositionRef.current = currentScroll;

                                                    // Prevent any scroll during state update
                                                    const preventScroll = () => {
                                                        window.scrollTo({
                                                            top: currentScroll,
                                                            behavior: 'auto'
                                                        });
                                                    };

                                                    setCurrentPage(pageNum);

                                                    // Prevent scroll during render
                                                    requestAnimationFrame(preventScroll);
                                                    setTimeout(preventScroll, 0);
                                                }}
                                                aria-label={`Go to page ${pageNum}`}
                                                aria-current={currentPage === pageNum ? 'page' : undefined}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    className="premium-pagination-btn"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Save scroll position before page change
                                        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                                        scrollPositionRef.current = currentScroll;

                                        // Prevent any scroll during state update
                                        const preventScroll = () => {
                                            window.scrollTo({
                                                top: currentScroll,
                                                behavior: 'auto'
                                            });
                                        };

                                        setCurrentPage(prev => Math.min(totalPages, prev + 1));

                                        // Prevent scroll during render
                                        requestAnimationFrame(preventScroll);
                                        setTimeout(preventScroll, 0);
                                    }}
                                    disabled={currentPage === totalPages}
                                    aria-label="Go to next page"
                                >
                                    Next &rarr;
                                </button>
                            </div>
                        </motion.div>
                    )}
                </>
            )}

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
