import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios"; // Make sure this uses the backend base URL
import "./Sidebar.css";
import NotificationModal from "./NotificationModal";
import { useNotification } from "../hooks/useNotification";
import useResponsive from "../hooks/useResponsive";
import useTouchHandler from "../hooks/useTouchHandler";

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

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
            setUser(storedUser);
        }
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
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
                {/* Mobile overlay */}
                {((isMobile || breakpoints.mobile) ? isOpen : isSidebarOpen) && (isMobile || breakpoints.mobile) && (
                    <motion.div
                        className="sidebar-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            setIsSidebarOpen(false);
                            if (onClose) onClose();
                        }}
                        transition={{ duration: 0.3 }}
                    />
                )}
                
                <aside 
                    className={`sidebar ${((isMobile || breakpoints.mobile) ? isOpen : isSidebarOpen) ? "open" : ""} ${sidebarSlide ? "slide-left" : ""}`}
                    {...(isMobile ? swipeHandlers : {})}
                >
                    <motion.div
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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                    >
                        {user?.role === "admin" && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6, duration: 0.4 }}
                                >
                                    <Link to="/admin" onClick={handleLinkClick}>📊 Dashboard</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.75, duration: 0.4 }}
                                >
                                    <Link to="/admin/create" onClick={handleLinkClick}>📚 Create Quiz</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.8, duration: 0.4 }}
                                >
                                    <Link to="/admin/report" onClick={handleLinkClick}>📄 Reports</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.85, duration: 0.4 }}
                                >
                                    <Link to="/leaderboard" onClick={handleLinkClick}>🏆 LeaderBoard</Link>
                                </motion.div>
                                
                                {/* Phase 3: Social & Gamification Links */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.9, duration: 0.4 }}
                                >
                                    <Link to="/friends" onClick={handleLinkClick}>🤝 Friends</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.95, duration: 0.4 }}
                                >
                                    <Link to="/study-groups" onClick={handleLinkClick}>📚 Study Groups</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.0, duration: 0.4 }}
                                >
                                    <Link to="/gamification" onClick={handleLinkClick}>🎮 Challenges & Tournaments</Link>
                                </motion.div>
                                {/* <Link to="/admin/written-tests" onClick={handleLinkClick}>📝 Written Tests</Link>
                                <Link to="/admin/written-test/report" onClick={handleLinkClick}>📄 Tests Reports</Link> */}
                            </>
                        )}

                        {user?.role === "premium" && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6, duration: 0.4 }}
                                >
                                    <Link to="/" onClick={handleLinkClick}>📊 Dashboard</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.65, duration: 0.4 }}
                                >
                                    <Link to="/enhanced-dashboard" className="premium-dashboard" onClick={handleLinkClick}>📈 Premium Dashboard</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.67, duration: 0.4 }}
                                >
                                    <Link to="/intelligence-dashboard" className="premium-dashboard intelligence-link" onClick={handleLinkClick}>🧠 Intelligence Dashboard</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.7, duration: 0.4 }}
                                >
                                    <Link to="/premium/quizzes" className="premium-dashboard" onClick={handleLinkClick}>🧠 My Quizzes</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.75, duration: 0.4 }}
                                >
                                    <Link to="/achievements" onClick={handleLinkClick}>🏆 Achievements</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.8, duration: 0.4 }}
                                >
                                    <Link to="/user/test" onClick={handleLinkClick}>📚 Quizzes</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.9, duration: 0.4 }}
                                >
                                    <Link to="/user/report" onClick={handleLinkClick}>📄 Reports</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.0, duration: 0.4 }}
                                >
                                    <Link to="/leaderboard" onClick={handleLinkClick}>🏆 LeaderBoard</Link>
                                </motion.div>
                                
                                {/* Phase 3: Social & Gamification Links */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.05, duration: 0.4 }}
                                >
                                    <Link to="/friends" onClick={handleLinkClick}>🤝 Friends</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.1, duration: 0.4 }}
                                >
                                    <Link to="/study-groups" onClick={handleLinkClick}>📚 Study Groups</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.15, duration: 0.4 }}
                                >
                                    <Link to="/gamification" onClick={handleLinkClick}>🎮 Challenges & Tournaments</Link>
                                </motion.div>
                                
                                {/* Phase 4: Next-Gen Features */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.2, duration: 0.4 }}
                                >
                                    <Link to="/ai-study-buddy" onClick={handleLinkClick}>🤖 AI Study Buddy</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.25, duration: 0.4 }}
                                >
                                    <Link to="/real-time-quiz" onClick={handleLinkClick}>⚡ Real-Time Quiz</Link>
                                </motion.div>
                                
                                {/* Phase 5: Advanced Learning Path Engine */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.3, duration: 0.4 }}
                                >
                                    <Link to="/learning-paths" onClick={handleLinkClick}>🎯 Learning Paths</Link>
                                </motion.div>
                                
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.35, duration: 0.4 }}
                                >
                                    <Link to="/contact" onClick={handleLinkClick}>📄 Contact Me</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.62, duration: 0.4 }}
                                >
                                    <Link to="/test-features" onClick={handleLinkClick}>🧪 Test New Features</Link>
                                </motion.div>
                                <motion.button 
                                    onClick={() => updateRole("user")}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.2, duration: 0.4 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    👤 Go Simple User
                                </motion.button>
                            </>
                        )}

                        {user?.role === "user" && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6, duration: 0.4 }}
                                >
                                    <Link to="/" onClick={handleLinkClick}>📊 Dashboard</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.7, duration: 0.4 }}
                                >
                                    <Link to="/user/test" onClick={handleLinkClick}>📚 Quizzes</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.75, duration: 0.4 }}
                                >
                                    <Link to="/achievements" onClick={handleLinkClick}>🏆 Achievements</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.8, duration: 0.4 }}
                                >
                                    <Link to="/user/report" onClick={handleLinkClick}>📄 Reports</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.9, duration: 0.4 }}
                                >
                                    <Link to="/analytics" onClick={handleLinkClick}>📝 User Analytics</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.0, duration: 0.4 }}
                                >
                                    <Link to="/xp-leaderboard" onClick={handleLinkClick}>🏆 XP LeaderBoard</Link>
                                </motion.div>
                                
                                {/* Phase 3: Social & Gamification Links */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.05, duration: 0.4 }}
                                >
                                    <Link to="/friends" onClick={handleLinkClick}>🤝 Friends</Link>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.15, duration: 0.4 }}
                                >
                                    <Link to="/gamification" onClick={handleLinkClick}>🎮 Challenges & Tournaments</Link>
                                </motion.div>
                                
                                <motion.button 
                                    onClick={() => updateRole("premium")}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.2, duration: 0.4 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    🚀 Go Premium
                                </motion.button>
                            </>
                        )}
                    </motion.nav>

                    <motion.button 
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