import { useEffect, useState } from "react";
import { useNavigate , Link} from "react-router-dom";
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
        navigate("/login");
    };

    return (
        <div className="sidebar">
            {user?.role === "admin" ? (
                    <a href="/admin"><h2>QuizNest</h2></a>
                ) : (
                    <a href="/"><h2>QuizNest</h2></a>
                )}
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
