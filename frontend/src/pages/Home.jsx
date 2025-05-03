import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import "../App.css";
import axios from "../utils/axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Home = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [badges, setBadges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (!storedUser) {
        navigate("/register");
        } else {
        setUser(storedUser);
        const fetchBadge = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/users/${storedUser._id}`);
                setBadges(res.data.badges || [])
            } catch (error) {
                console.error("Error fetching Badges:", error);
                setError("Error fetching Badges. Try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchBadge();
        }
    }, [navigate]);

    if (loading) return <p>Loading Quiz...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="home-container">
        <h1>Welcome, {user?.name}!</h1>
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
        </div>
    );
};

export default Home;
