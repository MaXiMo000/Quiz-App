import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import Loading from "../components/Loading";
import NotificationModal from "../components/NotificationModal";
import CustomDropdown from "../components/CustomDropdown";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { debounce } from "../utils/componentUtils";
import { handlePageChangeWithScrollPreservation, restoreScrollPosition } from "../utils/paginationUtils";
import "./Leaderboard.css";

// Memoized Leaderboard Row Component
const LeaderboardRow = memo(({ user, rank, index, quizName }) => {
    const getMedal = (rank) => {
        if (rank === 1) return "🥇";
        if (rank === 2) return "🥈";
        if (rank === 3) return "🥉";
        return `#${rank}`;
    };

    const getRankClass = (rank) => {
        if (rank === 1) return "rank-1";
        if (rank === 2) return "rank-2";
        if (rank === 3) return "rank-3";
        return "";
    };

    return (
        <motion.tr
            className={getRankClass(rank)}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0 }}
            whileHover={{ backgroundColor: "rgba(251, 191, 36, 0.1)", scale: 1.01 }}
        >
            <td className="rank-cell">
                <span className="rank-badge">{getMedal(rank)}</span>
            </td>
            <td className="username-cell">{user.username || 'Unknown'}</td>
            <td className="quiz-name-cell">{quizName || 'Unknown Quiz'}</td>
            <td className="score-cell">{user.score?.toFixed(1) || '0'}</td>
            <td className="total-cell">{user.total || '0'}</td>
            <td className="percentage-cell">
                {user.total > 0 ? `${((user.score / user.total) * 100).toFixed(1)}%` : '0%'}
            </td>
        </motion.tr>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.user.username === nextProps.user.username &&
        prevProps.rank === nextProps.rank &&
        prevProps.user.score === nextProps.user.score
    );
});
LeaderboardRow.displayName = 'LeaderboardRow';

