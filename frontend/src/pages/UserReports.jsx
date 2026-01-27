import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import Loading from "../components/Loading";
import "./UserReports.css"; // Import the specific CSS file for UserReports
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { exportReportsSummaryAsCSV, exportReportAsPDF, exportReportAsCSV } from "../utils/exportUtils";
import { debounce } from "../utils/componentUtils";
import CustomDropdown from "../components/CustomDropdown";

// Memoized Report Row Component for Desktop Table
const ReportTableRow = memo(({ report, index, formatDate, deleteReport, exportReportAsPDF, exportReportAsCSV }) => {
    const percentage = Math.round((report.score / report.total) * 100);
    const passed = report.score >= report.total * 0.5;

    return (
        <motion.tr
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <td className="quiz-name-cell">{report.quizName}</td>
            <td className="score-cell">{report.score.toFixed(1)}</td>
            <td className="total-cell">{report.total}</td>
            <td className="percentage-cell">
                <div className="percentage-bar-container">
                    <div
                        className={`percentage-bar ${passed ? 'passed' : 'failed'}`}
                        style={{ width: `${percentage}%` }}
                    />
                    <span className="percentage-text">{percentage}%</span>
                </div>
            </td>
            <td className="date-cell">{formatDate(report.createdAt || report.updatedAt)}</td>
            <td className="status-cell">
                <span className={`status-badge ${passed ? 'passed' : 'failed'}`}>
                    {passed ? "✅ Passed" : "❌ Failed"}
                </span>
            </td>
            <td className="actions-cell">
                <div className="report-actions">
                    <Link to={`/report/${report._id}`}>
                        <button
                            className="view-btn"
                            title="View detailed report"
                            aria-label="View detailed report"
                        >
                            📊
                        </button>
                    </Link>
                    <div className="quick-actions-dropdown">
                        <button
                            className="quick-actions-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                const dropdown = e.currentTarget.nextElementSibling;
                                if (dropdown) {
                                    dropdown.classList.toggle('show');
                                }
                            }}
                            aria-label="Quick actions menu"
                            title="Quick actions (Export PDF/CSV)"
                        >
                            ⋯
                        </button>
                        <div className="quick-actions-menu">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    exportReportAsPDF(report);
                                    const menu = e.currentTarget.closest('.quick-actions-menu');
                                    if (menu) menu.classList.remove('show');
                                }}
                                aria-label="Export as PDF"
                            >
                                📄 PDF
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    exportReportAsCSV(report);
                                    const menu = e.currentTarget.closest('.quick-actions-menu');
                                    if (menu) menu.classList.remove('show');
                                }}
                                aria-label="Export as CSV"
                            >
                                📊 CSV
                            </button>
                        </div>
                    </div>
                    <button
                        className="delete-btn"
                        onClick={() => deleteReport(report._id)}
                        title="Delete report"
                        aria-label={`Delete report for ${report.quizName}`}
                    >
                        🗑️
                    </button>
                </div>
            </td>
        </motion.tr>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for better memoization
    return (
        prevProps.report._id === nextProps.report._id &&
        prevProps.index === nextProps.index &&
        prevProps.report.score === nextProps.report.score &&
        prevProps.report.total === nextProps.report.total
    );
});

ReportTableRow.displayName = 'ReportTableRow';

