import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import "../App.css";
import "./UserReports.css"; // ✅ Use enhanced UserReports CSS for consistency

const AdminWrittenTestReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState(null);

    // Notification system
    const { notification, showSuccess, showError, hideNotification } = useNotification();

    // ✅ Fetch all reports
    const getReports = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/written-test-reports'); // auto-token
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
        getReports();
    }, [getReports]);

    // ✅ Delete report function (Enhanced with loading state)
    const deleteReport = async (id) => {
        if (!id) {
            showError("Report ID is missing!");
            return;
        }

        try {
            setDeletingId(id);
            const response = await axios.delete(`/api/written-test-reports/${id}`);

            if (response.status === 200) {
                showSuccess("Report deleted successfully!");
                getReports(); // Refresh report list
            }
        } catch (error) {
            console.error("Error deleting report:", error);
            showError("Failed to delete report.");
        } finally {
            setDeletingId(null);
        }
    };

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

    const tableRowVariants = {
        hidden: { x: -50, opacity: 0 },
        visible: {
            x: 0,
            opacity: 1,
            transition: { duration: 0.4, ease: "easeOut" }
        },
        exit: {
            x: 50,
            opacity: 0,
            scale: 0.9,
            transition: { duration: 0.3 }
        }
    };

    if (loading) return <Spinner message="Loading written test reports..." />;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <motion.div 
            className="container"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <motion.h1 
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
            >
                📄 All User Written Test Reports
            </motion.h1>

            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div 
                        className="loading-container"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        key="loading"
                    >
                        <div className="loading-spinner">🔄</div>
                        <p>Loading reports...</p>
                    </motion.div>
                ) : error ? (
                    <motion.div 
                        className="error-container"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key="error"
                    >
                        <p className="error-message">{error}</p>
                    </motion.div>
                ) : reports.length === 0 ? (
                    <motion.div 
                        className="no-reports"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key="no-reports"
                    >
                        <div className="no-reports-icon">📋</div>
                        <p>No reports found.</p>
                        <p className="no-reports-subtitle">Users haven't taken any written tests yet!</p>
                    </motion.div>
                ) : (
                    <motion.div 
                        className="table-container"
                        variants={itemVariants}
                        key="reports-table"
                    >
                        <motion.table
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <motion.thead
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <tr>
                                    <th>Username</th>
                                    <th>Test Name</th>
                                    <th>Score</th>
                                    <th>Total Marks</th>
                                    <th>Passed</th>
                                    <th>Action</th>
                                </tr>
                            </motion.thead>
                            <motion.tbody>
                                <AnimatePresence>
                                    {reports.map((report, index) => (
                                        <motion.tr 
                                            key={`admin-test-report-${report._id || index}`}
                                            variants={tableRowVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            layout
                                            whileHover={{ 
                                                backgroundColor: "rgba(99, 102, 241, 0.05)",
                                                scale: 1.01 
                                            }}
                                            transition={{ duration: 0.2 }}
                                            custom={index}
                                        >
                                            <motion.td 
                                                className="username-cell"
                                                whileHover={{ x: 5, color: "#6366f1" }}
                                            >
                                                {report.username}
                                            </motion.td>
                                            <motion.td whileHover={{ x: 5 }}>{report.testName}</motion.td>
                                            <motion.td 
                                                className="score-cell"
                                                whileHover={{ scale: 1.1, color: "#6366f1" }}
                                            >
                                                {report.score.toFixed(1)}
                                            </motion.td>
                                            <motion.td whileHover={{ x: 5 }}>{report.total}</motion.td>
                                            <motion.td 
                                                className="pass-status"
                                                whileHover={{ scale: 1.2 }}
                                            >
                                                {report.score >= report.total * 0.5 ? (
                                                    <span className="passed">✅</span>
                                                ) : (
                                                    <span className="failed">❌</span>
                                                )}
                                            </motion.td>
                                            <motion.td>
                                                <motion.button 
                                                    className="delete-btn" 
                                                    onClick={() => deleteReport(report._id)}
                                                    disabled={deletingId === report._id}
                                                    whileHover={{ scale: 1.05, y: -2 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    animate={deletingId === report._id ? { opacity: 0.5 } : { opacity: 1 }}
                                                >
                                                    {deletingId === report._id ? "🔄 Deleting..." : "Delete"}
                                                </motion.button>
                                            </motion.td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </motion.tbody>
                        </motion.table>
                    </motion.div>
                )}
            </AnimatePresence>
            <NotificationModal 
                notification={notification} 
                onClose={hideNotification} 
            />
        </motion.div>
    );
};

export default AdminWrittenTestReports;