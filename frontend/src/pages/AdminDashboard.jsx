import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import "../App.css";
import "./AdminDashboard.css";
import Spinner from "../components/Spinner";
import MigrationPanel from "../components/MigrationPanel";
import Loading from "../components/Loading";
import NotificationModal from "../components/NotificationModal";
import CustomDropdown from "../components/CustomDropdown";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { debounce } from "../utils/componentUtils";

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [quizs, setQuizs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Search, filter, and sort states (with localStorage persistence)
    const [searchQuery, setSearchQuery] = useState(() => {
        const saved = localStorage.getItem("adminDashboard_searchQuery");
        return saved || "";
    });
    const [roleFilter, setRoleFilter] = useState(() => {
        const saved = localStorage.getItem("adminDashboard_roleFilter");
        return saved || "all";
    });
    const [sortBy, setSortBy] = useState(() => {
        const saved = localStorage.getItem("adminDashboard_sortBy");
        return saved || "name";
    });
    const [sortOrder, setSortOrder] = useState(() => {
        const saved = localStorage.getItem("adminDashboard_sortOrder");
        return saved || "asc";
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(() => {
        const saved = parseInt(localStorage.getItem("adminDashboard_currentPage"), 10);
        return saved && !isNaN(saved) ? saved : 1;
    });
    const itemsPerPage = 10;
    const scrollPositionRef = useRef(0);

    // Debounced search query for filtering
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    const debouncedSetSearch = useRef(
        debounce((value) => {
            setDebouncedSearchQuery(value);
            localStorage.setItem("adminDashboard_searchQuery", value);
        }, 300)
    ).current;

    // Notification system
    const { notification, showError, showSuccess, hideNotification } = useNotification();

    // Persist filter changes to localStorage
    useEffect(() => {
        localStorage.setItem("adminDashboard_roleFilter", roleFilter);
    }, [roleFilter]);

    useEffect(() => {
        localStorage.setItem("adminDashboard_sortBy", sortBy);
    }, [sortBy]);

    useEffect(() => {
        localStorage.setItem("adminDashboard_sortOrder", sortOrder);
    }, [sortOrder]);

    // Reset to page 1 when filters change
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
            localStorage.setItem("adminDashboard_currentPage", "1");
        }
    }, [debouncedSearchQuery, roleFilter, sortBy, sortOrder]);

    // Handle search input with debouncing
    useEffect(() => {
        debouncedSetSearch(searchQuery);
    }, [searchQuery, debouncedSetSearch]);

    // Filter and sort users
    const filteredAndSortedUsers = useMemo(() => {
        let filtered = [...users];

        // Search filter (using debounced value)
        if (debouncedSearchQuery) {
            const query = debouncedSearchQuery.toLowerCase();
            filtered = filtered.filter(user =>
                user.name?.toLowerCase().includes(query) ||
                user.email?.toLowerCase().includes(query) ||
                user.role?.toLowerCase().includes(query)
            );
        }

        // Role filter
        if (roleFilter !== "all" && roleFilter) {
            const filterRole = String(roleFilter).toLowerCase();
            filtered = filtered.filter(user => {
                const userRole = (user.role || 'user').toLowerCase();
                return userRole === filterRole;
            });
        }

        // Sort
        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case "email":
                    comparison = (a.email || "").localeCompare(b.email || "");
                    break;
                case "role":
                    comparison = (a.role || "user").toLowerCase().localeCompare((b.role || "user").toLowerCase());
                    break;
                case "name":
                default:
                    comparison = (a.name || "").localeCompare(b.name || "");
                    break;
            }
            return sortOrder === "asc" ? comparison : -comparison;
        });

        return filtered;
    }, [users, debouncedSearchQuery, roleFilter, sortBy, sortOrder]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredAndSortedUsers.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = filteredAndSortedUsers.slice(startIndex, endIndex);

    // Ensure currentPage doesn't exceed totalPages
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
            localStorage.setItem("adminDashboard_currentPage", totalPages.toString());
        }
    }, [currentPage, totalPages]);

    // Persist currentPage to localStorage
    useEffect(() => {
        localStorage.setItem("adminDashboard_currentPage", currentPage.toString());
    }, [currentPage]);

    // Scroll position preservation for pagination
    useEffect(() => {
        if (scrollPositionRef.current > 0) {
            const restoreScroll = () => {
                const originalScrollBehavior = document.documentElement.style.scrollBehavior;
                document.documentElement.style.scrollBehavior = 'auto';
                window.scrollTo(0, scrollPositionRef.current);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            document.documentElement.style.scrollBehavior = originalScrollBehavior;
                        });
                    });
                });
            };
            restoreScroll();
            setTimeout(restoreScroll, 0);
        }
    }, [currentPage]);

    // Extract unique roles for filter dropdown
    const uniqueRoles = useMemo(() => {
        const roles = [...new Set(users.map(user => {
            const role = (user.role || 'user').toLowerCase();
            // Capitalize first letter for display
            return role.charAt(0).toUpperCase() + role.slice(1);
        }))];
        return roles.sort();
    }, [users]);

    // Calculate additional stats
    const stats = useMemo(() => {
        // Roles are stored as lowercase in DB: "admin", "user", "premium"
        const premiumUsers = users.filter(u => {
            const role = (u.role || '').toLowerCase();
            return role === 'premium';
        }).length;
        const regularUsers = users.filter(u => {
            const role = (u.role || '').toLowerCase();
            return !role || role === 'user';
        }).length;
        const adminUsers = users.filter(u => {
            const role = (u.role || '').toLowerCase();
            return role === 'admin';
        }).length;
        const activeUsers = users.length; // Could be enhanced with lastLogin tracking

        return {
            total: users.length,
            premium: premiumUsers,
            regular: regularUsers,
            admin: adminUsers,
            active: activeUsers
        };
    }, [users]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            setSearchQuery("");
        },
        'Ctrl+F': (e) => {
            e.preventDefault();
            const searchInput = document.querySelector('.admin-search-input');
            if (searchInput) searchInput.focus();
        },
        'ArrowLeft': (e) => {
            if (currentPage > 1) {
                e.preventDefault();
                e.stopPropagation();
                const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                scrollPositionRef.current = currentScroll;
                setCurrentPage(prev => prev - 1);
            }
        },
        'ArrowRight': (e) => {
            if (currentPage < totalPages) {
                e.preventDefault();
                e.stopPropagation();
                const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                scrollPositionRef.current = currentScroll;
                setCurrentPage(prev => prev + 1);
            }
        },
    }, [currentPage, totalPages]);

    // Pagination handlers
    const handlePageChange = useCallback((newPage) => {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        scrollPositionRef.current = currentScroll;
        setCurrentPage(newPage);
    }, []);

    const handlePrevPage = useCallback(() => {
        if (currentPage > 1) {
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            scrollPositionRef.current = currentScroll;
            setCurrentPage(prev => prev - 1);
        }
    }, [currentPage]);

    const handleNextPage = useCallback(() => {
        if (currentPage < totalPages) {
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            scrollPositionRef.current = currentScroll;
            setCurrentPage(prev => prev + 1);
        }
    }, [currentPage, totalPages]);

    // Export functionality
    const handleExportCSV = useCallback(() => {
        const headers = ['Name', 'Email', 'Role'];
        const rows = filteredAndSortedUsers.map(user => [
            user.name || 'Unknown',
            user.email || 'No email',
            (user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1).toLowerCase()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `admin-users-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccess('Users exported successfully!');
    }, [filteredAndSortedUsers, showSuccess]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get(`/api/users`);
                setUsers(res.data);
            } catch (error) {
                console.error("Error fetching users:", error);
                const errorMsg = "Error fetching users. Try again later.";
                setError(errorMsg);
                showError(errorMsg);
            }
            finally{
                setLoading(false);
            }
        };

        const fetchQuizs = async () => {
            try {
                const res = await axios.get(`/api/quizzes`);
                setQuizs(res.data);
            } catch (error) {
                console.error("Error fetching quizzes:", error);
                const errorMsg = "Error fetching quizzes. Try again later.";
                setError(errorMsg);
                showError(errorMsg);
            }
            finally{
                setLoading(false);
            }
        };

        fetchUsers();
        fetchQuizs();
    }, []);

    // Add scroll indicator functionality
    useEffect(() => {
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            const handleScroll = () => {
                const { scrollTop, scrollHeight, clientHeight } = tableContainer;
                const isScrollable = scrollHeight > clientHeight;
                const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

                // Remove scroll hint when scrolling or at bottom
                const scrollHint = tableContainer.querySelector('.scroll-hint');
                if (scrollHint && (scrollTop > 0 || isAtBottom)) {
                    scrollHint.remove();
                }

                if (isScrollable && !isAtBottom) {
                    tableContainer.classList.add('scrollable');
                } else {
                    tableContainer.classList.remove('scrollable');
                }
            };

            // Initial setup
            const isScrollable = tableContainer.scrollHeight > tableContainer.clientHeight;
            const hasManyUsers = users && users.length > 5;

            tableContainer.classList.toggle('scrollable', isScrollable);

            // Add scroll hint if needed
            if (hasManyUsers && isScrollable && !tableContainer.querySelector('.scroll-hint')) {
                const scrollHint = document.createElement('div');
                scrollHint.className = 'scroll-hint';
                scrollHint.textContent = '↓ More users below ↓';
                tableContainer.appendChild(scrollHint);

                // Auto-remove hint after 5 seconds
                setTimeout(() => {
                    if (scrollHint.parentNode) {
                        scrollHint.remove();
                    }
                }, 5000);
            }

            tableContainer.addEventListener('scroll', handleScroll);

            // Check initially
            handleScroll();

            return () => {
                tableContainer.removeEventListener('scroll', handleScroll);
            };
        }
    }, [users]); // Re-run when users change

    if (loading) return <Loading fullScreen={true} />;

    if (error) return (
        <motion.div
            className="admin-dashboard"
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
            className="admin-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            {/* Floating Decorative Orbs */}
            <div className="floating-element floating-1"></div>
            <div className="floating-element floating-2"></div>
            <div className="floating-element floating-3"></div>

            <div className="dashboard-content">
                <motion.div
                    className="dashboard-header"
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                >
                    <motion.h1
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <motion.span
                            className="dashboard-icon"
                            animate={{
                                rotateY: [0, 360],
                                scale: [1, 1.1, 1]
                            }}
                            transition={{
                                rotateY: { duration: 3, repeat: Infinity },
                                scale: { duration: 2, repeat: Infinity }
                            }}
                        >
                            📊
                        </motion.span>
                        Admin Dashboard
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="dashboard-subtitle"
                    >
                        Manage users and view platform statistics.
                    </motion.p>
                </motion.div>

                <motion.div
                    className="stats"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    <motion.div
                        className="stat-card users-card"
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        whileHover={{
                            y: -10,
                            scale: 1.05,
                            rotateY: 5,
                            boxShadow: "0 20px 50px rgba(99, 102, 241, 0.3)"
                        }}
                    >
                        <motion.div
                            className="stat-icon"
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                repeatType: "reverse"
                            }}
                        >
                            👥
                        </motion.div>
                        <h3>Total Users</h3>
                        <motion.p
                            className="stat-number"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.7, type: "spring" }}
                        >
                            {stats.total}
                        </motion.p>
                        <div className="stat-bg-effect"></div>
                    </motion.div>

                    <motion.div
                        className="stat-card premium-card"
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.55 }}
                        whileHover={{
                            y: -10,
                            scale: 1.05,
                            rotateY: 5,
                            boxShadow: "0 20px 50px rgba(251, 191, 36, 0.3)"
                        }}
                    >
                        <motion.div
                            className="stat-icon"
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                repeatType: "reverse",
                                delay: 0.5
                            }}
                        >
                            👑
                        </motion.div>
                        <h3>Premium Users</h3>
                        <motion.p
                            className="stat-number"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.75, type: "spring" }}
                        >
                            {stats.premium}
                        </motion.p>
                        <div className="stat-bg-effect"></div>
                    </motion.div>

                    <motion.div
                        className="stat-card quizzes-card"
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        whileHover={{
                            y: -10,
                            scale: 1.05,
                            rotateY: -5,
                            boxShadow: "0 20px 50px rgba(168, 85, 247, 0.3)"
                        }}
                    >
                        <motion.div
                            className="stat-icon"
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, -5, 5, 0]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                repeatType: "reverse",
                                delay: 1
                            }}
                        >
                            🎯
                        </motion.div>
                        <h3>Total Quizzes</h3>
                        <motion.p
                            className="stat-number"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.8, type: "spring" }}
                        >
                            {quizs.length}
                        </motion.p>
                        <div className="stat-bg-effect"></div>
                    </motion.div>

                    <motion.div
                        className="stat-card admin-card"
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.65 }}
                        whileHover={{
                            y: -10,
                            scale: 1.05,
                            rotateY: -5,
                            boxShadow: "0 20px 50px rgba(239, 68, 68, 0.3)"
                        }}
                    >
                        <motion.div
                            className="stat-icon"
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, -5, 5, 0]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                repeatType: "reverse",
                                delay: 1.5
                            }}
                        >
                            🛡️
                        </motion.div>
                        <h3>Admin Users</h3>
                        <motion.p
                            className="stat-number"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.85, type: "spring" }}
                        >
                            {stats.admin}
                        </motion.p>
                        <div className="stat-bg-effect"></div>
                    </motion.div>
                </motion.div>

                {/* Migration Panel */}
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                >
                    <MigrationPanel />
                </motion.div>

                <motion.div
                    className="users-section"
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.5 }}
                >
                    <div className="users-section-header">
                        <motion.h2
                            className="table-title"
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.7 }}
                        >
                            <motion.span
                                animate={{
                                    scale: [1, 1.2, 1],
                                    rotateZ: [0, 10, -10, 0]
                                }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity
                                }}
                            >
                                👥
                            </motion.span>
                            Registered Users
                        </motion.h2>
                        <motion.button
                            className="export-btn"
                            onClick={handleExportCSV}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            📥 Export CSV
                        </motion.button>
                    </div>

                    {/* Search and Filter Controls */}
                    <motion.div
                        className="admin-controls"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                    >
                        <div className="admin-search-wrapper">
                            <input
                                type="text"
                                className="admin-search-input"
                                placeholder="Search users by name, email, or role..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-label="Search users"
                            />
                            {searchQuery && (
                                <button
                                    className="admin-search-clear"
                                    onClick={() => setSearchQuery("")}
                                    aria-label="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div className="admin-filters">
                            <CustomDropdown
                                value={roleFilter}
                                onChange={(e) => {
                                    // CustomDropdown passes { target: { value } } object
                                    const value = e?.target?.value || e || 'all';
                                    const normalizedValue = typeof value === 'string' ? value.toLowerCase() : 'all';
                                    setRoleFilter(normalizedValue);
                                }}
                                options={[
                                    { value: "all", label: "All Roles" },
                                    ...uniqueRoles.map(role => ({
                                        value: role.toLowerCase(),
                                        label: role
                                    }))
                                ]}
                                placeholder="Filter by Role"
                                ariaLabel="Filter users by role"
                            />

                            <CustomDropdown
                                value={sortBy}
                                onChange={setSortBy}
                                options={[
                                    { value: "name", label: "Sort by Name" },
                                    { value: "email", label: "Sort by Email" },
                                    { value: "role", label: "Sort by Role" }
                                ]}
                                placeholder="Sort by"
                                ariaLabel="Sort users"
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
                    {filteredAndSortedUsers.length !== users.length && (
                        <motion.div
                            className="results-info"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <span className="results-highlight">
                                Showing {filteredAndSortedUsers.length} of {users.length} users
                            </span>
                            {(searchQuery || roleFilter !== "all") && (
                                <button
                                    className="results-clear-filters"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setRoleFilter("all");
                                    }}
                                >
                                    Clear filters
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* Empty State */}
                    {filteredAndSortedUsers.length === 0 && (
                        <motion.div
                            className="admin-empty-state"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <motion.span
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
                                🔍
                            </motion.span>
                            <p>
                                {searchQuery || roleFilter !== "all"
                                    ? "No users found matching your filters."
                                    : "No users found."}
                            </p>
                            {(searchQuery || roleFilter !== "all") && (
                                <button
                                    className="empty-clear-filters"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setRoleFilter("all");
                                    }}
                                >
                                    Clear filters
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* Users Table */}
                    {filteredAndSortedUsers.length > 0 && (
                        <motion.div
                            className={`table-container ${paginatedUsers.length > 5 ? 'has-many-users' : ''}`}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.9 }}
                            whileHover={{
                                boxShadow: "0 25px 70px rgba(99, 102, 241, 0.15)"
                            }}
                        >
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedUsers.map((user, index) => (
                                        <tr
                                            key={user._id}
                                            className={(user.role || '').toLowerCase() === 'premium' ? 'premium-user' : ''}
                                            style={{
                                                animation: `fadeInRow 0.4s ease-out ${0.9 + (index * 0.05)}s both`
                                            }}
                                        >
                                            <td className="user-name-cell">{user.name || 'Unknown'}</td>
                                            <td className="user-email-cell">{user.email || 'No email'}</td>
                                            <td className="user-role-cell">
                                            <span className={`role-badge ${(user.role || 'user').toLowerCase()}`}>
                                                {(user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1).toLowerCase()}
                                            </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </motion.div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <motion.div
                            className="admin-pagination"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 1 }}
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
                            transition={{ duration: 0.3, delay: 1.1 }}
                        >
                            Page {currentPage} of {totalPages} • Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedUsers.length)} of {filteredAndSortedUsers.length} users
                        </motion.div>
                    )}
                </motion.div>
            </div>

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

export default AdminDashboard;
