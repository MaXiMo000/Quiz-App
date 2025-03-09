import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; 
import axios from "axios";
import "../app.css";
import "./UserReportsCheck.css";

const UserReportsCheck = () => {
    const { quizName } = useParams(); // Get quiz name from URL
    const [report, setReport] = useState(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) return;

        axios.get(`http://localhost:5000/api/reports/user?username=${user.name}`)
            .then(res => {
                const quizReport = res.data.find(r => r.quizName === quizName);
                setReport(quizReport);
            })
            .catch(error => console.error("Error fetching report:", error));
    }, [quizName]);

    if (!report) return <p>Loading report...</p>;

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