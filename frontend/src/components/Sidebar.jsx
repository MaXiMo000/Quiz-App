import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../utils/axios"; // Make sure this uses the backend base URL
import "./Sidebar.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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
            const response = await axios.patch(`${BACKEND_URL}/api/users/update-role`, {
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
            <button className="sidebar-toggle" onClick={() => setIsSidebarOpen((prev) => !prev)}>
                ☰
            </button>

            <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
                <Link to={user?.role === "admin" ? "/admin" : "/"} id="title">
                    <h2>QuizNest</h2>
                </Link>

                <nav>
                    {user?.role === "admin" && (
                        <>
                            <Link to="/admin" onClick={handleLinkClick}>📊 Dashboard</Link>
                            <Link to="/admin/create" onClick={handleLinkClick}>📚 Create Quiz</Link>
                            <Link to="/admin/report" onClick={handleLinkClick}>📄 Reports</Link>
                            <Link to="/leaderboard" onClick={handleLinkClick}>🏆 LeaderBoard</Link>
                            {/* <Link to="/admin/written-tests" onClick={handleLinkClick}>📝 Written Tests</Link>
                            <Link to="/admin/written-test/report" onClick={handleLinkClick}>📄 Tests Reports</Link> */}
                        </>
                    )}

                    {user?.role === "premium" && (
                        <>
                            <Link to="/" onClick={handleLinkClick}>📊 Dashboard</Link>
                            <Link to="/premium/quizzes" onClick={handleLinkClick}>🧠 My Quizzes</Link>
                            <Link to="/user/test" onClick={handleLinkClick}>📚 Quizzes</Link>
                            <Link to="/user/report" onClick={handleLinkClick}>📄 Reports</Link>
                            {/* <Link to="/written-tests">📝 Written Tests</Link>
                            <Link to="/user/written-reports">📄 Tests Reports</Link> */}
                            <Link to="/leaderboard" onClick={handleLinkClick}>🏆 LeaderBoard</Link>
                            <Link to="/contact" onClick={handleLinkClick}>📄 Contact Me</Link>
                            <button onClick={() => updateRole("user")}>👤 Go Simple User</button>
                        </>
                    )}

                    {user?.role === "user" && (
                        <>
                            <Link to="/" onClick={handleLinkClick}>📊 Dashboard</Link>
                            <Link to="/user/test" onClick={handleLinkClick}>📚 Quizzes</Link>
                            <Link to="/user/report" onClick={handleLinkClick}>📄 Reports</Link>
                            <Link to="/analytics" onClick={handleLinkClick}>📝 User Analytics</Link>
                            <Link to="/xp-leaderboard" onClick={handleLinkClick}>🏆 XP LeaderBoard</Link>
                            {/* <Link to="/written-tests" onClick={handleLinkClick}>📝 Written Tests</Link> */}
                            {/* <Link to="/user/written-reports" onClick={handleLinkClick}>📄 Tests Reports</Link> */}
                            <button onClick={() => updateRole("premium")}>🚀 Go Premium</button>
                        </>
                    )}
                </nav>

                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </aside>
        </>
    );
};

export default Sidebar;