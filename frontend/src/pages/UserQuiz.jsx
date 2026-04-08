import React, { useEffect, useState, useMemo, useRef, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
import { debounce } from "../utils/componentUtils";
import CustomDropdown from "../components/CustomDropdown";
import { markQuizFullscreenOnLoad } from "../utils/quizFullscreen.js";
import { readLastQuizSession, buildAdaptiveGeneratorPath } from "../utils/adaptiveQuizSignals.js";

// Memoized Quiz Card Component
const QuizCard = memo(({ quiz, index, isBookmarked, onBookmark, onShare, navigate }) => {
    const handleStartQuiz = (e) => {
        e.stopPropagation();
        addToQuizHistory(quiz);
        // Fullscreen cannot survive a client-side route change — TakeQuiz shows a start overlay
        // that calls requestFullscreen() on a click in the same document.
        markQuizFullscreenOnLoad();
        navigate(`/user/test/${quiz._id}`);
    };

    return (
        <motion.div
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
            <div className="quiz-card-header">
                <h3 className="quiz-title">{quiz.title}</h3>
                <div className="quiz-card-actions">
                    <button
                        className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onBookmark(quiz._id);
                        }}
                        aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                        title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                    >
                        {isBookmarked ? "⭐" : "☆"}
                    </button>
                    <button
                        className="share-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShare(quiz);
                        }}
                        aria-label="Share quiz"
                        title="Share quiz"
                    >
                        🔗
                    </button>
                </div>
            </div>
            <p className="quiz-description">{quiz.description || "Test your knowledge!"}</p>
            <div className="quiz-meta">
                <span className="quiz-category">{quiz.category || "General"}</span>
                <span className="quiz-duration">⏱️ {quiz.duration || 30} min</span>
                <span className="quiz-questions">📝 {quiz.questions?.length || 0} questions</span>
            </div>
            <button
                className="start-quiz-btn"
                onClick={handleStartQuiz}
                aria-label={`Start quiz: ${quiz.title}`}
            >
                <span>🚀</span>
                Start Quiz
            </button>
        </motion.div>
    );
});
// Default memo shallow compare so question count / meta updates after refetch.

QuizCard.displayName = 'QuizCard';

