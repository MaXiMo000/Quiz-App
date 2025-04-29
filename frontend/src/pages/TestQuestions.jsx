import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../utils/axios";
import "../App.css";
import "./QuizQuestions.css"; // ✅ Use the same styles as QuizQuestions

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const TestQuestions = () => {
    const { id } = useParams(); // ✅ Get test ID from URL
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    

    // ✅ Fetch test details
    const getTestDetails = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/api/written-tests/${id}`);
            setTest(response.data);
        } catch (error) {
            console.error("Error fetching test details:", error);
            setError("Error fetching Tests. Try again later.");
        }
        finally{
            setLoading(false);
        }
    };

    useEffect(() => {
        getTestDetails();
    }, [id]);

    // ✅ Delete a question from the test
    const deleteQuestion = async (questionIndex) => {
        if (!window.confirm("Are you sure you want to delete this question?")) return;

        try {
            await axios.delete(`${BACKEND_URL}/api/written-tests/${id}/questions/${questionIndex}`);
            alert("Question deleted successfully!");
            getTestDetails();
        } catch (error) {
            console.error("Error deleting question:", error);
            alert("Failed to delete question.");
        }
    };

    if (loading) return <p>Loading Tests...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="quiz-questions-container">
            <button className="back-btn" onClick={() => navigate("/admin/written-tests")}>🔙 Back to Tests</button>

            {test ? (
                <div className="quiz-details">
                    <h2>📖 {test.title} - Questions</h2>
                    <p><strong>Category:</strong> {test.category}</p>
                    <p><strong>Duration:</strong> {test.duration} minutes</p>
                    <p><strong>Total Marks:</strong> {test.totalMarks}</p>

                    <div className="question-list">
                        {test.questions.length > 0 ? (
                            test.questions.map((q, index) => (
                                <div key={index} className="question-box">
                                    <h3>{index + 1}. {q.question}</h3>
                                    <p><strong>Marks:</strong> {q.marks}</p>
                                    <button className="delete-btn" onClick={() => deleteQuestion(index)}>🗑️ Delete Question</button>
                                </div>
                            ))
                        ) : (
                            <p>No questions added yet.</p>
                        )}
                    </div>
                </div>
            ) : (
                <p>Loading test details...</p>
            )}
        </div>
    );
};

export default TestQuestions;