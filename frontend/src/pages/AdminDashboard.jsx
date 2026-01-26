import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import "../App.css";
import "./AdminDashboard.css";
import Spinner from "../components/Spinner";
import MigrationPanel from "../components/MigrationPanel";
import Loading from "../components/Loading";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [quizs, setQuizs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Notification system
    const { notification, showError, hideNotification } = useNotification();

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            // Clear any active states if needed
        },
    }, []);

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
                            {users.length}
                        </motion.p>
                        <div className="stat-bg-effect"></div>
                    </motion.div>

                    <motion.div
                        className="stat-card quizzes-card"
                        initial={{ x: 100, opacity: 0 }}
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

                    <motion.div
                        className={`table-container ${users.length > 5 ? 'has-many-users' : ''}`}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
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
                                {users.map((user, index) => (
                                    <tr
                                        key={user._id}
                                        className={user.role === 'PREMIUM' ? 'premium-user' : ''}
                                        style={{
                                            animation: `fadeInRow 0.4s ease-out ${0.9 + (index * 0.05)}s both`
                                        }}
                                    >
                                        <td className="user-name-cell">{user.name || 'Unknown'}</td>
                                        <td className="user-email-cell">{user.email || 'No email'}</td>
                                        <td className="user-role-cell">
                                            <span className={`role-badge ${(user.role || 'user').toLowerCase()}`}>
                                                {user.role || 'USER'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
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
