// src/components/XPLeaderboard.jsx
import React, { useEffect, useState } from "react";
import axios from "../utils/axios";
import "./Leaderboard.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const XPLeaderboard = () => {
    const [period, setPeriod] = useState("weekly");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchXPLeaderboard();
    }, [period]);

    const fetchXPLeaderboard = async () => {
        setLoading(true);
        setError("");
        try {
        const response = await axios.get(`${BACKEND_URL}/api/leaderboard/${period}`);
        setData(response.data || []);
        } catch (err) {
        console.error("Error fetching XP leaderboard:", err);
        setError("Error fetching leaderboard data.");
        } finally {
        setLoading(false);
        }
    };

    if (loading) return <p>Loading ...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="leaderboard-container">
        <h2>🔥 XP Leaderboard ({period === "weekly" ? "Weekly" : "Monthly"})</h2>

        <div className="leaderboard-buttons">
            <button onClick={() => setPeriod("weekly")} className={period === "week" ? "active" : ""}>Weekly</button>
            <button onClick={() => setPeriod("monthly")} className={period === "month" ? "active" : ""}>Monthly</button>
        </div>

        {data.length > 0 ? (
            <div className="leaderboard-table">
            <table>
                <thead>
                <tr>
                    <th>Rank</th>
                    <th>Username</th>
                    <th>Total XP</th>
                </tr>
                </thead>
                <tbody>
                {data.map((user, index) => (
                    <tr key={index}>
                    <td>#{index + 1}</td>
                    <td>{user.username}</td>
                    <td>{user.xp}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        ) : (
            <p>No XP data available.</p>
        )}
        </div>
    );
};

export default XPLeaderboard;