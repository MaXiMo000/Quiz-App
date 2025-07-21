import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios"; // Make sure this uses the backend base URL
import "./Sidebar.css";

const Sidebar = () => {
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();

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
        if (window.innerWidth <= 768) {
            setIsSidebarOpen(false);
        }
    };

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
                alert("Role updated successfully");
            }
        } catch (error) {
            console.error("Failed to update role:", error);
            alert("❌ Failed to update role.");
        }
    };

    return (
        <>
            <motion.button 
                className="sidebar-toggle" 
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
            >
                ☰
            </motion.button>

            <AnimatePresence>
                <aside 
                    className={`sidebar ${isSidebarOpen ? "open" : ""}`}
                >
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                    >
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
                                    transition={{ delay: 0.7, duration: 0.4 }}
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
                                    transition={{ delay: 0.9, duration: 0.4 }}
                                >
                                    <Link to="/leaderboard" onClick={handleLinkClick}>🏆 LeaderBoard</Link>
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
                                    transition={{ delay: 0.7, duration: 0.4 }}
                                >
                                    <Link to="/premium/quizzes" onClick={handleLinkClick}>🧠 My Quizzes</Link>
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
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.1, duration: 0.4 }}
                                >
                                    <Link to="/contact" onClick={handleLinkClick}>📄 Contact Me</Link>
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
                                <motion.button 
                                    onClick={() => updateRole("premium")}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.1, duration: 0.4 }}
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
                        transition={{ delay: 1.3, duration: 0.5 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Logout
                    </motion.button>
                </aside>
            </AnimatePresence>
        </>
    );
};

export default Sidebar;