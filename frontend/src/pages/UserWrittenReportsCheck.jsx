import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import "../App.css";
import "./UserWrittenReportCheck.css"; // ✅ Import new CSS

const UserWrittenReportCheck = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ✅ Animation variants for enhanced user experience
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.5 }
        }
    };

    const questionVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.4 }
        }
    };

    const fetchReport = useCallback(async () => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
            setError("User not found. Please log in.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await axios.get(`/api/written-test-reports/${id}`);
            const testReport = response.data;
            if (!testReport) {
                setError("Report not found for this test.");
            } else {
                setReport(testReport);
                setError("");
            }
        } catch (error) {
            console.error("Error fetching report:", error);
            setError("Error fetching report. Try again later.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    // ✅ Calculate percentage score
    const getPercentageScore = () => {
        if (!report) return 0;
        return ((report.score / report.total) * 100).toFixed(1);
    };

    // ✅ Determine pass/fail status
    const isPassed = () => {
        return report && report.score >= (report.total * 0.5);
    };

    // ✅ Loading state with beautiful animation
    if (loading) {
        return <Spinner message="Loading written test report..." />;
    }

    // ✅ Error state with motion animation
    if (error) {
        return (
            <motion.div 
                className="error-container"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <p className="error-text">{error}</p>
                <motion.button 
                    className="retry-btn"
                    onClick={() => {
                        setError("");
                        fetchReport();
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Try Again
                </motion.button>
                <motion.button 
                    className="back-btn"
                    onClick={() => navigate('/user/written-reports')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Back to Reports
                </motion.button>
            </motion.div>
        );
    }

    return (
        <motion.div 
            className="report-container"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* ✅ Header Section with Navigation */}
            <motion.div className="report-header" variants={itemVariants}>
                <motion.button 
                    className="back-btn"
                    onClick={() => navigate('/user/written-reports')}
                    whileHover={{ scale: 1.05, x: -5 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                >
                    ← Back to Reports
                </motion.button>
                <motion.h2 variants={itemVariants}>
                    📄 Written Test Report: {report.testName}
                </motion.h2>
            </motion.div>

            {/* ✅ Score Summary Section */}
            <motion.div className="score-summary" variants={itemVariants}>
                <motion.div 
                    className="score-card"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="score-display">
                        <span className="score-number">{report.score}</span>
                        <span className="score-divider">/</span>
                        <span className="total-score">{report.total}</span>
                    </div>
                    <div className="percentage-score">
                        {getPercentageScore()}%
                    </div>
                    <motion.div 
                        className={`result-badge ${isPassed() ? 'passed' : 'failed'}`}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ 
                            delay: 0.5,
                            type: "spring",
                            stiffness: 200,
                            damping: 10 
                        }}
                    >
                        {isPassed() ? '🎉 PASSED' : '❌ FAILED'}
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* ✅ Questions List Section */}
            <motion.div className="questions-section" variants={itemVariants}>
                <h3>📝 Question-wise Analysis</h3>
                <div className="question-list">
                    <AnimatePresence>
                        {report.questions && report.questions.length > 0 ? (
                            report.questions.map((q, index) => (
                                <motion.div 
                                    key={index} 
                                    className={`question-box ${q.userAnswer === q.correctAnswer ? "correct" : "wrong"}`}
                                    variants={questionVariants}
                                    initial="hidden"
                                    animate="visible"
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ 
                                        scale: 1.02,
                                        boxShadow: "0 10px 30px rgba(99, 102, 241, 0.2)"
                                    }}
                                >
                                    <motion.div 
                                        className="question-header"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <span className="question-number">Q{index + 1}</span>
                                        <motion.span 
                                            className={`question-status ${q.userAnswer === q.correctAnswer ? "correct-icon" : "wrong-icon"}`}
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ 
                                                delay: 0.3 + (index * 0.1),
                                                type: "spring",
                                                stiffness: 200 
                                            }}
                                        >
                                            {q.userAnswer === q.correctAnswer ? "✅" : "❌"}
                                        </motion.span>
                                    </motion.div>

                                    <motion.h4 
                                        className="question-text"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 + (index * 0.1) }}
                                    >
                                        {q.questionText}
                                    </motion.h4>

                                    <motion.div 
                                        className="answer-section"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4 + (index * 0.1) }}
                                    >
                                        <div className="answer-row">
                                            <span className="answer-label">Your Answer:</span>
                                            <motion.span 
                                                className={`user-answer ${q.userAnswer === q.correctAnswer ? "correct-answer-text" : "wrong-answer-text"}`}
                                                whileHover={{ scale: 1.05 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                {q.userAnswer || "Not Answered"}
                                            </motion.span>
                                        </div>

                                        <div className="answer-row">
                                            <span className="answer-label">Correct Answer:</span>
                                            <motion.span 
                                                className="correct-answer correct-answer-text"
                                                whileHover={{ scale: 1.05 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                {q.correctAnswer}
                                            </motion.span>
                                        </div>

                                        {q.marks && (
                                            <motion.div 
                                                className="marks-section"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.5 + (index * 0.1) }}
                                            >
                                                <span className="marks-label">Marks: </span>
                                                <span className="marks-value">{q.marks}</span>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div 
                                className="no-questions"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <p>No questions found in this report.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* ✅ Action Buttons */}
            <motion.div 
                className="report-actions" 
                variants={itemVariants}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
            >
                <motion.button 
                    className="retake-btn"
                    onClick={() => navigate('/user/written-tests')}
                    whileHover={{ scale: 1.05, backgroundColor: "#10b981" }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                >
                    🔄 Take Another Test
                </motion.button>
                <motion.button 
                    className="dashboard-btn"
                    onClick={() => navigate('/user/dashboard')}
                    whileHover={{ scale: 1.05, backgroundColor: "#6366f1" }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                >
                    🏠 Dashboard
                </motion.button>
            </motion.div>
        </motion.div>
    );
};

export default UserWrittenReportCheck;