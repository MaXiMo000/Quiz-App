import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import "../App.css";
import "./SearchResults.css";
import Loading from "../components/Loading";
import { useNotification } from "../hooks/useNotification";
import NotificationModal from "../components/NotificationModal";
import { addToQuizHistory } from "../utils/quizHistory";

const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get("q") || "";
    const navigate = useNavigate();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [typeFilter, setTypeFilter] = useState("all");
    const [sortBy, setSortBy] = useState("relevance");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const { notification, showError, hideNotification } = useNotification();

    const fetchResults = useCallback(async () => {
        if (!query.trim()) return;

        setLoading(true);
        try {
            const response = await axios.get("/api/search", {
                params: {
                    q: query,
                    type: typeFilter,
                    page: currentPage,
                    limit: itemsPerPage
                }
            });
            setResults(response.data);
        } catch (error) {
            console.error("Search error:", error);
            showError("Failed to search. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [query, typeFilter, currentPage, showError]);

    useEffect(() => {
        fetchResults();
    }, [fetchResults]);

    const handleResultClick = (result) => {
        switch (result.type) {
            case "quiz":
                addToQuizHistory({ _id: result._id });
                navigate(`/user/test/${result._id}`);
                break;
            case "report":
                navigate(`/report/${result._id}`);
                break;
            case "user":
                // Navigate to user profile if implemented
                break;
            case "studyGroup":
                navigate(`/study-groups/${result._id}`);
                break;
        }
    };

    const sortedResults = useMemo(() => {
        if (!results) return null;

        const allResults = {
            quizzes: [...(results.results?.quizzes || [])],
            reports: [...(results.results?.reports || [])],
            users: [...(results.results?.users || [])],
            studyGroups: [...(results.results?.studyGroups || [])]
        };

        // Sort by date (newest first) or relevance
        if (sortBy === "date") {
            allResults.reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            allResults.studyGroups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        return allResults;
    }, [results, sortBy]);

    if (loading) return <Loading fullScreen={true} />;

    return (
        <motion.div
            className="search-results-page"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="search-results-header">
                <h1 className="search-results-title">
                    Search Results for "{query}"
                </h1>
                {results && (
                    <p className="search-results-count">
                        Found {results.pagination?.total || 0} results
                    </p>
                )}
            </div>

            {results && (
                <div className="search-results-controls">
                    <div className="filter-tabs">
                        <button
                            className={`filter-tab ${typeFilter === "all" ? "active" : ""}`}
                            onClick={() => setTypeFilter("all")}
                        >
                            All
                        </button>
                        <button
                            className={`filter-tab ${typeFilter === "quizzes" ? "active" : ""}`}
                            onClick={() => setTypeFilter("quizzes")}
                        >
                            Quizzes ({results.results?.quizzes?.length || 0})
                        </button>
                        <button
                            className={`filter-tab ${typeFilter === "reports" ? "active" : ""}`}
                            onClick={() => setTypeFilter("reports")}
                        >
                            Reports ({results.results?.reports?.length || 0})
                        </button>
                        <button
                            className={`filter-tab ${typeFilter === "groups" ? "active" : ""}`}
                            onClick={() => setTypeFilter("groups")}
                        >
                            Groups ({results.results?.studyGroups?.length || 0})
                        </button>
                        {results.results?.users && results.results.users.length > 0 && (
                            <button
                                className={`filter-tab ${typeFilter === "users" ? "active" : ""}`}
                                onClick={() => setTypeFilter("users")}
                            >
                                Users ({results.results.users.length})
                            </button>
                        )}
                    </div>

                    <select
                        className="sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="relevance">Sort by Relevance</option>
                        <option value="date">Sort by Date</option>
                    </select>
                </div>
            )}

            {results && sortedResults && (
                <div className="search-results-content">
                    {typeFilter === "all" || typeFilter === "quizzes" ? (
                        sortedResults.quizzes.length > 0 && (
                            <div className="results-section">
                                <h2 className="section-title">📚 Quizzes</h2>
                                <div className="results-grid">
                                    {sortedResults.quizzes.map((quiz) => (
                                        <motion.div
                                            key={quiz._id}
                                            className="result-card"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ y: -4 }}
                                            onClick={() => handleResultClick(quiz)}
                                        >
                                            <h3 className="card-title">{quiz.title}</h3>
                                            <p className="card-description">{quiz.description}</p>
                                            <div className="card-meta">
                                                <span>{quiz.category}</span>
                                                <span>⏱️ {quiz.duration} min</span>
                                                <span>📝 {quiz.questionCount} questions</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )
                    ) : null}

                    {typeFilter === "all" || typeFilter === "reports" ? (
                        sortedResults.reports.length > 0 && (
                            <div className="results-section">
                                <h2 className="section-title">📄 Reports</h2>
                                <div className="results-list">
                                    {sortedResults.reports.map((report) => (
                                        <motion.div
                                            key={report._id}
                                            className="result-item"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            onClick={() => handleResultClick(report)}
                                        >
                                            <div className="item-content">
                                                <h3 className="item-title">{report.quizName}</h3>
                                                <div className="item-meta">
                                                    <span>{report.userName}</span>
                                                    <span>Score: {report.score}/{report.total}</span>
                                                    <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )
                    ) : null}

                    {typeFilter === "all" || typeFilter === "groups" ? (
                        sortedResults.studyGroups.length > 0 && (
                            <div className="results-section">
                                <h2 className="section-title">👥 Study Groups</h2>
                                <div className="results-grid">
                                    {sortedResults.studyGroups.map((group) => (
                                        <motion.div
                                            key={group._id}
                                            className="result-card"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ y: -4 }}
                                            onClick={() => handleResultClick(group)}
                                        >
                                            <h3 className="card-title">{group.name}</h3>
                                            <p className="card-description">{group.description}</p>
                                            <div className="card-meta">
                                                <span>{group.category}</span>
                                                <span>👥 {group.memberCount}/{group.maxMembers}</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )
                    ) : null}

                    {typeFilter === "all" || typeFilter === "users" ? (
                        sortedResults.users && sortedResults.users.length > 0 && (
                            <div className="results-section">
                                <h2 className="section-title">👤 Users</h2>
                                <div className="results-grid">
                                    {sortedResults.users.map((user) => (
                                        <motion.div
                                            key={user._id}
                                            className="result-card"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ y: -4 }}
                                        >
                                            <h3 className="card-title">{user.name}</h3>
                                            <div className="card-meta">
                                                <span>{user.email}</span>
                                                <span>Level {user.level}</span>
                                                <span>⭐ {user.xp} XP</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )
                    ) : null}

                    {results.pagination && results.pagination.totalPages > 1 && (
                        <div className="search-pagination">
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                ← Previous
                            </button>
                            <span className="pagination-info">
                                Page {currentPage} of {results.pagination.totalPages}
                            </span>
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(prev => Math.min(results.pagination.totalPages, prev + 1))}
                                disabled={currentPage === results.pagination.totalPages}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {results && results.pagination?.total === 0 && (
                <div className="search-no-results">
                    <div className="no-results-icon">🔍</div>
                    <h2>No results found</h2>
                    <p>Try adjusting your search query or filters</p>
                </div>
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

export default SearchResults;