const UserQuiz = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [bookmarkedQuizIds, setBookmarkedQuizIds] = useState(new Set());
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState(null);

    // Search, filter, and sort states (with localStorage persistence)
    const [searchQuery, setSearchQuery] = useState(() => {
        const saved = localStorage.getItem("userQuiz_searchQuery");
        return saved || "";
    });
    const [categoryFilter, setCategoryFilter] = useState(() => {
        const saved = localStorage.getItem("userQuiz_categoryFilter");
        return saved || "all";
    });
    const [sortBy, setSortBy] = useState(() => {
        const saved = localStorage.getItem("userQuiz_sortBy");
        return saved || "title";
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(() => {
        const saved = parseInt(localStorage.getItem("userQuiz_currentPage"), 10);
        return saved && !isNaN(saved) ? saved : 1;
    });
    const itemsPerPage = 10;

    /** Quiz selected for “intelligent” / adaptive generator (User Quiz list) */
    const [smartQuizId, setSmartQuizId] = useState("");

    // Debounced search query for filtering
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    const debouncedSetSearch = useRef(
        debounce((value) => {
            setDebouncedSearchQuery(value);
            localStorage.setItem("userQuiz_searchQuery", value);
        }, 300)
    ).current;

    const { notification, showSuccess, showError, hideNotification } = useNotification();

    // Persist filter changes to localStorage
    useEffect(() => {
        localStorage.setItem("userQuiz_categoryFilter", categoryFilter);
    }, [categoryFilter]);

    useEffect(() => {
        localStorage.setItem("userQuiz_sortBy", sortBy);
    }, [sortBy]);

    // Reset to page 1 when filters change
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
            localStorage.setItem("userQuiz_currentPage", "1");
        }
    }, [debouncedSearchQuery, categoryFilter, sortBy]);

    // Persist current page
    useEffect(() => {
        localStorage.setItem("userQuiz_currentPage", currentPage.toString());
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
    }, [quizzes, debouncedSearchQuery, categoryFilter, sortBy]);

    // Keep smart-generator selection in sync with filtered list
    useEffect(() => {
        if (!filteredQuizzes.length) {
            setSmartQuizId("");
            return;
        }
        const stillValid = filteredQuizzes.some((q) => q._id === smartQuizId);
        if (!stillValid) {
            setSmartQuizId(filteredQuizzes[0]._id);
        }
    }, [filteredQuizzes, smartQuizId]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredQuizzes.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedQuizzes = filteredQuizzes.slice(startIndex, endIndex);

    // Ensure currentPage doesn't exceed totalPages
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
            localStorage.setItem("userQuiz_currentPage", totalPages.toString());
        }
    }, [totalPages]); // Only depend on totalPages to avoid circular updates

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            // Close share modal if open
            if (shareModalOpen) {
                setShareModalOpen(false);
            }
            // Clear search if active
            else if (searchQuery) {
                setSearchQuery("");
            }
        },
        'Ctrl+F': (e) => {
            // Focus search input
            const searchInput = document.querySelector('.search-input');
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
                setCurrentPage(prev => prev - 1);
            }
        },
        'ArrowRight': (e) => {
            // Navigate to next page if not in input field
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && currentPage < totalPages) {
                e.preventDefault();
                setCurrentPage(prev => prev + 1);
            }
        },
    }, [searchQuery, currentPage, totalPages, shareModalOpen]);

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


    const handleQuizShared = (groupCount) => {
        // Show success message
        alert(`Quiz shared successfully with ${groupCount} group${groupCount !== 1 ? 's' : ''}!`);
    };

    const handleBookmark = useCallback(async (quizId, isBookmarked) => {
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
    }, [bookmarkedQuizIds, showSuccess, showError]);

    // Memoized handlers
    const handleShare = useCallback((quiz) => {
        setSelectedQuiz(quiz);
        setShareModalOpen(true);
    }, []);

    // Wrapper for handleBookmark to match QuizCard signature
    const handleBookmarkWrapper = useCallback((quizId) => {
        const isBookmarked = bookmarkedQuizIds.has(quizId);
        handleBookmark(quizId, isBookmarked);
    }, [bookmarkedQuizIds, handleBookmark]);

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

            {filteredQuizzes.length > 0 && (
                <div className="user-quiz-smart-panel">
                    <div className="user-quiz-smart-header">
                        <span className="user-quiz-smart-icon" aria-hidden>
                            🧠
                        </span>
                        <div>
                            <h3 className="user-quiz-smart-title">Intelligent question generation</h3>
                            <p className="user-quiz-smart-desc">
                                Add AI questions matched to <strong>your level</strong> using past scores in
                                each topic, your preferences, and XP level — same engine as after you finish a
                                quiz. Pick a quiz, then open the generator.
                            </p>
                        </div>
                    </div>
                    <div className="user-quiz-smart-actions">
                        <CustomDropdown
                            value={smartQuizId}
                            onChange={(e) => setSmartQuizId(e.target.value)}
                            options={filteredQuizzes.map((q) => ({
                                value: q._id,
                                label: q.title || "Untitled quiz",
                            }))}
                            className="user-quiz-smart-dropdown"
                            ariaLabel="Select quiz for intelligent generation"
                        />
                        <button
                            type="button"
                            className="user-quiz-smart-btn user-quiz-smart-btn-primary"
                            disabled={!smartQuizId}
                            onClick={() =>
                                smartQuizId &&
                                navigate(`/adaptive/${smartQuizId}?difficultyMode=intelligent`)
                            }
                        >
                            Smart (your history)
                        </button>
                        <button
                            type="button"
                            className="user-quiz-smart-btn user-quiz-smart-btn-secondary"
                            disabled={!smartQuizId}
                            onClick={() => {
                                if (!smartQuizId) return;
                                const last = readLastQuizSession();
                                if (last?.performance) {
                                    navigate(
                                        buildAdaptiveGeneratorPath(smartQuizId, {
                                            difficultyMode: "blended",
                                        })
                                    );
                                } else {
                                    showSuccess(
                                        "No recent quiz in this browser — open Smart (your history) or finish a quiz first."
                                    );
                                    navigate(buildAdaptiveGeneratorPath(smartQuizId, { difficultyMode: "intelligent" }));
                                }
                            }}
                        >
                            Smart + last session
                        </button>
                    </div>
                </div>
            )}

            {/* Search, Filter, and Sort Controls */}
            <div className="quiz-controls">
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search quizzes..."
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
                    <CustomDropdown
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        options={[
                            { value: "all", label: "All Categories" },
                            ...categories.map(cat => ({ value: cat, label: cat }))
                        ]}
                        className="filter-select"
                        ariaLabel="Filter by category"
                    />

                    <CustomDropdown
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        options={[
                            { value: "title", label: "Sort by Title" },
                            { value: "duration", label: "Sort by Duration" },
                            { value: "questions", label: "Sort by Questions" },
                            { value: "category", label: "Sort by Category" }
                        ]}
                        className="sort-select"
                        ariaLabel="Sort quizzes"
                    />
                </div>

                <div className="results-count">
                    {filteredQuizzes.length > 0 ? (
                        <>
                            Showing {startIndex + 1}-{Math.min(endIndex, filteredQuizzes.length)} of {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 'zes' : ''}
                            {filteredQuizzes.length !== quizzes.length && ` (${quizzes.length} total)`}
                        </>
                    ) : (
                        <>No quizzes found</>
                    )}
                </div>
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
                <>
                    <motion.div
                        className="quiz-grid"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        {paginatedQuizzes.map((quiz, index) => {
                            const isBookmarked = bookmarkedQuizIds.has(quiz._id);
                            return (
                                <QuizCard
                                    key={quiz._id}
                                    quiz={quiz}
                                    index={index}
                                    isBookmarked={isBookmarked}
                                    onBookmark={handleBookmarkWrapper}
                                    onShare={handleShare}
                                    navigate={navigate}
                                />
                            );
                        })}
                    </motion.div>

                    {/* Pagination Controls */}
                    {filteredQuizzes.length > itemsPerPage && (
                        <motion.div
                            className="pagination-container"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="pagination-info">
                                Page {currentPage} of {totalPages}
                            </div>
                            <div className="pagination-controls">
                                <button
                                    className="pagination-btn"
                                    onClick={() => {
                                        setCurrentPage(prev => Math.max(1, prev - 1));
                                    }}
                                    disabled={currentPage === 1}
                                    aria-label="Go to previous page"
                                >
                                    &larr; Previous
                                </button>
                                <div className="pagination-numbers">
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
                                                className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                                                onClick={() => {
                                                    setCurrentPage(pageNum);
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
                                    className="pagination-btn"
                                    onClick={() => {
                                        setCurrentPage(prev => Math.min(totalPages, prev + 1));
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
