import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Leaderboard.css"; // ✅ Create a new CSS file for styling

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Leaderboard = () => {
    const [topScorers, setTopScorers] = useState([]);
    const [period, setPeriod] = useState("week"); // Default: Weekly leaderboard

    useEffect(() => {
        fetchTopScorers();
    }, [period]);

    const fetchTopScorers = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/api/reports/top-scorers?period=${period}`);
            setTopScorers(response.data);
        } catch (error) {
            console.error("Error fetching top scorers:", error.response ? error.response.data : error.message);
        }
    };

    return (
        <div className="leaderboard-container">
            <h2>🏆 Top Scorers of the {period === "week" ? "Week" : "Month"}</h2>
            
            <div className="leaderboard-buttons">
                <button onClick={() => setPeriod("week")} className={period === "week" ? "active" : ""}>Weekly</button>
                <button onClick={() => setPeriod("month")} className={period === "month" ? "active" : ""}>Monthly</button>
            </div>

            <table className="leaderboard-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Username</th>
                        <th>Quiz Name</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody>
                    {topScorers.length > 0 ? (
                        topScorers.map((user, index) => (
                            <tr key={index}>
                                <td>#{index + 1}</td>
                                <td>{user.username}</td>
                                <td>{user.quizName}</td>
                                <td>{user.score.toFixed(1)}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4">No top scorers yet.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Leaderboard;