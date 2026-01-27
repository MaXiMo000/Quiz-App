import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios"; // Make sure this uses the backend base URL
import "./Sidebar.css";
import NotificationModal from "./NotificationModal";
import { useNotification } from "../hooks/useNotification";
import useResponsive from "../hooks/useResponsive";
import useTouchHandler from "../hooks/useTouchHandler";
import NavModule from "./NavModule";

const Sidebar = ({ isOpen = false, onClose }) => {
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [closeBtnSlide, setCloseBtnSlide] = useState(false);
    const [sidebarSlide, setSidebarSlide] = useState(false);
    const navigate = useNavigate();

    // Enhanced mobile responsiveness
    const { isMobile, breakpoints } = useResponsive();
    const { handleSwipe, vibrate, isTouchDevice } = useTouchHandler();

    // Notification system
    const { notification, showSuccess, showError, hideNotification } = useNotification();

    // Stable click outside handler
    const handleClickOutside = useCallback((event) => {
        if (isMobile && isOpen) {
            const sidebar = document.querySelector('.sidebar');

            if (sidebar && !sidebar.contains(event.target)) {
                setIsSidebarOpen(false);
                setCloseBtnSlide(false);
                setSidebarSlide(false);
                if (onClose) onClose();
            }
        }
    }, [isMobile, isOpen, onClose]);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
            setUser(storedUser);
        }
    }, []);

    // Handle click outside to close sidebar on mobile
    useEffect(() => {
        if (isMobile && isOpen) {
            // Add a small delay to prevent immediate closing
            const timeoutId = setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
                document.addEventListener('touchstart', handleClickOutside);
            }, 100);

            return () => {
                clearTimeout(timeoutId);
                // Remove listeners using the stable callback reference
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('touchstart', handleClickOutside);
            };
        }
    }, [isMobile, isOpen, handleClickOutside]);

    // Toggle body class when sidebar opens/closes on mobile
    useEffect(() => {
        if (isMobile) {
            if (isOpen) {
                document.body.classList.add('sidebar-open');
            } else {
                document.body.classList.remove('sidebar-open');
            }

            // Cleanup on unmount
            return () => {
                document.body.classList.remove('sidebar-open');
            };
        }
    }, [isMobile, isOpen]);

    const handleLogout = async () => {
        try {
            // Call logout endpoint to update online status
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    await axios.post("/api/users/logout", {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch (error) {
                    // Log error but continue with logout even if API call fails
                    console.error("Logout API call failed:", error);
                }
            }
        } catch (error) {
            console.error("Error during logout:", error);
        } finally {
            // Always clear localStorage and navigate, even if API call fails
            localStorage.clear();
            navigate("/login");
        }
    };

    const handleLinkClick = () => {
        // Enhanced mobile link handling with haptic feedback
        if (isMobile || breakpoints.mobile || window.innerWidth <= 768) {
            setIsSidebarOpen(false);
            setCloseBtnSlide(false);
            setSidebarSlide(false);
            if (onClose) onClose(); // Close via parent component on mobile
            if (isTouchDevice) {
                vibrate([10]); // Light vibration
            }
        }
    };

    // Enhanced sidebar toggle with haptic feedback
    const toggleSidebar = () => {
        setIsSidebarOpen((prev) => !prev);
        if (isTouchDevice) {
            vibrate([5]); // Light vibration
        }
    };

    // Swipe gestures for mobile
    const swipeHandlers = handleSwipe(
        () => {
            setIsSidebarOpen(false);
            if (onClose) onClose();
        }, // Swipe left to close
        () => {
            setIsSidebarOpen(true);
        },  // Swipe right to open (but controlled by parent)
        null, // No up swipe
        null  // No down swipe
    );

    // Update role function
    const updateRole = async (newRole) => {
        if (!user) return;
        try {
            const response = await axios.patch(`/api/users/update-role`, {
                userId: user._id,
                role: newRole,
            });
            if (response.status === 200) {
                const updatedUser = response.data.user;
                const newToken = response.data.token;

                localStorage.setItem("token", newToken); // ✅ Replace old token
                localStorage.setItem("user", JSON.stringify(updatedUser));
                setUser(updatedUser);
                showSuccess("Role updated successfully");
            }
        } catch (error) {
            console.error("Failed to update role:", error);
            showError("❌ Failed to update role.");
        }
    };

    return (
        <>
            <motion.button
                key="sidebar-toggle"
                className="sidebar-toggle"
                onClick={toggleSidebar}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
                {...(isMobile ? swipeHandlers : {})}
            >
                ☰
            </motion.button>

            <AnimatePresence>
                {/* Mobile overlay - Show when sidebar is open on mobile */}
                {isMobile && isOpen && (
                    <motion.div
                        key="sidebar-overlay"
                        className="sidebar-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsSidebarOpen(false);
                            setCloseBtnSlide(false);
                            setSidebarSlide(false);
                            if (onClose) onClose();
                        }}
                        transition={{ duration: 0.3 }}
                    />
                )}

                <aside
                    className={`sidebar ${((isMobile || breakpoints.mobile) ? isOpen : isSidebarOpen) ? "open" : ""} ${sidebarSlide ? "slide-left" : ""}`}
                    {...(isMobile ? swipeHandlers : {})}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent closing when clicking inside sidebar
                    }}
                >
                    <motion.div
                        key="sidebar-header"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                    >
                                                {/* Mobile close button */}
                        {(isMobile || breakpoints.mobile) && (
                            <button
                                className={`close-btn-sidebar${closeBtnSlide ? " slide-left" : ""}`}
                                aria-label="Close sidebar"
                                onClick={() => {
                                    setCloseBtnSlide(true);
                                    setTimeout(() => {
                                        setSidebarSlide(true);
                                        setTimeout(() => {
                                            setIsSidebarOpen(false);
                                            setCloseBtnSlide(false);
                                            setSidebarSlide(false);
                                            if (onClose) onClose();
                                        }, 350);
                                    }, 300);
                                }}
                            >
                                <span>Go Back</span>
                            </button>
                        )}

                        <Link to={user?.role === "admin" ? "/admin" : "/"} id="title">
                            <h2>QuizNest</h2>
                        </Link>
                    </motion.div>

                    <motion.nav
                        key="sidebar-nav"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                    >
                        {user?.role === "admin" && (
                            <>
                                {/* 1. Admin Module */}
                                <NavModule title="Admin" icon="⚙️" defaultExpanded={true} delay={0.6}>
                                    <Link to="/admin" onClick={handleLinkClick}>📊 Dashboard</Link>
                                    <Link to="/admin/create" onClick={handleLinkClick}>📚 Create Quiz</Link>
                                    <Link to="/admin/report" onClick={handleLinkClick}>📄 Reports</Link>
                                </NavModule>

                                {/* 2. Learning Module */}
                                <NavModule title="Learning" icon="📚" defaultExpanded={true} delay={0.7}>
                                    <Link to="/leaderboard" onClick={handleLinkClick}>🏆 LeaderBoard</Link>
                                </NavModule>

                                {/* 3. Social Module */}
                                <NavModule title="Social" icon="🤝" defaultExpanded={false} delay={0.8}>
                                    <Link to="/friends" onClick={handleLinkClick}>🤝 Friends</Link>
                                    <Link to="/study-groups" onClick={handleLinkClick}>📚 Study Groups</Link>
                                    <Link to="/study-streak" onClick={handleLinkClick}>🔥 Study Streak</Link>
                                    <Link to="/gamification" onClick={handleLinkClick}>🎮 Challenges & Tournaments</Link>
                                </NavModule>
                            </>
                        )}

                        {user?.role === "premium" && (
                            <>
                                {/* 1. Personal / Account Module */}
                                <NavModule title="Personal" icon="👤" defaultExpanded={true} delay={0.6}>
                                    <Link to="/" onClick={handleLinkClick}>📊 Dashboard</Link>
                                    <Link to="/enhanced-dashboard" onClick={handleLinkClick}>📈 Premium Dashboard</Link>
                                    <Link to="/intelligence-dashboard" onClick={handleLinkClick}>🧠 Intelligence Dashboard</Link>
                                </NavModule>

                                {/* 2. Learning Module */}
                                <NavModule title="Learning" icon="📚" defaultExpanded={true} delay={0.7}>
                                    <Link to="/user/test" onClick={handleLinkClick}>📚 Take Quizzes</Link>
                                    <Link to="/premium/quizzes" onClick={handleLinkClick}>➕ Add Quizzes</Link>
                                    <Link to="/user/report" onClick={handleLinkClick}>📄 Reports</Link>
                                    <Link to="/achievements" onClick={handleLinkClick}>🏆 Achievements</Link>
                                    <Link to="/leaderboard" onClick={handleLinkClick}>🏆 LeaderBoard</Link>
                                    <Link to="/learning-paths" onClick={handleLinkClick}>🎯 Learning Paths</Link>
                                    <Link to="/reviews" onClick={handleLinkClick}>🔁 Reviews</Link>
                                    <Link to="/advanced-analytics" onClick={handleLinkClick}>📈 Advanced Analytics</Link>
                                </NavModule>

                                {/* 3. Social Module */}
                                <NavModule title="Social" icon="🤝" defaultExpanded={false} delay={0.8}>
                                    <Link to="/friends" onClick={handleLinkClick}>🤝 Friends</Link>
                                    <Link to="/study-groups" onClick={handleLinkClick}>📚 Study Groups</Link>
                                    <Link to="/study-streak" onClick={handleLinkClick}>🔥 Study Streak</Link>
                                    <Link to="/gamification" onClick={handleLinkClick}>🎮 Challenges & Tournaments</Link>
                                </NavModule>

                                {/* 4. AI Module */}
                                <NavModule title="AI Tools" icon="🤖" defaultExpanded={false} delay={0.9}>
                                    <Link to="/ai-study-buddy" onClick={handleLinkClick}>🤖 AI Study Buddy</Link>
                                    <Link to="/real-time-quiz" onClick={handleLinkClick}>⚡ Real-Time Quiz</Link>
                                </NavModule>

                                {/* 5. Support Module */}
                                <NavModule title="Support" icon="📄" defaultExpanded={false} delay={1.0}>
                                    <Link to="/contact" onClick={handleLinkClick}>📄 Contact Me</Link>
                                    <Link to="/test-features" onClick={handleLinkClick}>🧪 Test New Features</Link>
                                </NavModule>

                                <motion.button
                                    key="premium-go-simple-user"
                                    onClick={() => updateRole("user")}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.1, duration: 0.4 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="sidebar-role-switch-btn"
                                >
                                    👤 Go Simple User
                                </motion.button>
                            </>
                        )}

                        {user?.role === "user" && (
                            <>
                                {/* 1. Personal Module */}
                                <NavModule title="Personal" icon="👤" defaultExpanded={true} delay={0.6}>
                                    <Link to="/" onClick={handleLinkClick}>📊 Dashboard</Link>
                                </NavModule>

                                {/* 2. Learning Module */}
                                <NavModule title="Learning" icon="📚" defaultExpanded={true} delay={0.7}>
                                    <Link to="/user/test" onClick={handleLinkClick}>📚 Quizzes</Link>
                                    <Link to="/user/report" onClick={handleLinkClick}>📄 Reports</Link>
                                    <Link to="/achievements" onClick={handleLinkClick}>🏆 Achievements</Link>
                                    <Link to="/leaderboard" onClick={handleLinkClick}>🏆 LeaderBoard</Link>
                                    <Link to="/xp-leaderboard" onClick={handleLinkClick}>🏆 XP LeaderBoard</Link>
                                    <Link to="/analytics" onClick={handleLinkClick}>📝 User Analytics</Link>
                                </NavModule>

                                {/* 3. Social Module */}
                                <NavModule title="Social" icon="🤝" defaultExpanded={false} delay={0.8}>
                                    <Link to="/friends" onClick={handleLinkClick}>🤝 Friends</Link>
                                    <Link to="/study-groups" onClick={handleLinkClick}>📚 Study Groups</Link>
                                    <Link to="/study-streak" onClick={handleLinkClick}>🔥 Study Streak</Link>
                                    <Link to="/gamification" onClick={handleLinkClick}>🎮 Challenges & Tournaments</Link>
                                </NavModule>

                                {/* 4. Support Module */}
                                <NavModule title="Support" icon="📄" defaultExpanded={false} delay={0.9}>
                                    <Link to="/help-guide" onClick={handleLinkClick}>📚 Help Guide</Link>
                                </NavModule>

                                <motion.button
                                    key="user-go-premium"
                                    onClick={() => updateRole("premium")}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.0, duration: 0.4 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="sidebar-role-switch-btn"
                                >
                                    🚀 Go Premium
                                </motion.button>
                            </>
                        )}
                    </motion.nav>

                    <motion.button
                        key="logout-btn"
                        className="logout-btn"
                        onClick={handleLogout}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.4, duration: 0.5 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Logout
                    </motion.button>
                </aside>
            </AnimatePresence>

            {/* Notification Modal */}
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

export default Sidebar;
