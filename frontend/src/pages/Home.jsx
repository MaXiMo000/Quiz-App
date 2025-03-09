import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import "../app.css";

const Home = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (!storedUser) {
        navigate("/register");
        } else {
        setUser(storedUser);
        }
    }, [navigate]);

    return (
        <div className="home-container">
        <h1>Welcome, {user?.name}!</h1>
        <p>Ready to take a quiz?</p>
        <button className="start-quiz-btn" onClick={() => navigate("/user/test")}>
            Start Quiz
        </button>
        </div>
    );
};

export default Home;
