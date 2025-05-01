import React, { useEffect, useState } from "react";
import axios from "../utils/axios";
import "./Leaderboard.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Leaderboard = () => {
    const [topScorers, setTopScorers] = useState([]);
    const [filteredQuiz, setFilteredQuiz] = useState("All");
    const [period, setPeriod] = useState("week");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchTopScorers();
    }, [period]);

    const fetchTopScorers = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await axios.get(`${BACKEND_URL}/api/reports/top-scorers?period=${period}`);
            const data = Array.isArray(response.data) ? response.data : [];
            setTopScorers(data);
            setFilteredQuiz("All"); // Reset filter on period change
        } catch (error) {
            console.error("Error fetching top scorers:", error.response ? error.response.data : error.message);
            setError("Error fetching data. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const quizzes = topScorers.map(item => item.quizName);
    const displayedScorers = filteredQuiz === "All"
        ? topScorers
        : topScorers.filter(item => item.quizName === filteredQuiz);

    if (loading) return <p>Loading ...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="leaderboard-container">
            <h2>🏆 Top Scorers of the {period === "week" ? "Week" : "Month"}</h2>

            <div className="leaderboard-controls">
                <div className="leaderboard-buttons">
                    <button onClick={() => setPeriod("week")} className={period === "week" ? "active" : ""}>Weekly</button>
                    <button onClick={() => setPeriod("month")} className={period === "month" ? "active" : ""}>Monthly</button>
                </div>

                <select onChange={e => setFilteredQuiz(e.target.value)} value={filteredQuiz}>
                    <option value="All">All Quizzes</option>
                    {quizzes.map((quiz, idx) => (
                        <option key={idx} value={quiz}>{quiz}</option>
                    ))}
                </select>
            </div>

            {displayedScorers.length > 0 ? (
                displayedScorers.map((category, catIndex) => (
                    <div key={catIndex} className="quiz-section">
                        <h3>📘 {category.quizName}</h3>
                        <div className="leaderboard-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Username</th>
                                        <th>Score</th>
                                        <th>Total</th> {/* Added column for Total */}
                                    </tr>
                                </thead>
                                <tbody>
                                    {category.topUsers.map((user, index) => (
                                        <tr key={index}>
                                            <td>#{index + 1}</td>
                                            <td>{user.username}</td>
                                            <td>{user.score.toFixed(1)}</td>
                                            <td>{user.total}</td> {/* Display total score */}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            ) : (
                <p>No top scorers available.</p>
            )}
        </div>
    );
};

export default Leaderboard;