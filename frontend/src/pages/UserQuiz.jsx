import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../app.css";
import "./UserQuiz.css";

const UserQuiz = () => {
    const [quizzes, setQuizzes] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetch("http://localhost:5000/api/quizzes")
            .then((res) => res.json())
            .then((data) => setQuizzes(data))
            .catch((err) => console.error("Error fetching quizzes:", err));
    }, []);

    return (
        <div className="container">
    <h2>📚 Available Quizzes</h2>
    {quizzes.length === 0 ? (
        <p>No quizzes available</p>
    ) : (
        <div className="table-container"> {/* ✅ Scrollable Container */}
            <table>
                <thead>
                    <tr>
                        <th>Quiz Title</th>
                        <th>Category</th>
                        <th>Duration</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {quizzes.map((quiz) => (
                        <tr key={quiz._id}>
                            <td>{quiz.title}</td>
                            <td>{quiz.category}</td>
                            <td>{quiz.duration} minutes</td>
                            <td>
                                <button className="start-quiz-btn" onClick={() => navigate(`/user/test/${quiz._id}`)}>Start Quiz</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )}
</div>
    );
};

export default UserQuiz;