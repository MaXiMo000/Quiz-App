import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import Loading from "../components/Loading";
import "./UserReports.css"; // Import the specific CSS file for UserReports
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";

const UserReports = () => {
    const [reports, setReports] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Search, filter, and sort states
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // all, passed, failed
    const [sortBy, setSortBy] = useState("date"); // date, score, quizName
    const [sortOrder, setSortOrder] = useState("desc"); // asc, desc

    // Notification system
    const { notification, showSuccess, showError, showWarning, hideNotification } = useNotification();

    // Initialize user from localStorage once
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        setUser(storedUser);
    }, []);

    const getReport = useCallback(async () => {
        if (!user?.name) return;

        try {
            const response = await axios.get(`/api/reports/user?username=${user.name}`); // auto-token
            setReports(response.data);
        } catch (error) {
            console.error("Error fetching quizzes:", error);
            setError("Error fetching Quiz. Try again later.");
        }
        finally{
            setLoading(false);
        }
    }, [user?.name]);

    useEffect(() => {
        if (user?.name) {
            getReport();
        }
    }, [user?.name, getReport]); // ✅ Include getReport in dependencies

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
            showError("Failed to delete report. Check the API response.");
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // Filter and sort reports
    const filteredAndSortedReports = useMemo(() => {
        let filtered = [...reports];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(report =>
                report.quizName.toLowerCase().includes(query)
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
    }, [reports, searchQuery, statusFilter, sortBy, sortOrder]);

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
                <h1>📄 My Quiz Reports</h1>
                <p className="reports-subtitle">Track your quiz performance and progress</p>
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
                        />
                    </div>

                    <div className="filter-controls">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Status</option>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="sort-select"
                        >
                            <option value="date">Sort by Date</option>
                            <option value="score">Sort by Score</option>
                            <option value="quizName">Sort by Quiz Name</option>
                        </select>

                        <button
                            className="sort-order-btn"
                            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                            title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
                        >
                            {sortOrder === "asc" ? "↑" : "↓"}
                        </button>
                    </div>

                    {filteredAndSortedReports.length !== reports.length && (
                        <div className="results-count">
                            Showing {filteredAndSortedReports.length} of {reports.length} reports
                        </div>
                    )}
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
                            {filteredAndSortedReports.map((report, index) => {
                                const percentage = Math.round((report.score / report.total) * 100);
                                const passed = report.score >= report.total * 0.5;
                                return (
                                <motion.tr
                                    key={report._id || index}
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
                                        <Link to={`/report/${report._id}`}>
                                            <button className="view-btn" title="View detailed report">📊</button>
                                        </Link>
                                        <button
                                            className="delete-btn"
                                            onClick={() => deleteReport(report._id)}
                                            title="Delete report"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </motion.tr>
                            );
                            })}
                        </tbody>
                    </table>

                    {/* Mobile Card Layout */}
                    {filteredAndSortedReports.map((report, index) => {
                        const percentage = Math.round((report.score / report.total) * 100);
                        const passed = report.score >= report.total * 0.5;
                        return (
                        <motion.div
                            key={`mobile-${report._id || index}`}
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
                    })}
                </div>
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