const Leaderboard = () => {
    const [topScorers, setTopScorers] = useState([]);
    const [filteredQuiz, setFilteredQuiz] = useState(() => {
        const saved = localStorage.getItem("leaderboard_filteredQuiz");
        return saved || "All";
    });
    const [period, setPeriod] = useState(() => {
        const saved = localStorage.getItem("leaderboard_period");
        return saved || "week";
    });
    const [searchQuery, setSearchQuery] = useState(() => {
        const saved = localStorage.getItem("leaderboard_searchQuery");
        return saved || "";
    });
    const [sortBy, setSortBy] = useState(() => {
        const saved = localStorage.getItem("leaderboard_sortBy");
        return saved || "score";
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(() => {
        const saved = parseInt(localStorage.getItem("leaderboard_currentPage"), 10);
        return saved && !isNaN(saved) ? saved : 1;
    });
    const itemsPerPage = 10;
    const scrollPositionRef = useRef(0);

    // Debounced search query
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    const debouncedSetSearch = useRef(
        debounce((value) => {
            setDebouncedSearchQuery(value);
            localStorage.setItem("leaderboard_searchQuery", value);
        }, 300)
    ).current;

    // Notification system
    const { notification, showError, showSuccess, hideNotification } = useNotification();

    // Persist state to localStorage
    useEffect(() => {
        localStorage.setItem("leaderboard_filteredQuiz", filteredQuiz);
    }, [filteredQuiz]);

    useEffect(() => {
        localStorage.setItem("leaderboard_period", period);
    }, [period]);

    useEffect(() => {
        localStorage.setItem("leaderboard_sortBy", sortBy);
    }, [sortBy]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
        localStorage.setItem("leaderboard_currentPage", "1");
    }, [debouncedSearchQuery, filteredQuiz, period, sortBy]);

    // Handle search input with debouncing
    useEffect(() => {
        debouncedSetSearch(searchQuery);
    }, [searchQuery, debouncedSetSearch]);

    const fetchTopScorers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            // Map period to API-supported values (API might only support 'week' and 'month')
            const apiPeriod = period === 'year' || period === 'all' ? 'month' : period;
            const response = await axios.get(`/api/reports/top-scorers?period=${apiPeriod}`);
            const data = Array.isArray(response.data) ? response.data : [];

            // If period is 'all', we might need to fetch all data (for now, use month as fallback)
            // For 'year', use month data as approximation
            setTopScorers(data);
            // Don't reset filter on period change - keep user's choice
        } catch (error) {
            console.error("Error fetching top scorers:", error.response ? error.response.data : error.message);
            const errorMsg = "Error fetching data. Please try again later.";
            setError(errorMsg);
            showError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [period, showError]);

    useEffect(() => {
        fetchTopScorers();
    }, [fetchTopScorers]);

    // Ensure no internal scrolling - page scrolls naturally
    useEffect(() => {
        // Remove any overflow constraints that might cause internal scrollbars
        const container = document.querySelector('.leaderboard-container');
        const tableContainer = document.querySelector('.leaderboard-table-container');
        const table = document.querySelector('.leaderboard-table');
        const mainContent = document.querySelector('.main-content');
        const body = document.body;
        const html = document.documentElement;

        // Prevent horizontal overflow
        if (body) {
            body.style.overflowX = 'hidden';
            body.style.maxWidth = '100vw';
        }
        if (html) {
            html.style.overflowX = 'hidden';
            html.style.maxWidth = '100vw';
        }

        if (container) {
            container.style.overflow = 'visible';
            container.style.overflowY = 'visible';
            container.style.overflowX = 'hidden';
            container.style.height = 'auto';
            container.style.maxHeight = 'none';
            container.style.maxWidth = '100%';
            container.style.width = '100%';
        }
        if (tableContainer) {
            tableContainer.style.overflow = 'visible';
            tableContainer.style.overflowY = 'visible';
            tableContainer.style.overflowX = 'hidden';
            tableContainer.style.height = 'auto';
            tableContainer.style.maxHeight = 'none';
            tableContainer.style.maxWidth = '100%';
            tableContainer.style.width = '100%';
        }
        if (table) {
            table.style.overflowY = 'visible';
            table.style.overflowX = 'auto'; // Allow horizontal scroll for wide tables
            table.style.maxHeight = 'none';
            table.style.height = 'auto';
            table.style.maxWidth = '100%';
        }
        if (mainContent) {
            mainContent.style.overflowY = 'visible';
            mainContent.style.overflowX = 'hidden';
            mainContent.style.height = 'auto';
            mainContent.style.maxHeight = 'none';
            mainContent.style.maxWidth = '100%';
        }
    }, []);

    // Extract unique quizzes
    const uniqueQuizzes = useMemo(() => {
        const quizzes = [...new Set(topScorers.map(item => item.quizName).filter(Boolean))];
        return quizzes.sort();
    }, [topScorers]);

    // Filter and process scorers
    const processedScorers = useMemo(() => {
        let filtered = [...topScorers];

        // Quiz filter
        if (filteredQuiz !== "All") {
            filtered = filtered.filter(item => item.quizName === filteredQuiz);
        }

        // Search filter
        if (debouncedSearchQuery) {
            const query = debouncedSearchQuery.toLowerCase();
            filtered = filtered.map(category => ({
                ...category,
                topUsers: category.topUsers.filter(user =>
                    (user.username || '').toLowerCase().includes(query)
                )
            })).filter(category => category.topUsers.length > 0);
        }

        // Sort users within each category
        filtered = filtered.map(category => ({
            ...category,
            topUsers: [...category.topUsers].sort((a, b) => {
                switch (sortBy) {
                    case "username":
                        return (a.username || '').localeCompare(b.username || '');
                    case "percentage":
                        const aPct = a.total > 0 ? (a.score / a.total) * 100 : 0;
                        const bPct = b.total > 0 ? (b.score / b.total) * 100 : 0;
                        return bPct - aPct;
                    case "score":
                    default:
                        return b.score - a.score;
                }
            })
        }));

        return filtered;
    }, [topScorers, filteredQuiz, debouncedSearchQuery, sortBy]);

    // Flatten for pagination
    const allRows = useMemo(() => {
        const rows = [];
        processedScorers.forEach(category => {
            category.topUsers.forEach((user, index) => {
                rows.push({
                    ...user,
                    quizName: category.quizName,
                    rank: index + 1
                });
            });
        });
        return rows;
    }, [processedScorers]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(allRows.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRows = allRows.slice(startIndex, endIndex);

    // Ensure currentPage doesn't exceed totalPages
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
            localStorage.setItem("leaderboard_currentPage", totalPages.toString());
        }
    }, [totalPages]);

    // Persist currentPage to localStorage
    useEffect(() => {
        localStorage.setItem("leaderboard_currentPage", currentPage.toString());
    }, [currentPage]);

    // Scroll position preservation for pagination
    useEffect(() => {
        restoreScrollPosition(scrollPositionRef);
    }, [currentPage]);

    // Calculate stats
    const stats = useMemo(() => {
        const totalUsers = allRows.length;
        const uniqueUsers = new Set(allRows.map(r => r.username)).size;
        const uniqueQuizzes = new Set(allRows.map(r => r.quizName)).size;
        const averageScore = totalUsers > 0
            ? (allRows.reduce((sum, r) => sum + (r.total > 0 ? (r.score / r.total) * 100 : 0), 0) / totalUsers).toFixed(1)
            : 0;

        return {
            totalUsers,
            uniqueUsers,
            uniqueQuizzes,
            averageScore
        };
    }, [allRows]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            setSearchQuery("");
        },
        'Ctrl+F': (e) => {
            e.preventDefault();
            const searchInput = document.querySelector('.leaderboard-search-input');
            if (searchInput) searchInput.focus();
        },
        'ArrowLeft': (e) => {
            if (currentPage > 1 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                e.stopPropagation();
                handlePageChangeWithScrollPreservation(setCurrentPage, scrollPositionRef, currentPage - 1);
            }
        },
        'ArrowRight': (e) => {
            if (currentPage < totalPages && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                e.stopPropagation();
                handlePageChangeWithScrollPreservation(setCurrentPage, scrollPositionRef, currentPage + 1);
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

    // Export functionality
    const handleExportCSV = useCallback(() => {
        const headers = ['Rank', 'Username', 'Quiz Name', 'Score', 'Total', 'Percentage'];
        const rows = allRows.map((row, index) => [
            index + 1,
            row.username || 'Unknown',
            row.quizName || 'Unknown Quiz',
            row.score?.toFixed(1) || '0',
            row.total || '0',
            row.total > 0 ? `${((row.score / row.total) * 100).toFixed(1)}%` : '0%'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `leaderboard-${period}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccess('Leaderboard exported to CSV successfully!');
    }, [allRows, period, showSuccess]);

    if (loading) return <Loading fullScreen={true} />;

    const periodLabels = {
        week: "Week",
        month: "Month",
        year: "Year",
        all: "All Time"
    };

    return (
        <motion.div
            className="leaderboard-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            <motion.div
                className="lb-page-header"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.7 }}
            >
                <h1 className="lb-main-title">
                    <span className="lb-trophy">🏆</span>
                    <span className="lb-title-text">Top Scorers of the {periodLabels[period] || period}</span>
                </h1>
                <motion.button
                    className="lb-export-button"
                    onClick={handleExportCSV}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    📥 Export CSV
                </motion.button>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
                className="leaderboard-stats"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                <motion.div
                    className="stat-card total-users"
                    whileHover={{ y: -5, scale: 1.02 }}
                >
                    <div className="stat-icon">👥</div>
                    <h3>Total Entries</h3>
                    <p className="stat-number">{stats.totalUsers}</p>
                </motion.div>
                <motion.div
                    className="stat-card unique-users"
                    whileHover={{ y: -5, scale: 1.02 }}
                >
                    <div className="stat-icon">🌟</div>
                    <h3>Unique Users</h3>
                    <p className="stat-number">{stats.uniqueUsers}</p>
                </motion.div>
                <motion.div
                    className="stat-card unique-quizzes"
                    whileHover={{ y: -5, scale: 1.02 }}
                >
                    <div className="stat-icon">🎯</div>
                    <h3>Quizzes</h3>
                    <p className="stat-number">{stats.uniqueQuizzes}</p>
                </motion.div>
                <motion.div
                    className="stat-card average-score"
                    whileHover={{ y: -5, scale: 1.02 }}
                >
                    <div className="stat-icon">📈</div>
                    <h3>Avg Score</h3>
                    <p className="stat-number">{stats.averageScore}%</p>
                </motion.div>
            </motion.div>

            {/* Controls */}
            <motion.div
                className="leaderboard-controls"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
            >
                <div className="leaderboard-period-buttons" role="group" aria-label="Leaderboard period filter">
                    {['week', 'month', 'year', 'all'].map(p => (
                        <motion.button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={period === p ? "active" : ""}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            aria-label={`Show ${periodLabels[p]} leaderboard`}
                            aria-pressed={period === p}
                        >
                            {periodLabels[p]}
                        </motion.button>
                    ))}
                </div>

                <div className="leaderboard-filters">
                    <div className="leaderboard-search-wrapper">
                        <input
                            type="text"
                            className="leaderboard-search-input"
                            placeholder="Search by username..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Search leaderboard"
                        />
                        {searchQuery && (
                            <button
                                className="leaderboard-search-clear"
                                onClick={() => setSearchQuery("")}
                                aria-label="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <CustomDropdown
                        value={filteredQuiz}
                        onChange={(e) => {
                            const value = e?.target?.value || e || 'All';
                            setFilteredQuiz(typeof value === 'string' ? value : 'All');
                        }}
                        options={[
                            { value: "All", label: "All Quizzes" },
                            ...uniqueQuizzes.map(quiz => ({ value: quiz, label: quiz }))
                        ]}
                        placeholder="Filter by Quiz"
                        ariaLabel="Filter leaderboard by quiz"
                    />

                    <CustomDropdown
                        value={sortBy}
                        onChange={(e) => {
                            const value = e?.target?.value || e || 'score';
                            setSortBy(typeof value === 'string' ? value : 'score');
                        }}
                        options={[
                            { value: "score", label: "Sort by Score" },
                            { value: "percentage", label: "Sort by Percentage" },
                            { value: "username", label: "Sort by Username" }
                        ]}
                        placeholder="Sort by"
                        ariaLabel="Sort leaderboard"
                    />
                </div>
            </motion.div>

            {/* Results Count */}
            {allRows.length !== topScorers.reduce((sum, cat) => sum + cat.topUsers.length, 0) && (
                <motion.div
                    className="leaderboard-results-info"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <span className="results-highlight">
                        Showing {allRows.length} entries
                    </span>
                    {(searchQuery || filteredQuiz !== "All") && (
                        <button
                            className="results-clear-filters"
                            onClick={() => {
                                setSearchQuery("");
                                setFilteredQuiz("All");
                            }}
                        >
                            Clear filters
                        </button>
                    )}
                </motion.div>
            )}

            {/* Leaderboard Table */}
            {error ? (
                <motion.div
                    className="error-container"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <p className="error-message">{error}</p>
                </motion.div>
            ) : allRows.length === 0 ? (
                <motion.div
                    className="leaderboard-empty-state"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
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
                        🏆
                    </motion.div>
                    <h3>
                        {searchQuery || filteredQuiz !== "All"
                            ? "No Results Match Your Filters"
                            : "No Top Scorers Yet"}
                    </h3>
                    <p>
                        {searchQuery || filteredQuiz !== "All"
                            ? "Try adjusting your search or filter criteria."
                            : "Be the first to take a quiz and appear on the leaderboard!"}
                    </p>
                    {(searchQuery || filteredQuiz !== "All") && (
                        <button
                            className="empty-clear-filters"
                            onClick={() => {
                                setSearchQuery("");
                                setFilteredQuiz("All");
                            }}
                        >
                            Clear filters
                        </button>
                    )}
                </motion.div>
            ) : (
                <motion.div
                    className="leaderboard-table-container"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0 }}
                >
                    <div className="leaderboard-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Username</th>
                                    <th>Quiz Name</th>
                                    <th>Score</th>
                                    <th>Total</th>
                                    <th>Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {paginatedRows.map((row, index) => (
                                        <LeaderboardRow
                                            key={`${row.username}-${row.quizName}-${index}`}
                                            user={row}
                                            rank={startIndex + index + 1}
                                            index={index}
                                            quizName={row.quizName}
                                        />
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <motion.div
                    className="leaderboard-pagination"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
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
                    transition={{ duration: 0.3, delay: 0.6 }}
                >
                    Page {currentPage} of {totalPages} • Showing {startIndex + 1}-{Math.min(endIndex, allRows.length)} of {allRows.length} entries
                </motion.div>
            )}

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

export default Leaderboard;
