import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import "../App.css";
import "./UserReportsCheck.css";

export default function UserReportsCheck() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchReport = useCallback(async () => {
        try {
            setLoading(true);
            const user = JSON.parse(localStorage.getItem("user"));
            if (!user) {
                setError("User not found. Please login again.");
                setLoading(false);
                return;
            }
            
            const res = await axios.get(`/api/reports/${id}`);
            setReport(res.data);
            setError("");
        } catch (error) {
            console.error("Error fetching report:", error);
            setError("Report not found or access denied.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { y: 30, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.5, ease: "easeOut" }
        }
    };

    const questionVariants = {
        hidden: { x: -50, opacity: 0, scale: 0.95 },
        visible: {
            x: 0,
            opacity: 1,
            scale: 1,
            transition: { duration: 0.4, ease: "easeOut" }
        }
    };

    return (
        <AnimatePresence mode="wait">
            {loading ? (
                <Spinner message="Loading report..." />
            ) : error ? (
                <motion.div 
                    className="error-container"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key="error"
                >
                    <p className="error-message">{error}</p>
                    <motion.button 
                        className="back-btn"
                        onClick={() => navigate("/user/report")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Back to Reports
                    </motion.button>
                </motion.div>
            ) : !report ? (
                <motion.div 
                    className="error-container"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key="not-found"
                >
                    <p className="error-message">Report not found</p>
                    <motion.button 
                        className="back-btn"
                        onClick={() => navigate("/user/report")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Back to Reports
                    </motion.button>
                </motion.div>
            ) : (
                <motion.div 
                    className="report-container main-content"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    key="report-content"
                >
                    <motion.div className="report-header" variants={itemVariants}>
                        <motion.button 
                            className="back-btn"
                            onClick={() => navigate("/user/report")}
                            whileHover={{ scale: 1.05, x: -5 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            🔙 Back to Reports
                        </motion.button>
                        
                        <motion.h2 
                            whileHover={{ scale: 1.02 }}
                        >
                            📄 Quiz Report: {report.quizName}
                        </motion.h2>
                        
                        <motion.div 
                            className="score-summary"
                            whileHover={{ scale: 1.05 }}
                        >
                            <p className="score">
                                Score: <strong>{Math.round(report.score)}</strong> / {report.total}
                            </p>
                            <motion.div 
                                className={`result-badge ${report.score >= report.total * 0.5 ? 'passed' : 'failed'}`}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.5, type: "spring" }}
                            >
                                {report.score >= report.total * 0.5 ? '✅ PASSED' : '❌ FAILED'}
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    <motion.div className="question-list" variants={itemVariants}>
                        <AnimatePresence>
                            {report.questions.map((q, i) => (
                                <motion.div 
                                    key={`question-${i}`}
                                    className={`question-box ${q.userAnswer===q.correctAnswer?"correct":"wrong"}`}
                                    variants={questionVariants}
                                    layout
                                    whileHover={{ 
                                        scale: 1.01,
                                        boxShadow: "0 10px 40px rgba(99, 102, 241, 0.1)"
                                    }}
                                >
                                    <motion.h3 
                                        whileHover={{ color: "#6366f1" }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        Q{i+1}: {q.questionText}
                                    </motion.h3>

                                    <motion.ul 
                                        className="options-list"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2, staggerChildren: 0.1 }}
                                    >
                                        {q.options.map((opt, idx) => {
                                            const letter = ["A","B","C","D"][idx];
                                            const isUser    = letter === q.userAnswer;
                                            const isCorrect = letter === q.correctAnswer;
                                            return (
                                                <motion.li 
                                                    key={idx}
                                                    className={`${isCorrect?"correct-option":""} ${isUser?"your-option":""}`}
                                                    initial={{ x: -20, opacity: 0 }}
                                                    animate={{ x: 0, opacity: 1 }}
                                                    transition={{ delay: 0.1 * idx }}
                                                    whileHover={{ 
                                                        x: 5,
                                                        backgroundColor: isCorrect ? "rgba(34, 197, 94, 0.1)" : isUser ? "rgba(239, 68, 68, 0.1)" : "rgba(99, 102, 241, 0.05)"
                                                    }}
                                                >
                                                    <strong>{letter}.</strong> {opt}
                                                    {isCorrect && " ✅"}
                                                    {isUser && !isCorrect && " ✖️"}
                                                </motion.li>
                                            );
                                        })}
                                    </motion.ul>

                                    <motion.div 
                                        className="answer-summary"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <motion.p whileHover={{ scale: 1.02 }}>
                                            <strong>Your Answer:</strong> {q.userAnswerText}
                                        </motion.p>
                                        <motion.p whileHover={{ scale: 1.02 }}>
                                            <strong>Correct Answer:</strong> {q.correctAnswerText}
                                        </motion.p>
                                    </motion.div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}