// Memoized Report Card Component for Mobile
const ReportCard = memo(({ report, index, formatDate, deleteReport }) => {
    const percentage = Math.round((report.score / report.total) * 100);
    const passed = report.score >= report.total * 0.5;

    return (
        <motion.div
            className="report-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <div className="report-header">
                <h3 className="report-title">{report.quizName}</h3>
                <div className={`report-status ${passed ? 'passed' : 'failed'}`}>
                    {passed ? "✅ Passed" : "❌ Failed"}
                </div>
            </div>

            <div className="report-details">
                <div className="report-detail">
                    <div className="report-detail-label">Score</div>
                    <div className="report-detail-value">{report.score.toFixed(1)} / {report.total}</div>
                </div>
                <div className="report-detail">
                    <div className="report-detail-label">Percentage</div>
                    <div className="report-detail-value">{percentage}%</div>
                </div>
                <div className="report-detail">
                    <div className="report-detail-label">Date</div>
                    <div className="report-detail-value">{formatDate(report.createdAt || report.updatedAt)}</div>
                </div>
            </div>

            <div className="report-progress">
                <div
                    className={`progress-bar ${passed ? 'passed' : 'failed'}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <div className="report-actions">
                <Link to={`/report/${report._id}`}>
                    <button className="view-btn">📊 View Report</button>
                </Link>
                <button className="delete-btn" onClick={() => deleteReport(report._id)}>🗑️ Delete</button>
            </div>
        </motion.div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for better memoization
    return (
        prevProps.report._id === nextProps.report._id &&
        prevProps.index === nextProps.index &&
        prevProps.report.score === nextProps.report.score &&
        prevProps.report.total === nextProps.report.total
    );
});

ReportCard.displayName = 'ReportCard';

const UserReports = () => {
    const [reports, setReports] = useState([]);
    const [user, setUser] = useState(() => {
        // Initialize user from localStorage
        try {
            return JSON.parse(localStorage.getItem("user"));
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Search, filter, and sort states (with localStorage persistence)
    const [searchQuery, setSearchQuery] = useState(() => {
        const saved = localStorage.getItem("userReports_searchQuery");
        return saved || "";
    });
    const [statusFilter, setStatusFilter] = useState(() => {
        const saved = localStorage.getItem("userReports_statusFilter");
        return saved || "all";
    });
    const [sortBy, setSortBy] = useState(() => {
        const saved = localStorage.getItem("userReports_sortBy");
        return saved || "date";
    });
    const [sortOrder, setSortOrder] = useState(() => {
        const saved = localStorage.getItem("userReports_sortOrder");
        return saved || "desc";
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(() => {
        const saved = parseInt(localStorage.getItem("userReports_currentPage"), 10);
        return saved && !isNaN(saved) ? saved : 1;
    });
    const itemsPerPage = 10;

    // Debounced search query for filtering
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    const debouncedSetSearch = useRef(
        debounce((value) => {
            setDebouncedSearchQuery(value);
            localStorage.setItem("userReports_searchQuery", value);
        }, 300)
    ).current;

    // Notification system
    const { notification, showSuccess, showError, showWarning, hideNotification } = useNotification();

    // Persist filter changes to localStorage
    useEffect(() => {
        localStorage.setItem("userReports_statusFilter", statusFilter);
    }, [statusFilter]);

    useEffect(() => {
        localStorage.setItem("userReports_sortBy", sortBy);
    }, [sortBy]);

    useEffect(() => {
        localStorage.setItem("userReports_sortOrder", sortOrder);
    }, [sortOrder]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
        localStorage.setItem("userReports_currentPage", "1");
    }, [debouncedSearchQuery, statusFilter, sortBy, sortOrder]);

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
                report.quizName?.toLowerCase().includes(query) ||
                report.userName?.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(report => {
                const passed = report.score >= report.total * 0.5;
                return statusFilter === "passed" ? passed : !passed;
            });
        }

        // Sort
        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case "score":
                    comparison = a.score - b.score;
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
    }, [reports, debouncedSearchQuery, statusFilter, sortBy, sortOrder]);

    // Pagination calculations - ensure totalPages is at least 1
    const totalPages = Math.max(1, Math.ceil(filteredAndSortedReports.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedReports = filteredAndSortedReports.slice(startIndex, endIndex);

    // Ensure currentPage doesn't exceed totalPages after sorting/filtering
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
            localStorage.setItem("userReports_currentPage", totalPages.toString());
        }
    }, [currentPage, totalPages]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            // Close any open dropdowns
            const dropdowns = document.querySelectorAll('.quick-actions-menu.show');
            dropdowns.forEach(dropdown => dropdown.classList.remove('show'));

            // Clear search if active
            if (searchQuery) {
                setSearchQuery("");
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
    }, [searchQuery, currentPage, totalPages]);

    const getReport = useCallback(async () => {
        const currentUser = user || JSON.parse(localStorage.getItem("user"));
        if (!currentUser?.name) {
            setLoading(false);
            setError("Please log in to view reports.");
            return;
        }

        try {
            setLoading(true);
            const response = await axios.get(`/api/reports/user?username=${currentUser.name}`); // auto-token
            setReports(response.data || []);
            setError("");
        } catch (error) {
            console.error("Error fetching reports:", error);
            const errorMessage = error.response?.status === 401
                ? "Please log in to view your reports."
                : error.response?.status === 404
                ? "No reports found. Complete quizzes to generate reports!"
                : "Unable to load reports. Please check your connection and try again.";
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [user, showError]);

    // Initialize user and fetch reports
    useEffect(() => {
        let isMounted = true;

        const initializeAndFetch = async () => {
            // Get user from localStorage if not set
            if (!user) {
                try {
                    const storedUser = JSON.parse(localStorage.getItem("user"));
                    if (storedUser) {
                        setUser(storedUser);
                    } else {
                        if (isMounted) {
                            setError("Please log in to view reports.");
                            setLoading(false);
                        }
                        return;
                    }
                } catch (err) {
                    if (isMounted) {
                        setError("Error loading user data.");
                        setLoading(false);
                    }
                    return;
                }
            }

            // Fetch reports
            const currentUser = user || JSON.parse(localStorage.getItem("user"));
            if (currentUser?.name && isMounted) {
                await getReport();
            } else if (isMounted) {
                setLoading(false);
            }
        };

        initializeAndFetch();

        return () => {
            isMounted = false;
        };
    }, []); // Run only once on mount

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.quick-actions-dropdown')) {
                document.querySelectorAll('.quick-actions-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Add class to body for full-page scrolling
    useEffect(() => {
        document.body.classList.add('user-reports-page');
        document.documentElement.classList.add('user-reports-page');

        // Cleanup on unmount
        return () => {
            document.body.classList.remove('user-reports-page');
            document.documentElement.classList.remove('user-reports-page');
        };
    }, []);

    const deleteReport = async (id) => {
        if (!id) {
            showWarning("Report ID is missing!");
            return;
        }

        if (!window.confirm("Are you sure you want to delete this report?")) {
            return;
        }

        try {
            const response = await axios.delete(`/api/reports/${id}`);

            if (response.status === 200) {
                showSuccess("Report deleted successfully!");
                getReport(); // Refresh reports list after deletion
            }
        } catch (error) {
            console.error("Error deleting report:", error);
            const errorMessage = error.response?.status === 404
                ? "Report not found. It may have already been deleted."
                : error.response?.status === 403
                ? "You don't have permission to delete this report."
                : "Failed to delete report. Please try again or refresh the page.";
            showError(errorMessage);
        }
    };

    // Format date for display
    const formatDate = useCallback((dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }, []);

    // Wrapper functions for export with error handling
    const handleExportPDF = useCallback((report) => {
        try {
            exportReportAsPDF(report);
            showSuccess('PDF export started! Check your print dialog.');
        } catch (error) {
            console.error('PDF export error:', error);
            showError('Failed to export PDF. Please try again.');
        }
    }, [showSuccess, showError]);

    const handleExportCSV = useCallback((report) => {
        try {
            exportReportAsCSV(report);
            showSuccess('CSV file downloaded successfully!');
        } catch (error) {
            console.error('CSV export error:', error);
            showError('Failed to export CSV. Please try again.');
        }
    }, [showSuccess, showError]);

    // Calculate statistics
    const stats = useMemo(() => {
        const total = reports.length;
        const passed = reports.filter(r => r.score >= r.total * 0.5).length;
        const failed = total - passed;
        const avgScore = total > 0
            ? (reports.reduce((sum, r) => sum + r.score, 0) / total).toFixed(1)
            : 0;
        const totalQuizzes = new Set(reports.map(r => r.quizName)).size;

        return { total, passed, failed, avgScore, totalQuizzes };
    }, [reports]);

    if (loading) return <Loading fullScreen={true} />;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="container user-reports-page">
            <div className="reports-bg-orbs">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>
            <motion.div
                className="reports-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
                    <div>
                        <h1>📄 My Quiz Reports</h1>
                        <p className="reports-subtitle">Track your quiz performance and progress</p>
                    </div>
                    {reports.length > 0 && (
                        <motion.button
                            className="export-summary-btn"
                            onClick={() => {
                                try {
                                    exportReportsSummaryAsCSV(reports);
                                    showSuccess(`Exported ${reports.length} reports successfully!`);
                                } catch (error) {
                                    console.error('Export error:', error);
                                    showError('Failed to export reports. Please try again.');
                                }
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Export all reports as CSV"
                            aria-label="Export all reports summary as CSV"
                        >
                            📊 Export All
                        </motion.button>
                    )}
                </div>
            </motion.div>

            {/* Statistics Cards */}
            {reports.length > 0 && (
                <motion.div
                    className="reports-stats"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="stat-card">
                        <div className="stat-icon">📊</div>
                        <div className="stat-info">
                            <div className="stat-value">{stats.total}</div>
                            <div className="stat-label">Total Reports</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                            <div className="stat-value">{stats.passed}</div>
                            <div className="stat-label">Passed</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📈</div>
                        <div className="stat-info">
                            <div className="stat-value">{stats.avgScore}</div>
                            <div className="stat-label">Avg Score</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🎯</div>
                        <div className="stat-info">
                            <div className="stat-value">{stats.totalQuizzes}</div>
                            <div className="stat-label">Unique Quizzes</div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Search, Filter, and Sort Controls */}
            {reports.length > 0 && (
                <motion.div
                    className="reports-controls"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="search-container">
                        <input
                            type="text"
                            placeholder="🔍 Search reports..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                            aria-label="Search reports"
                            aria-describedby="reports-search-description"
                        />
                        <span id="reports-search-description" className="sr-only">
                            Search reports by quiz name, date, or score
                        </span>
                    </div>

                    <div className="filter-controls">
                        <CustomDropdown
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={[
                                { value: "all", label: "All Status" },
                                { value: "passed", label: "Passed" },
                                { value: "failed", label: "Failed" }
                            ]}
                            className="filter-select"
                            ariaLabel="Filter reports by status"
                        />

                        <CustomDropdown
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            options={[
                                { value: "date", label: "Sort by Date" },
                                { value: "score", label: "Sort by Score" },
                                { value: "quizName", label: "Sort by Quiz Name" }
                            ]}
                            className="sort-select"
                            ariaLabel="Sort reports by"
                        />

                        <button
                            className="sort-order-btn"
                            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                            title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
                            aria-label={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
                            aria-pressed={sortOrder === "desc"}
                        >
                            {sortOrder === "asc" ? "↑" : "↓"}
                        </button>
                    </div>

                    <div className="results-count">
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedReports.length)} of {filteredAndSortedReports.length} reports
                        {filteredAndSortedReports.length !== reports.length && ` (${reports.length} total)`}
                    </div>
                </motion.div>
            )}

            {reports.length === 0 ? (
                <motion.div
                    className="empty-reports"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div className="empty-icon">📝</div>
                    <h3>No Reports Yet</h3>
                    <p>Complete quizzes to see your reports here!</p>
                    <button className="start-quiz-btn" onClick={() => window.location.href = "/user/test"}>
                        Start Your First Quiz
                    </button>
                </motion.div>
            ) : filteredAndSortedReports.length === 0 ? (
                <motion.div
                    className="empty-reports"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div className="empty-icon">🔍</div>
                    <h3>No Reports Match Your Filters</h3>
                    <p>Try adjusting your search or filter criteria</p>
                </motion.div>
            ) : (
                <div className="table-container">
                    {/* Desktop Table */}
                    <table>
                        <thead>
                            <tr>
                                <th>Quiz Name</th>
                                <th>Score</th>
                                <th>Total Marks</th>
                                <th>Percentage</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedReports.map((report, index) => (
                                <ReportTableRow
                                    key={report._id || `table-${index}`}
                                    report={report}
                                    index={index}
                                    formatDate={formatDate}
                                    deleteReport={deleteReport}
                                    exportReportAsPDF={handleExportPDF}
                                    exportReportAsCSV={handleExportCSV}
                                />
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile Card Layout */}
                    {paginatedReports.map((report, index) => (
                        <ReportCard
                            key={report._id || `mobile-${index}`}
                            report={report}
                            index={index}
                            formatDate={formatDate}
                            deleteReport={deleteReport}
                        />
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {filteredAndSortedReports.length > itemsPerPage && (
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

            {/* Notification Modal */}
            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
                autoClose={notification.autoClose}
            />
        </div>
    );
};

export default UserReports;
