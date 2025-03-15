import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css"; // Import Sidebar styles

const Sidebar = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
            setUser(storedUser);
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <>
            {/* ✅ Toggle Button (☰) - Only visible on mobile */}
            <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                ☰
            </button>

            {/* ✅ Sidebar (Always visible on larger screens, toggled on mobile) */}
            <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
                {/* <button className="close-btn-sidebar" onClick={() => setIsSidebarOpen(false)}>✕</button> */}
                
                {user?.role === "admin" ? (
                    <a href="/admin" id="title"><h2>QuizNest</h2></a>
                ) : (
                    <a href="/" id="title"><h2>QuizNest</h2></a>
                )}
                
                <nav>
                    {user?.role === "admin" ? (
                        <>
                            <a href="/admin">📊 Dashboard</a>
                            <a href="/admin/create">📚 Create Quiz</a>
                            <a href="/admin/report">📄 Reports</a>
                            <a href="/admin/written-tests">📝 Written Tests</a>
                            <a href="/admin/written-test/report">📄Tests Reports</a>
                        </>
                    ) : (
                        <>
                            <a href="/">📊 Dashboard</a>
                            <a href="/user/test">📚 Quizzes</a>
                            <a href="/user/report">📄 Reports</a>
                            <a href="/written-tests">📝 Written Tests</a>
                            <a href="/user/written-reports">📄Tests Reports</a>
                            <a href="/leaderboard">📝 LeaderBoard</a>
                        </>
                    )}
                </nav>

                <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
        </>
    );
};

export default Sidebar;
