import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import axios from "../utils/axios";
import "./AdaptiveQuiz.css"; // ✅ Custom styling

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const AdaptiveQuiz = () => {
    const { id } = useParams();
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const defaultPerformance = query.get("performance") || "medium";

    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [topic, setTopic] = useState("");
    const [numQuestions, setNumQuestions] = useState(5);
    const [performance, setPerformance] = useState(defaultPerformance);

    useEffect(() => {
        const fetchTopic = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/quizzes/${id}`);
                setTopic(res.data.category);
            } catch (err) {
                console.error("Error fetching quiz topic", err);
            }
        };
        fetchTopic();
    }, [id]);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await axios.post(`${BACKEND_URL}/api/adaptive`, {
                quizId: id,
                performance,
                numQuestions
            });

            // ✅ After adding, get the updated quiz to reflect all questions and indexes correctly
            const updatedQuiz = await axios.get(`${BACKEND_URL}/api/quizzes/${id}`);
            setResponse({ questions: updatedQuiz.data.questions }); // store all questions
            alert("✅ Adaptive questions added!");
        } catch {
            alert("❌ Failed to generate questions.");
        } finally {
            setLoading(false);
        }
    };


    const handleDeleteQuestion = async (index) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this question?");
        if (!confirmDelete) return;

        try {
            await axios.delete(`${BACKEND_URL}/api/quizzes/${id}/questions/${index}`);
            const updatedQuestions = response.questions.filter((_, i) => i !== index);
            setResponse({ ...response, questions: updatedQuestions });
            alert("❌ Question deleted.");
        } catch (error) {
            console.error("Error deleting question:", error);
            alert("Failed to delete question.");
        }
    };

    return (
        <div className="adaptive-wrapper">
            <div className="adaptive-card">
                <h2>🧠 Adaptive Quiz Generator</h2>

                <div className="adaptive-info">
                    <p><strong>Topic:</strong> {topic}</p>

                    <label>
                        <strong>Performance Level:</strong>
                        <select value={performance} onChange={(e) => setPerformance(e.target.value)}>
                            <option value="low">Struggling (Easy)</option>
                            <option value="medium">Average (Medium)</option>
                            <option value="high">Confident (Hard)</option>
                        </select>
                    </label>

                    <label>
                        <strong>Number of Questions:</strong>
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(e.target.value)}
                            className="adaptive-input"
                        />
                    </label>

                    <button className="generate-btn" onClick={handleGenerate} disabled={loading}>
                        {loading ? "Generating..." : "Generate Questions"}
                    </button>
                </div>

                {response && (
                    <div className="generated-questions">
                        <h4>📋 Generated Questions</h4>
                        <div className="question-list">
                            <ul>
                                {response.questions.map((q, i) => (
                                    <li key={i}>
                                        <strong>Q{i + 1}:</strong> {q.question}
                                        <br />
                                        <span className={`difficulty-tag ${q.difficulty}`}>
                                            {q.difficulty.toUpperCase()}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteQuestion(i)}
                                            className="delete-btn"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdaptiveQuiz;