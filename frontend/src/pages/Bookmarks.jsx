import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios";
import "../App.css";
import "./Bookmarks.css";
import Loading from "../components/Loading";
import { useNotification } from "../hooks/useNotification";
import NotificationModal from "../components/NotificationModal";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { debounce } from "../utils/componentUtils";
import CustomDropdown from "../components/CustomDropdown";
import { addToQuizHistory } from "../utils/quizHistory";

const Bookmarks = () => {
    const navigate = useNavigate();
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filter and sort states
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [difficultyFilter, setDifficultyFilter] = useState("all");
    const [sortBy, setSortBy] = useState("date"); // date, title, category
    const [viewMode, setViewMode] = useState("grid"); // grid, list
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const { notification, showSuccess, showError, hideNotification } = useNotification();

    // Debounced search
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch bookmarks
    const fetchBookmarks = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await axios.get("/api/users/bookmarks");
            const bookmarkedQuizzes = response.data.bookmarkedQuizzes || [];
            setBookmarks(bookmarkedQuizzes);
        } catch (err) {
            console.error("Error fetching bookmarks:", err);
            setError("Failed to load bookmarks. Please try again.");
            showError("Failed to load bookmarks");
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchBookmarks();
    }, [fetchBookmarks]);

    // Remove bookmark
    const handleRemoveBookmark = async (quizId) => {
        if (!quizId) return;
        try {
            await axios.delete("/api/users/bookmarks", { data: { quizId } });
            setBookmarks(prev => prev.filter(b => b.quizId?._id !== quizId));
            showSuccess("Bookmark removed successfully");
        } catch (err) {
            console.error("Error removing bookmark:", err);
            showError("Failed to remove bookmark");
        }
    };

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set();
        bookmarks.forEach(bookmark => {
            if (bookmark.quizId?.category) {
                cats.add(bookmark.quizId.category);
            }
        });
        return Array.from(cats).sort();
    }, [bookmarks]);

    // Filter and sort bookmarks
    const filteredBookmarks = useMemo(() => {
        let filtered = [...bookmarks];

        // Search filter
        if (debouncedSearchQuery) {
            const query = debouncedSearchQuery.toLowerCase();
            filtered = filtered.filter(bookmark =>
                bookmark.quizId?.title?.toLowerCase().includes(query) ||
                bookmark.quizId?.category?.toLowerCase().includes(query)
            );
        }

        // Category filter
        if (categoryFilter !== "all") {
            filtered = filtered.filter(bookmark => bookmark.quizId?.category === categoryFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case "title":
                    return (a.quizId?.title || "").localeCompare(b.quizId?.title || "");
                case "category":
                    return (a.quizId?.category || "").localeCompare(b.quizId?.category || "");
                case "date":
                default:
                    return new Date(b.bookmarkedAt) - new Date(a.bookmarkedAt);
            }
        });

        return filtered;
    }, [bookmarks, debouncedSearchQuery, categoryFilter, sortBy]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredBookmarks.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBookmarks = filteredBookmarks.slice(startIndex, endIndex);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            if (searchQuery) {
                setSearchQuery("");
            }
        },
        'Ctrl+F': (e) => {
            const searchInput = document.querySelector('.bookmarks-search-input');
            if (searchInput) {
                e.preventDefault();
                searchInput.focus();
            }
        },
    }, [searchQuery]);

    // Handle start quiz
    const handleStartQuiz = (quizId) => {
        if (!quizId) return;
        addToQuizHistory({ _id: quizId });
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen().then(() => {
                navigate(`/user/test/${quizId}`);
            }).catch(() => {
                navigate(`/user/test/${quizId}`);
            });
        } else {
            navigate(`/user/test/${quizId}`);
        }
    };

    if (loading) return <Loading fullScreen={true} />;

    return (
        <motion.div
            className="bookmarks-page"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="bookmarks-header">
                <motion.h1
                    className="bookmarks-title"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    ⭐ My Bookmarks
                </motion.h1>
                <motion.p
                    className="bookmarks-subtitle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {bookmarks.length === 0
                        ? "Save your favorite quizzes for quick access"
                        : `${bookmarks.length} ${bookmarks.length === 1 ? 'quiz' : 'quizzes'} bookmarked`}
                </motion.p>
            </div>

            {error && (
                <motion.div
                    className="bookmarks-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {error}
                </motion.div>
            )}

            {bookmarks.length === 0 ? (
                <motion.div
                    className="bookmarks-empty"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="empty-icon">⭐</div>
                    <h2>No bookmarks yet</h2>
                    <p>Start bookmarking quizzes to access them quickly!</p>
                    <button
                        className="browse-quizzes-btn"
                        onClick={() => navigate("/user/test")}
                    >
                        Browse Quizzes →
                    </button>
                </motion.div>
            ) : (
                <>
                    {/* Filters and Controls */}
                    <div className="bookmarks-controls">
                        <div className="bookmarks-search">
                            <input
                                type="text"
                                className="bookmarks-search-input"
                                placeholder="Search bookmarks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="bookmarks-filters">
                            <CustomDropdown
                                options={[
                                    { value: "all", label: "All Categories" },
                                    ...categories.map(cat => ({ value: cat, label: cat }))
                                ]}
                                value={categoryFilter}
                                onChange={setCategoryFilter}
                                placeholder="Category"
                            />

                            <CustomDropdown
                                options={[
                                    { value: "date", label: "Date Bookmarked" },
                                    { value: "title", label: "Title" },
                                    { value: "category", label: "Category" }
                                ]}
                                value={sortBy}
                                onChange={setSortBy}
                                placeholder="Sort by"
                            />

                            <div className="view-mode-toggle">
                                <button
                                    className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                                    onClick={() => setViewMode("grid")}
                                    aria-label="Grid view"
                                >
                                    ⊞
                                </button>
                                <button
                                    className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                                    onClick={() => setViewMode("list")}
                                    aria-label="List view"
                                >
                                    ☰
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bookmarks Grid/List */}
                    <AnimatePresence mode="wait">
                        {filteredBookmarks.length === 0 ? (
                            <motion.div
                                key="no-results"
                                className="bookmarks-no-results"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <p>No bookmarks match your filters</p>
                                <button
                                    className="clear-filters-btn"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setCategoryFilter("all");
                                    }}
                                >
                                    Clear Filters
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="bookmarks-grid"
                                className={`bookmarks-grid ${viewMode}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {paginatedBookmarks.map((bookmark, index) => (
                                    <motion.div
                                        key={bookmark._id || bookmark.quizId?._id}
                                        className="bookmark-card"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        whileHover={{ y: -4 }}
                                    >
                                        <div className="bookmark-card-header">
                                            <h3 className="bookmark-title">
                                                {bookmark.quizId?.title || "Untitled Quiz"}
                                            </h3>
                                            <button
                                                className="bookmark-remove-btn"
                                                onClick={() => bookmark.quizId?._id && handleRemoveBookmark(bookmark.quizId._id)}
                                                aria-label="Remove bookmark"
                                                title="Remove bookmark"
                                            >
                                                ⭐
                                            </button>
                                        </div>

                                        <div className="bookmark-meta">
                                            <span className="bookmark-category">
                                                {bookmark.quizId?.category || "General"}
                                            </span>
                                            <span className="bookmark-duration">
                                                ⏱️ {bookmark.quizId?.duration || 30} min
                                            </span>
                                            <span className="bookmark-questions">
                                                📝 {bookmark.quizId?.questionCount || bookmark.quizId?.questions || 0} questions
                                            </span>
                                        </div>

                                        <div className="bookmark-date">
                                            Bookmarked {bookmark.bookmarkedAt ? new Date(bookmark.bookmarkedAt).toLocaleDateString() : "Recently"}
                                        </div>

                                        <div className="bookmark-actions">
                                            <button
                                                className="bookmark-start-btn"
                                                onClick={() => bookmark.quizId?._id && handleStartQuiz(bookmark.quizId._id)}
                                            >
                                                Start Quiz →
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="bookmarks-pagination">
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                ← Previous
                            </button>
                            <span className="pagination-info">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}

            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
            />
        </motion.div>
    );
};

export default Bookmarks;
