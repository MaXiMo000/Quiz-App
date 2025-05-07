import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import "../App.css";
import axios from "../utils/axios";
import ThemeSelector from "../components/ThemeSelector";
import { ThemeContext } from "../context/ThemeContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Home = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [badges, setBadges] = useState([]);
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchUserData = async () => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (!storedUser) {
        navigate("/login");
        } else {
        setUser(storedUser);
        }
        try {
        const res = await axios.get(`${BACKEND_URL}/api/users/${storedUser._id}`);
        const data = res.data;
        setBadges(data.badges || []);
        setXp(data.xp || 0);
        setLevel(data.level || 1);
        } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Error fetching user data. Try again later.");
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, [navigate]);

    const XPBar = ({ xp, level }) => {
        const xpForNext = level * 100;
        const percent = Math.min(100, Math.round((xp / xpForNext) * 100));
        return (
        <div className="xp-bar-container">
            <div className="xp-bar-fill" style={{ width: `${percent}%` }} />
            <span className="xp-label">Level {level}: {xp}/{xpForNext} XP</span>
        </div>
        );
    };

    if (loading) return <p>Loading Quiz...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="home-container">
        <h1>Welcome, {user?.name}!</h1>
        <XPBar xp={xp} level={level} />
        <p>Level: {level}</p>
        <p>Login Streak: {user.loginStreak} days</p>
        <p>Quiz Streak: {user.quizStreak} days</p>

        {/* Theme selection button */}
        <ThemeSelector />

        <p>Ready to take a quiz?</p>
        <button className="start-quiz-btn" onClick={() => navigate("/user/test")}>
            Start Quiz
        </button>
        <div className="badge-list">
            <h3>Your Badges:</h3>
            <ul>
            {badges.map((badge, i) => (
                <li key={i} className="badge-item">🏅 {badge}</li>
            ))}
            </ul>
        </div>
        <button onClick={fetchUserData} className="start-quiz-btn" >Refresh Stats</button>
        </div>
    );
};

export default Home;