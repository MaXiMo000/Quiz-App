import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios";
import { debounce } from "../utils/componentUtils";
import "./GlobalSearch.css";

const GlobalSearch = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const searchRef = useRef(null);
    const resultsRef = useRef(null);
    const navigate = useNavigate();

    // Debounced search
    const debouncedSearch = useRef(
        debounce(async (searchQuery) => {
            if (!searchQuery.trim() || searchQuery.length < 2) {
                setResults(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const response = await axios.get("/api/search", {
                    params: { q: searchQuery, type: "all", limit: 5 }
                });
                setResults(response.data);
            } catch (error) {
                console.error("Search error:", error);
                setResults(null);
            } finally {
                setLoading(false);
            }
        }, 300)
    ).current;

    useEffect(() => {
        if (query.trim()) {
            debouncedSearch(query);
        } else {
            setResults(null);
        }
    }, [query, debouncedSearch]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsOpen(false);
                setSelectedIndex(-1);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (!results || !results.results) return;

        const allResults = [
            ...(results.results.quizzes || []),
            ...(results.results.reports || []),
            ...(results.results.users || []),
            ...(results.results.studyGroups || [])
        ];

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, -1));
                break;
            case "Enter":
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < allResults.length) {
                    handleResultClick(allResults[selectedIndex]);
                } else if (query.trim()) {
                    navigate(`/search?q=${encodeURIComponent(query)}`);
                    setIsOpen(false);
                }
                break;
            case "Escape":
                setIsOpen(false);
                setQuery("");
                setResults(null);
                break;
        }
    };

    const handleResultClick = (result) => {
        switch (result.type) {
            case "quiz":
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
        setIsOpen(false);
        setQuery("");
    };

    const handleInputFocus = () => {
        setIsOpen(true);
    };

    const handleViewAll = () => {
        navigate(`/search?q=${encodeURIComponent(query)}`);
        setIsOpen(false);
    };

    const totalResults = results
        ? (results.results?.quizzes?.length || 0) +
          (results.results?.reports?.length || 0) +
          (results.results?.users?.length || 0) +
          (results.results?.studyGroups?.length || 0)
        : 0;

    return (
        <div className="global-search" ref={searchRef}>
            <div className="search-input-wrapper">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search quizzes, reports, groups..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                        setSelectedIndex(-1);
                    }}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                />
                {query && (
                    <button
                        className="search-clear"
                        onClick={() => {
                            setQuery("");
                            setResults(null);
                        }}
                        aria-label="Clear search"
                    >
                        ×
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isOpen && query.trim() && (
                    <motion.div
                        className="search-results-dropdown"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        ref={resultsRef}
                    >
                        {loading ? (
                            <div className="search-loading">Searching...</div>
                        ) : results && totalResults > 0 ? (
                            <>
                        {results.results?.quizzes && results.results.quizzes.length > 0 && (
                            <div className="search-section">
                                <div className="search-section-header">📚 Quizzes</div>
                                {results.results.quizzes.map((quiz, idx) => {
                                    const globalIdx = idx;
                                    return (
                                        <div
                                            key={quiz._id}
                                            className={`search-result-item ${selectedIndex === globalIdx ? "selected" : ""}`}
                                            onClick={() => handleResultClick(quiz)}
                                        >
                                            <div className="result-title">{quiz.title}</div>
                                            <div className="result-meta">
                                                {quiz.category} • {quiz.questionCount} questions
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {results.results?.reports && results.results.reports.length > 0 && (
                            <div className="search-section">
                                <div className="search-section-header">📄 Reports</div>
                                {results.results.reports.map((report, idx) => {
                                    const globalIdx = (results.results?.quizzes?.length || 0) + idx;
                                    return (
                                        <div
                                            key={report._id}
                                            className={`search-result-item ${selectedIndex === globalIdx ? "selected" : ""}`}
                                            onClick={() => handleResultClick(report)}
                                        >
                                            <div className="result-title">{report.quizName}</div>
                                            <div className="result-meta">
                                                {report.userName} • Score: {report.score}/{report.total}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {results.results?.studyGroups && results.results.studyGroups.length > 0 && (
                            <div className="search-section">
                                <div className="search-section-header">👥 Study Groups</div>
                                {results.results.studyGroups.map((group, idx) => {
                                    const globalIdx =
                                        (results.results?.quizzes?.length || 0) +
                                        (results.results?.reports?.length || 0) +
                                        idx;
                                    return (
                                        <div
                                            key={group._id}
                                            className={`search-result-item ${selectedIndex === globalIdx ? "selected" : ""}`}
                                            onClick={() => handleResultClick(group)}
                                        >
                                            <div className="result-title">{group.name}</div>
                                            <div className="result-meta">
                                                {group.category} • {group.memberCount} members
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {results.results?.users && results.results.users.length > 0 && (
                            <div className="search-section">
                                <div className="search-section-header">👤 Users</div>
                                {results.results.users.map((user, idx) => {
                                    const globalIdx =
                                        (results.results?.quizzes?.length || 0) +
                                        (results.results?.reports?.length || 0) +
                                        (results.results?.studyGroups?.length || 0) +
                                        idx;
                                    return (
                                        <div
                                            key={user._id}
                                            className={`search-result-item ${selectedIndex === globalIdx ? "selected" : ""}`}
                                            onClick={() => handleResultClick(user)}
                                        >
                                            <div className="result-title">{user.name}</div>
                                            <div className="result-meta">
                                                {user.email} • Level {user.level}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                                <div className="search-footer">
                                    <button className="view-all-btn" onClick={handleViewAll}>
                                        View all results →
                                    </button>
                                </div>
                            </>
                        ) : query.trim().length >= 2 ? (
                            <div className="search-no-results">No results found</div>
                        ) : null}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GlobalSearch;
