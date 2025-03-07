import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css"; // Import Sidebar styles

const Sidebar = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (!storedUser) {
        // navigate("/register");
        } else {
        setUser(storedUser);
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.clear();
        navigate("/register");
    };

    return (
        <div className="sidebar">
        <h2>Quiz App</h2>
        <nav>
            {user?.role === "admin" ? (
            <>
                <a href="/admin">📊 Dashboard</a>
                <a href="/admin/create">📚 Create Quiz</a>
                <a href="/admin/report">📄 Reports</a>
            </>
            ) : (
            <>
                <a href="/">📊 Dashboard</a>
                <a href="/user/test">📚 Quizzes</a>
                <a href="/user/report">📄 Reports</a>
            </>
            )}
        </nav>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
    );
};

export default Sidebar;
