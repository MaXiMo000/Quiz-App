import { useEffect, useState } from "react";
import axios from "../utils/axios";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";
import "./UserAnalytics.css";

const UserAnalyticsDashboard = () => {
    const [questionStats, setQuestionStats] = useState([]);
    const [scoreTrends, setScoreTrends] = useState([]);
    const [topicHeatmap, setTopicHeatmap] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchAll = async () => {
        try {
            const [qRes, tRes, hRes] = await Promise.all([
            axios.get("/api/analytics/question-stats"),
            axios.get("/api/analytics/score-trends"),
            axios.get("/api/analytics/topic-heatmap")
            ]);
            setQuestionStats(
            qRes.data.map(q => ({
                question: q.question,
                correctPercent: q.correctPercent ?? 0,
                avgTime: q.avgTime ?? 0
            }))
            );
            setScoreTrends(tRes.data);
            setTopicHeatmap(hRes.data);
        } catch (err) {
            console.error(err);
            setError("Failed to load analytics. Please try again later.");
        } finally {
            setLoading(false);
        }
        };
        fetchAll();
    }, []);

    if (loading) return <p className="loading">Loading analytics...</p>;
    if (error) return <p className="error">{error}</p>;

    const scoreData = {
        labels: scoreTrends.map(item => item.date),
        datasets: [
        {
            label: "Avg Score",
            data: scoreTrends.map(item => item.avgScore),
            fill: false,
            tension: 0.1
        }
        ]
    };

    const topicData = {
        labels: topicHeatmap.map(item => item.tag),
        datasets: [
        {
            label: "Accuracy %",
            data: topicHeatmap.map(item => item.accuracy),
            backgroundColor: "#6a11cb"
        }
        ]
    };

    return (
        <div className="analytics-dashboard">
        <h1>Quiz Analytics</h1>

        <section className="chart-section">
            <h2>Score Trends</h2>
            <Line data={scoreData} />
        </section>

        <section className="chart-section">
            <h2>Topic Accuracy</h2>
            <Bar data={topicData} />
        </section>

        <section className="table-section">
            <h2>Question Stats</h2>
            <div className="table-container">
            <table>
                <thead>
                <tr>
                    <th>Question</th>
                    <th>Correct %</th>
                    <th>Avg Time (s)</th>
                </tr>
                </thead>
                <tbody>
                {questionStats.map((q, i) => (
                    <tr key={i}>
                    <td>{q.question}</td>
                    <td>{q.correctPercent.toFixed(1)}</td>
                    <td>{q.avgTime.toFixed(1)}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </section>
        </div>
    );
};

export default UserAnalyticsDashboard;