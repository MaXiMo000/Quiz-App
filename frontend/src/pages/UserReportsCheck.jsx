import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; 
import axios from "axios";
import "../App.css";
import "./UserReportsCheck.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const UserReportsCheck = () => {
    const { id } = useParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
            setError("User not found. Please log in.");
            setLoading(false);
            return;
        }

        axios.get(`${BACKEND_URL}/api/reports/${id}`)
            .then(res => setReport(res.data))
            .catch(() => setError("Error fetching report. Try again later."))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <p>Loading report...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="report-container main-content">
            <h2>📄 Quiz Report: {report.quizName}</h2>
            <p className="score">Score: <strong>{report.score}</strong> / {report.total}</p>

            <div className="question-list">
                {report.questions.length > 0 ? (
                    report.questions.map((q, index) => (
                        <div key={index} className={`question-box ${q.userAnswer === q.correctAnswer ? "correct" : "wrong"}`}>
                            <h3>Q{index + 1}: {q.questionText}</h3>
                            <p><strong>Your Answer:</strong> <span className="user-answer">{q.userAnswer}</span></p>
                            <p><strong>Correct Answer:</strong> <span className="correct-answer">{q.correctAnswer}</span></p>
                        </div>
                    ))
                ) : (
                    <p>No questions in the report.</p>
                )}
            </div>
        </div>
    );
};

export default UserReportsCheck;