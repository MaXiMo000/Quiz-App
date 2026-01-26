import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "../App.css";
import "./UserQuiz.css";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import ShareQuizModal from "../components/ShareQuizModal";
import Loading from "../components/Loading";
import { useNotification } from "../hooks/useNotification";
import NotificationModal from "../components/NotificationModal";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { addToQuizHistory } from "../utils/quizHistory";

const UserQuiz = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [bookmarkedQuizIds, setBookmarkedQuizIds] = useState(new Set());
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState(null);

    // Search, filter, and sort states
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [sortBy, setSortBy] = useState("title"); // title, duration, questions, category

    const { notification, showSuccess, showError, hideNotification } = useNotification();

    useEffect(() => {
        let isMounted = true; // Flag to prevent state updates if component unmounts

        const fetchQuizzes = async () => {
            try {
                const response = await axios.get(`/api/quizzes`); // auto-token
                if (isMounted) {
                    setQuizzes(response.data);
                }
            } catch (error) {
                console.error("Error fetching quizzes:", error);
                if (isMounted) {
                    setError("Error fetching Quiz. Try again later.");
                }
            }
            finally{
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        const fetchBookmarks = async () => {
            try {
                const response = await axios.get(`/api/users/bookmarks`);

                // Check for error in response (even if status is 200)
                if (response.data && response.data.error) {
                    setBookmarkedQuizIds(new Set());
                    return;
                }

                if (response.data && response.data.bookmarkedQuizzes) {
                    const bookmarkedIds = new Set(
                        response.data.bookmarkedQuizzes
                            .map(b => {
                                // Handle different response structures
                                if (b.quizId && typeof b.quizId === 'object' && b.quizId._id) {
                                    return b.quizId._id;
                                }
                                if (b.quizId) {
                                    return typeof b.quizId === 'string' ? b.quizId : b.quizId.toString();
                                }
                                return null;
                            })
                            .filter(id => id !== null)
                    );
                    setBookmarkedQuizIds(bookmarkedIds);
                } else {
                    setBookmarkedQuizIds(new Set());
                }
            } catch (error) {
                console.error("Error fetching bookmarks:", error);
                // Don't show error to user, just use empty set
                setBookmarkedQuizIds(new Set());
            }
        };

        fetchQuizzes();
        fetchBookmarks();
    }, []);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            if (shareModalOpen) {
                setShareModalOpen(false);
            }
        },
        'Ctrl+F': (e) => {
            // Only prevent browser's find dialog if we have a search input on the page
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                e.preventDefault();
                e.stopPropagation();
                searchInput.focus();
                // Select all text for easy replacement
                if (searchInput.select) {
                    searchInput.select();
                }
            }
            // If no search input, let browser's default Ctrl+F work
        },
    }, [shareModalOpen]);

    const handleQuizShared = (groupCount) => {
        // Show success message
        alert(`Quiz shared successfully with ${groupCount} group${groupCount !== 1 ? 's' : ''}!`);
    };

    const handleBookmark = async (quizId, isBookmarked) => {
        // Optimistic UI update - update UI immediately
        const previousState = bookmarkedQuizIds.has(quizId);
        setBookmarkedQuizIds(prev => {
            const newSet = new Set(prev);
            if (isBookmarked) {
                newSet.delete(quizId);
            } else {
                newSet.add(quizId);
            }
            return newSet;
        });

        try {
            if (isBookmarked) {
                await axios.delete(`/api/users/bookmarks`, { data: { quizId } });
                showSuccess("Bookmark removed");
            } else {
                await axios.post(`/api/users/bookmarks`, { quizId });
                showSuccess("Quiz bookmarked");
            }
        } catch (error) {
            // Revert optimistic update on error
            setBookmarkedQuizIds(prev => {
                const newSet = new Set(prev);
                if (previousState) {
                    newSet.add(quizId);
                } else {
                    newSet.delete(quizId);
                }
                return newSet;
            });
            console.error("Error toggling bookmark:", error);
            showError(error.response?.data?.error || "Failed to update bookmark");
        }
    };

    // Get unique categories from quizzes
    const categories = useMemo(() => {
        const cats = new Set(quizzes.map(q => q.category).filter(Boolean));
        return Array.from(cats).sort();
    }, [quizzes]);

    // Filter and sort quizzes
    const filteredQuizzes = useMemo(() => {
        let filtered = [...quizzes];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(quiz =>
                quiz.title.toLowerCase().includes(query) ||
                quiz.category?.toLowerCase().includes(query) ||
                quiz.tags?.some(tag => tag.toLowerCase().includes(query))
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
                case "category":
                    return (a.category || "").localeCompare(b.category || "");
                case "title":
                default:
                    return (a.title || "").localeCompare(b.title || "");
            }
        });

        return filtered;
    }, [quizzes, searchQuery, categoryFilter, sortBy]);

    if (loading) return <Loading fullScreen={true} />;

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

            {/* Search, Filter, and Sort Controls */}
            <div className="quiz-controls">
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="🔍 Search quizzes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                        aria-label="Search quizzes"
                        aria-describedby="search-description"
                    />
                    <span id="search-description" className="sr-only">
                        Search quizzes by title, category, or description
                    </span>
                </div>

                <div className="filter-controls">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="sort-select"
                    >
                        <option value="title">Sort by Title</option>
                        <option value="duration">Sort by Duration</option>
                        <option value="questions">Sort by Questions</option>
                        <option value="category">Sort by Category</option>
                    </select>
                </div>

                {filteredQuizzes.length !== quizzes.length && (
                    <div className="results-count">
                        Showing {filteredQuizzes.length} of {quizzes.length} quizzes
                    </div>
                )}
            </div>

            {filteredQuizzes.length === 0 ? (
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
                        {filteredQuizzes.map((quiz, index) => {
                            const isBookmarked = bookmarkedQuizIds.has(quiz._id);
                            return (
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
                                onClick={() => {
                                    addToQuizHistory(quiz);
                                    navigate(`/user/test/${quiz._id}`);
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        addToQuizHistory(quiz);
                                        navigate(`/user/test/${quiz._id}`);
                                    }
                                }}
                                aria-label={`Start quiz: ${quiz.title}`}
                            >
                                <div className="quiz-card-content">
                                    <div className="quiz-icon">
                                        🎯
                                    </div>

                                    <div className="quiz-title-row">
                                        <h3 className="quiz-title">
                                            {quiz.title}
                                        </h3>
                                        <button
                                            className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleBookmark(quiz._id, isBookmarked);
                                            }}
                                            title={isBookmarked ? "Remove bookmark" : "Bookmark quiz"}
                                            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark quiz"}
                                            aria-pressed={isBookmarked}
                                        >
                                            {isBookmarked ? "⭐" : "☆"}
                                        </button>
                                    </div>

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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addToQuizHistory(quiz);
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
                        );
                        })}
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

        <NotificationModal
            isOpen={notification.isOpen}
            message={notification.message}
            type={notification.type}
            onClose={hideNotification}
            autoClose={notification.autoClose}
        />
        </>
    );
};

export default UserQuiz;
