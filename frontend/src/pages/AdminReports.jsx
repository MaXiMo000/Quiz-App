import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "../App.css";
import "./AdminReports.css";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import NotificationModal from "../components/NotificationModal";
import CustomDropdown from "../components/CustomDropdown";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { debounce } from "../utils/componentUtils";
import { handlePageChangeWithScrollPreservation, restoreScrollPosition } from "../utils/paginationUtils";
import Loading from "../components/Loading";

// Memoized Report Row Component
const ReportRow = memo(({ report, index, deleteReport, deletingId }) => {
    const passed = report.score >= report.total * 0.5;

    return (
        <motion.tr
            key={`admin-report-${report._id || index}`}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 50, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, delay: index * 0.02 }}
            whileHover={{ backgroundColor: "rgba(99, 102, 241, 0.1)" }}
        >
            <td className="username-cell">{report.username || report.userName || 'Unknown'}</td>
            <td>{report.quizName || 'Unknown Quiz'}</td>
            <td className="score-cell">{report.score?.toFixed(1) || '0'}</td>
            <td>{report.total || 0}</td>
            <td className="pass-status">
                {passed ? (
                    <span className="passed">✅ Passed</span>
                ) : (
                    <span className="failed">❌ Failed</span>
                )}
            </td>
            <td>
                <motion.button
                    className="delete-btn"
                    onClick={() => deleteReport(report._id)}
                    disabled={deletingId === report._id}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    animate={deletingId === report._id ? { opacity: 0.5 } : { opacity: 1 }}
                    aria-label={`Delete report for ${report.username} - ${report.quizName}`}
                    aria-busy={deletingId === report._id}
                >
                    {deletingId === report._id ? "🔄 Deleting..." : "🗑️ Delete"}
                </motion.button>
            </td>
        </motion.tr>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.report._id === nextProps.report._id &&
        prevProps.index === nextProps.index &&
        prevProps.deletingId === nextProps.deletingId &&
        prevProps.report.score === nextProps.report.score
    );
});
ReportRow.displayName = 'ReportRow';

const AdminReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState(null);

    // Search, filter, and sort states (with localStorage persistence)
    const [searchQuery, setSearchQuery] = useState(() => {
        const saved = localStorage.getItem("adminReports_searchQuery");
        return saved || "";
    });
    const [statusFilter, setStatusFilter] = useState(() => {
        const saved = localStorage.getItem("adminReports_statusFilter");
        return saved || "all";
    });
    const [scoreFilter, setScoreFilter] = useState(() => {
        const saved = localStorage.getItem("adminReports_scoreFilter");
        return saved || "all";
    });
    const [sortBy, setSortBy] = useState(() => {
        const saved = localStorage.getItem("adminReports_sortBy");
        return saved || "date";
    });
    const [sortOrder, setSortOrder] = useState(() => {
        const saved = localStorage.getItem("adminReports_sortOrder");
        return saved || "desc";
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(() => {
        const saved = parseInt(localStorage.getItem("adminReports_currentPage"), 10);
        return saved && !isNaN(saved) ? saved : 1;
    });
    const itemsPerPage = 10;
    const scrollPositionRef = useRef(0);

    // Debounced search query for filtering
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    const debouncedSetSearch = useRef(
        debounce((value) => {
            setDebouncedSearchQuery(value);
            localStorage.setItem("adminReports_searchQuery", value);
        }, 300)
    ).current;

    // Notification system
    const { notification, showSuccess, showError, showWarning, hideNotification } = useNotification();

    // Persist filter changes to localStorage
    useEffect(() => {
        localStorage.setItem("adminReports_statusFilter", statusFilter);
    }, [statusFilter]);

    useEffect(() => {
        localStorage.setItem("adminReports_scoreFilter", scoreFilter);
    }, [scoreFilter]);

    useEffect(() => {
        localStorage.setItem("adminReports_sortBy", sortBy);
    }, [sortBy]);

    useEffect(() => {
        localStorage.setItem("adminReports_sortOrder", sortOrder);
    }, [sortOrder]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
        localStorage.setItem("adminReports_currentPage", "1");
    }, [debouncedSearchQuery, statusFilter, scoreFilter, sortBy, sortOrder]);

    // Handle search input with debouncing
    useEffect(() => {
        debouncedSetSearch(searchQuery);
    }, [searchQuery, debouncedSetSearch]);

    // Filter and sort reports
    const filteredAndSortedReports = useMemo(() => {
        let filtered = [...reports];

        // Search filter (using debounced value)
        if (debouncedSearchQuery) {
            const query = debouncedSearchQuery.toLowerCase();
            filtered = filtered.filter(report =>
                (report.username || report.userName || '').toLowerCase().includes(query) ||
                (report.quizName || '').toLowerCase().includes(query)
            );
        }

        // Status filter (passed/failed)
        if (statusFilter !== "all") {
            filtered = filtered.filter(report => {
                const passed = report.score >= report.total * 0.5;
                return statusFilter === "passed" ? passed : !passed;
            });
        }

        // Score filter
        if (scoreFilter !== "all") {
            filtered = filtered.filter(report => {
                const percentage = (report.score / report.total) * 100;
                switch (scoreFilter) {
                    case "excellent":
                        return percentage >= 90;
                    case "good":
                        return percentage >= 70 && percentage < 90;
                    case "average":
                        return percentage >= 50 && percentage < 70;
                    case "poor":
                        return percentage < 50;
                    default:
                        return true;
                }
            });
        }

        // Sort
        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case "score":
                    comparison = a.score - b.score;
                    break;
                case "username":
                    comparison = (a.username || a.userName || "").localeCompare(b.username || b.userName || "");
                    break;
                case "quizName":
                    comparison = (a.quizName || "").localeCompare(b.quizName || "");
                    break;
                case "date":
                default:
                    comparison = new Date(a.createdAt || a.updatedAt || 0) - new Date(b.createdAt || b.updatedAt || 0);
                    break;
            }
            return sortOrder === "asc" ? comparison : -comparison;
        });

        return filtered;
    }, [reports, debouncedSearchQuery, statusFilter, scoreFilter, sortBy, sortOrder]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredAndSortedReports.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedReports = filteredAndSortedReports.slice(startIndex, endIndex);

    // Ensure currentPage doesn't exceed totalPages
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
            localStorage.setItem("adminReports_currentPage", totalPages.toString());
        }
    }, [totalPages]);

    // Persist currentPage to localStorage
    useEffect(() => {
        localStorage.setItem("adminReports_currentPage", currentPage.toString());
    }, [currentPage]);

    // Scroll position preservation for pagination
    useEffect(() => {
        restoreScrollPosition(scrollPositionRef);
    }, [currentPage]);

    // Calculate stats
    const stats = useMemo(() => {
        const total = reports.length;
        const passed = reports.filter(r => r.score >= r.total * 0.5).length;
        const failed = total - passed;
        const averageScore = total > 0
            ? (reports.reduce((sum, r) => sum + (r.score / r.total) * 100, 0) / total).toFixed(1)
            : 0;
        const uniqueUsers = new Set(reports.map(r => r.username || r.userName)).size;
        const uniqueQuizzes = new Set(reports.map(r => r.quizName)).size;

        return {
            total,
            passed,
            failed,
            averageScore,
            uniqueUsers,
            uniqueQuizzes,
            passRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0
        };
    }, [reports]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            setSearchQuery("");
        },
        'Ctrl+F': (e) => {
            e.preventDefault();
            const searchInput = document.querySelector('.admin-reports-search-input');
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
        const headers = ['Username', 'Quiz Name', 'Score', 'Total Marks', 'Percentage', 'Status', 'Date'];
        const rows = filteredAndSortedReports.map(report => {
            const percentage = ((report.score / report.total) * 100).toFixed(1);
            const passed = report.score >= report.total * 0.5;
            const date = report.createdAt || report.updatedAt || new Date().toISOString();
            return [
                report.username || report.userName || 'Unknown',
                report.quizName || 'Unknown Quiz',
                report.score?.toFixed(1) || '0',
                report.total || '0',
                `${percentage}%`,
                passed ? 'Passed' : 'Failed',
                new Date(date).toLocaleDateString()
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `admin-reports-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccess('Reports exported to CSV successfully!');
    }, [filteredAndSortedReports, showSuccess]);

    const deleteReport = useCallback(async (id) => {
        if (!id) {
            showWarning("Report ID is missing!");
            return;
        }

        try {
            setDeletingId(id);
            const response = await axios.delete(`/api/reports/${id}`);

            if (response.status === 200) {
                showSuccess("Report deleted successfully!");
                getReports(); // Refresh reports list after deletion
            }
        } catch (error) {
            console.error("Error deleting report:", error);
            showError("Failed to delete report. Check the API response.");
        } finally {
            setDeletingId(null);
        }
    }, [showWarning, showSuccess, showError]);

    // Fetch all reports
    const getReports = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/reports'); // auto-token
            setReports(response.data);
            setError("");
        } catch (error) {
            console.error("Error fetching reports:", error);
            setError("Error fetching reports. Try again later.");
            showError("Error fetching reports. Try again later.");
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        getReports();
    }, [getReports]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { y: 30, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.5, ease: "easeOut" }
        }
    };

    const tableRowVariants = {
        hidden: { x: -50, opacity: 0 },
        visible: {
            x: 0,
            opacity: 1,
            transition: { duration: 0.4, ease: "easeOut" }
        },
        exit: {
            x: 50,
            opacity: 0,
            scale: 0.9,
            transition: { duration: 0.3 }
        }
    };

    if (loading) return <Loading fullScreen={true} />;

    return (
        <motion.div
            className="admin-reports-container"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* Floating Decorative Elements */}
            <div className="floating-orb floating-orb-1"></div>
            <div className="floating-orb floating-orb-2"></div>
            <div className="floating-orb floating-orb-3"></div>

            <motion.div
                className="admin-reports-header"
                variants={itemVariants}
            >
                <motion.h1
                    whileHover={{ scale: 1.02 }}
                >
                    <span className="header-icon">📄</span>
                    All User Quiz Reports
                </motion.h1>
                <motion.button
                    className="export-btn"
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
                className="admin-reports-stats"
                variants={itemVariants}
            >
                <motion.div
                    className="stat-card total-reports"
                    whileHover={{ y: -5, scale: 1.02 }}
                >
                    <div className="stat-icon">📊</div>
                    <h3>Total Reports</h3>
                    <p className="stat-number">{stats.total}</p>
                </motion.div>
                <motion.div
                    className="stat-card passed-reports"
                    whileHover={{ y: -5, scale: 1.02 }}
                >
                    <div className="stat-icon">✅</div>
                    <h3>Passed</h3>
                    <p className="stat-number">{stats.passed}</p>
                    <p className="stat-subtitle">{stats.passRate}% pass rate</p>
                </motion.div>
                <motion.div
                    className="stat-card failed-reports"
                    whileHover={{ y: -5, scale: 1.02 }}
                >
                    <div className="stat-icon">❌</div>
                    <h3>Failed</h3>
                    <p className="stat-number">{stats.failed}</p>
                </motion.div>
                <motion.div
                    className="stat-card average-score"
                    whileHover={{ y: -5, scale: 1.02 }}
                >
                    <div className="stat-icon">📈</div>
                    <h3>Average Score</h3>
                    <p className="stat-number">{stats.averageScore}%</p>
                </motion.div>
                <motion.div
                    className="stat-card unique-users"
                    whileHover={{ y: -5, scale: 1.02 }}
                >
                    <div className="stat-icon">👥</div>
                    <h3>Unique Users</h3>
                    <p className="stat-number">{stats.uniqueUsers}</p>
                </motion.div>
                <motion.div
                    className="stat-card unique-quizzes"
                    whileHover={{ y: -5, scale: 1.02 }}
                >
                    <div className="stat-icon">🎯</div>
                    <h3>Unique Quizzes</h3>
                    <p className="stat-number">{stats.uniqueQuizzes}</p>
                </motion.div>
            </motion.div>

            {/* Search and Filter Controls */}
            <motion.div
                className="admin-reports-controls"
                variants={itemVariants}
            >
                <div className="admin-reports-search-wrapper">
                    <input
                        type="text"
                        className="admin-reports-search-input"
                        placeholder="Search by username or quiz name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search reports"
                    />
                    {searchQuery && (
                        <button
                            className="admin-reports-search-clear"
                            onClick={() => setSearchQuery("")}
                            aria-label="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="admin-reports-filters">
                    <CustomDropdown
                        value={statusFilter}
                        onChange={(e) => {
                            const value = e?.target?.value || e || 'all';
                            setStatusFilter(typeof value === 'string' ? value : 'all');
                        }}
                        options={[
                            { value: "all", label: "All Status" },
                            { value: "passed", label: "Passed" },
                            { value: "failed", label: "Failed" }
                        ]}
                        placeholder="Filter by Status"
                        ariaLabel="Filter reports by status"
                    />

                    <CustomDropdown
                        value={scoreFilter}
                        onChange={(e) => {
                            const value = e?.target?.value || e || 'all';
                            setScoreFilter(typeof value === 'string' ? value : 'all');
                        }}
                        options={[
                            { value: "all", label: "All Scores" },
                            { value: "excellent", label: "Excellent (90%+)" },
                            { value: "good", label: "Good (70-89%)" },
                            { value: "average", label: "Average (50-69%)" },
                            { value: "poor", label: "Poor (<50%)" }
                        ]}
                        placeholder="Filter by Score"
                        ariaLabel="Filter reports by score range"
                    />

                    <CustomDropdown
                        value={sortBy}
                        onChange={(e) => {
                            const value = e?.target?.value || e || 'date';
                            setSortBy(typeof value === 'string' ? value : 'date');
                        }}
                        options={[
                            { value: "date", label: "Sort by Date" },
                            { value: "score", label: "Sort by Score" },
                            { value: "username", label: "Sort by Username" },
                            { value: "quizName", label: "Sort by Quiz Name" }
                        ]}
                        placeholder="Sort by"
                        ariaLabel="Sort reports"
                    />

                    <button
                        className="sort-order-btn"
                        onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                        aria-label={`Sort order: ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
                    >
                        {sortOrder === "asc" ? "↑" : "↓"}
                    </button>
                </div>
            </motion.div>

            {/* Results Count */}
            {filteredAndSortedReports.length !== reports.length && (
                <motion.div
                    className="admin-reports-results-info"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <span className="results-highlight">
                        Showing {filteredAndSortedReports.length} of {reports.length} reports
                    </span>
                    {(searchQuery || statusFilter !== "all" || scoreFilter !== "all") && (
                        <button
                            className="results-clear-filters"
                            onClick={() => {
                                setSearchQuery("");
                                setStatusFilter("all");
                                setScoreFilter("all");
                            }}
                        >
                            Clear filters
                        </button>
                    )}
                </motion.div>
            )}

            {/* Reports Table */}
            {error ? (
                <motion.div
                    className="error-container"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key="error"
                >
                    <p className="error-message">{error}</p>
                </motion.div>
            ) : filteredAndSortedReports.length === 0 ? (
                <motion.div
                    className="admin-reports-empty-state"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key="no-reports"
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
                        📋
                    </motion.div>
                    <h3>
                        {searchQuery || statusFilter !== "all" || scoreFilter !== "all"
                            ? "No Reports Match Your Filters"
                            : "No Reports Found"}
                    </h3>
                    <p>
                        {searchQuery || statusFilter !== "all" || scoreFilter !== "all"
                            ? "Try adjusting your search or filter criteria."
                            : "Users haven't taken any quizzes yet!"}
                    </p>
                    {(searchQuery || statusFilter !== "all" || scoreFilter !== "all") && (
                        <button
                            className="empty-clear-filters"
                            onClick={() => {
                                setSearchQuery("");
                                setStatusFilter("all");
                                setScoreFilter("all");
                            }}
                        >
                            Clear filters
                        </button>
                    )}
                </motion.div>
            ) : (
                <motion.div
                    className="table-container"
                    variants={itemVariants}
                    key="reports-table"
                >
                    <table>
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Quiz Name</th>
                                <th>Score</th>
                                <th>Total Marks</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {paginatedReports.map((report, index) => (
                                    <ReportRow
                                        key={report._id || index}
                                        report={report}
                                        index={index}
                                        deleteReport={deleteReport}
                                        deletingId={deletingId}
                                    />
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </motion.div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <motion.div
                    className="admin-reports-pagination"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
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
                    transition={{ duration: 0.3, delay: 0.4 }}
                >
                    Page {currentPage} of {totalPages} • Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedReports.length)} of {filteredAndSortedReports.length} reports
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

export default AdminReports;
