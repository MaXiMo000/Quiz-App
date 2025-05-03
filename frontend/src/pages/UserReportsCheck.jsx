// components/UserReportsCheck.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../utils/axios";
import "../App.css";
import "./UserReportsCheck.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function UserReportsCheck() {
    const { id } = useParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
        setLoading(false);
        return;
        }
        axios.get(`${BACKEND_URL}/api/reports/${id}`)
        .then(res => setReport(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <p>Loading report...</p>;
    if (!report) return <p className="error-message">Report not found</p>;

    return (
        <div className="report-container main-content">
        <h2>📄 Quiz Report: {report.quizName}</h2>
        <p className="score">Score: <strong>{report.score}</strong> / {report.total}</p>

        <div className="question-list">
            {report.questions.map((q, i) => (
            <div key={i} className={`question-box ${q.userAnswer===q.correctAnswer?"correct":"wrong"}`}>
                <h3>Q{i+1}: {q.questionText}</h3>

                <ul className="options-list">
                {q.options.map((opt, idx) => {
                    const letter = ["A","B","C","D"][idx];
                    const isUser    = letter === q.userAnswer;
                    const isCorrect = letter === q.correctAnswer;
                    return (
                    <li key={idx}
                        className={`${isCorrect?"correct-option":""} ${isUser?"your-option":""}`}>
                        <strong>{letter}.</strong> {opt}
                        {isCorrect && " ✅"}
                        {isUser && !isCorrect && " ✖️"}
                    </li>
                    );
                })}
                </ul>

                <p><strong>Your Answer:</strong> {q.userAnswerText}</p>
                <p><strong>Correct Answer:</strong> {q.correctAnswerText}</p>
            </div>
            ))}
        </div>
        </div>
    );
}