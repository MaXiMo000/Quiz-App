import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import "../App.css";
import "./UserWrittenReports.css"; // ✅ Import the new CSS file

const UserWrittenReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState(null);
    const navigate = useNavigate();

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

    const tableRowVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.3 }
        },
        exit: {
            opacity: 0,
            x: -100,
            transition: { duration: 0.3 }
        }
    };

    const getReport = useCallback(async () => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
            setError("User not found. Please log in.");
            setLoading(false);
            return;
        }
        
        try {
            setLoading(true);
            const response = await axios.get(`/api/written-test-reports/user?username=${user.name}`);
            setReports(response.data);
            setError("");
        } catch (error) {
            console.error("Error fetching reports:", error);
            setError("Error fetching reports. Try again later.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        getReport();
    }, [getReport]);

    const deleteReport = useCallback(async (id) => {
        try {
            setDeletingId(id);
            const response = await axios.delete(`/api/written-test-reports/${id}`);
            if (response.status === 200) {
                await getReport();
            }
        } catch (error) {
            console.error("Error deleting report:", error);
            setError("Failed to delete report.");
        } finally {
            setDeletingId(null);
        }
    }, [getReport]);

    // ✅ Loading state with beautiful animation
    if (loading) {
        return <Spinner message="Loading Written Test Reports..." />;
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
                        getReport();
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Try Again
                </motion.button>
            </motion.div>
        );
    }

    return (
        <motion.div 
            className="reports-container"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.h1 variants={itemVariants}>📄 My Written Test Reports</motion.h1>
            
            {reports.length === 0 ? (
                <motion.div 
                    className="no-reports"
                    variants={itemVariants}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <p>No reports found.</p>
                    <motion.button 
                        className="take-test-btn"
                        onClick={() => navigate('/user/written-tests')}
                        whileHover={{ scale: 1.05, backgroundColor: "#4f46e5" }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        Take a Written Test
                    </motion.button>
                </motion.div>
            ) : (
                <motion.div className="reports-table-container" variants={itemVariants}>
                    <motion.table
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <thead>
                            <motion.tr
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                            >
                                <th>Test Name</th>
                                <th>Score</th>
                                <th>Total Marks</th>
                                <th>Passed</th>
                                <th>Action</th>
                            </motion.tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {reports.map((report, index) => (
                                    <motion.tr 
                                        key={report._id}
                                        variants={tableRowVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        transition={{ delay: index * 0.1 }}
                                        whileHover={{ 
                                            backgroundColor: "rgba(99, 102, 241, 0.1)",
                                            scale: 1.01
                                        }}
                                    >
                                        <motion.td
                                            whileHover={{ color: "#6366f1" }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {report.testName}
                                        </motion.td>
                                        <motion.td
                                            className="score-cell"
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {report.score.toFixed(1)}
                                        </motion.td>
                                        <motion.td
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {report.total}
                                        </motion.td>
                                        <motion.td
                                            className={report.score >= report.total * 0.5 ? "passed" : "failed"}
                                            whileHover={{ scale: 1.1 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {report.score >= report.total * 0.5 ? "✅" : "❌"}
                                        </motion.td>
                                        <motion.td className="action-buttons">
                                            <motion.button 
                                                className="view-btn" 
                                                onClick={() => navigate(`/user/written-test-report/${report._id}`)}
                                                whileHover={{ scale: 1.05, backgroundColor: "#8b5cf6" }}
                                                whileTap={{ scale: 0.95 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                👁️ View
                                            </motion.button>
                                            <motion.button 
                                                className="delete-btn" 
                                                onClick={() => deleteReport(report._id)}
                                                disabled={deletingId === report._id}
                                                whileHover={{ scale: 1.05, backgroundColor: "#ef4444" }}
                                                whileTap={{ scale: 0.95 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                {deletingId === report._id ? "🗑️ Deleting..." : "🗑️ Delete"}
                                            </motion.button>
                                        </motion.td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </motion.table>
                </motion.div>
            )}
        </motion.div>
    );
};

export default UserWrittenReports;
