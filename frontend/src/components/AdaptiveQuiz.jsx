import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import NotificationModal from "./NotificationModal";
import { useNotification } from "../hooks/useNotification";
import Loading from "./Loading";
import "./AdaptiveQuiz.css";

const AdaptiveQuiz = () => {
    const { id } = useParams();
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const defaultPerformance = query.get("performance") || "medium";

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [response, setResponse] = useState(null);
    const [topic, setTopic] = useState("");
    const [numQuestions, setNumQuestions] = useState(5);
    const [performance, setPerformance] = useState(defaultPerformance);

    // Notification system
    const { notification, showSuccess, showError, hideNotification } = useNotification();

    useEffect(() => {
        const fetchTopic = async () => {
            try {
                const res = await axios.get(`/api/quizzes/${id}`);
                setTopic(res.data.category);
                setResponse({ questions: res.data.questions || [] });
            } catch (err) {
                console.error("Error fetching quiz topic", err);
                showError("Failed to load quiz data.");
            } finally {
                setLoading(false);
            }
        };
        fetchTopic();
    }, [id]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await axios.post('/api/adaptive', {
                quizId: id,
                performance,
                numQuestions
            });

            // ✅ After adding, get the updated quiz to reflect all questions and indexes correctly
            // Add cache-busting timestamp to ensure fresh data
            const updatedQuiz = await axios.get(`/api/quizzes/${id}`, {
                params: { _t: Date.now() }
            });
            setResponse({ questions: updatedQuiz.data.questions }); // store all questions
            showSuccess(`✅ ${res.data.added || res.data.questions?.length || 0} adaptive questions added successfully!`);
        } catch (error) {
            console.error("Error generating adaptive questions:", error);
            showError("❌ Failed to generate questions.");
        } finally {
            setGenerating(false);
        }
    };


    const handleDeleteQuestion = async (index) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this question?");
        if (!confirmDelete) return;

        try {
            await axios.delete(`/api/quizzes/${id}/questions/${index}`);
            const updatedQuestions = response.questions.filter((_, i) => i !== index);
            setResponse({ ...response, questions: updatedQuestions });
            showSuccess("❌ Question deleted.");
        } catch (error) {
            console.error("Error deleting question:", error);
            showError("Failed to delete question.");
        }
    };

    if (loading) {
        return <Loading fullScreen={true} />;
    }

    return (
        <div className="adaptive-wrapper">
            <div className="adaptive-bg-orbs">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            <motion.div
                className="adaptive-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h2>
                    <span>🧠</span>
                    <span>Adaptive Quiz Generator</span>
                </h2>

                <div className="adaptive-info">
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <strong>Topic:</strong> {topic || "Loading..."}
                    </motion.p>

                    <motion.label
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <strong>Performance Level:</strong>
                        <select value={performance} onChange={(e) => setPerformance(e.target.value)}>
                            <option value="low">Struggling (Easy)</option>
                            <option value="medium">Average (Medium)</option>
                            <option value="high">Confident (Hard)</option>
                        </select>
                    </motion.label>

                    <motion.label
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <strong>Number of Questions:</strong>
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(Number(e.target.value))}
                            className="adaptive-input"
                        />
                    </motion.label>

                    <motion.button
                        className="generate-btn"
                        onClick={handleGenerate}
                        disabled={generating}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {generating ? "⏳ Generating..." : "✨ Generate Questions"}
                    </motion.button>
                </div>

                {response && response.questions && response.questions.length > 0 && (
                    <motion.div
                        className="generated-questions"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <h4>
                            <span>📋</span>
                            <span>Generated Questions ({response.questions.length})</span>
                        </h4>
                        <div className="question-list">
                            <ul>
                                {response.questions.map((q, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.7 + i * 0.1 }}
                                    >
                                        <strong>Q{i + 1}:</strong>
                                        <span>{q.question}</span>
                                        <div className="question-actions">
                                            <span className={`difficulty-tag ${q.difficulty}`}>
                                                {q.difficulty.toUpperCase()}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteQuestion(i)}
                                                className="delete-btn"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </motion.li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            <NotificationModal
                notification={notification}
                onClose={hideNotification}
            />
        </div>
    );
};

export default AdaptiveQuiz;
