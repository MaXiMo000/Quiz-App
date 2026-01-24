import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import "../App.css";
import "./AdminReports.css";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import Loading from "../components/Loading";

const AdminReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState(null);

    // Notification system
    const { notification, showSuccess, showError, showWarning, hideNotification } = useNotification();

    // Fetch all reports
    const getReports = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/reports'); // auto-token
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

    // Delete report function (Enhanced with loading state)
    const deleteReport = async (id) => {
        if (!id) {
            showWarning("Report ID is missing!");
            return;
        }

        try {
            setDeletingId(id);
            const response = await axios.delete(`/api/reports/${id}`);

            if (response.status === 200) {
                showSuccess("Report deleted successfully!");
                getReports(); // Refresh reports list after deletion
            }
        } catch (error) {
            console.error("Error deleting report:", error);
            showError("Failed to delete report. Check the API response.");
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

    if (loading) return <Loading fullScreen={true} />;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <motion.div
            className="container"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* Floating Decorative Elements */}
            <div className="floating-orb floating-orb-1"></div>
            <div className="floating-orb floating-orb-2"></div>
            <div className="floating-orb floating-orb-3"></div>

            <motion.h1
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
            >
                📄 All User Quiz Reports
            </motion.h1>

            {error ? (
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
                    <p className="no-reports-subtitle">Users haven't taken any quizzes yet!</p>
                </motion.div>
            ) : (
                <motion.div
                    className="table-container"
                    variants={itemVariants}
                    key="reports-table"
                >
                        <table>
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Quiz Name</th>
                                    <th>Score</th>
                                    <th>Total Marks</th>
                                    <th>Passed</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((report, index) => (
                                    <tr
                                        key={`admin-report-${report._id || index}`}
                                        style={{
                                            animation: `fadeInRow 0.4s ease-out ${0.3 + (index * 0.05)}s both`
                                        }}
                                    >
                                        <td className="username-cell">{report.username}</td>
                                        <td>{report.quizName}</td>
                                        <td className="score-cell">{report.score.toFixed(1)}</td>
                                        <td>{report.total}</td>
                                        <td className="pass-status">
                                            {report.score >= report.total * 0.5 ? (
                                                <span className="passed">✅</span>
                                            ) : (
                                                <span className="failed">❌</span>
                                            )}
                                        </td>
                                        <td>
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
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                )}

            {/* Notification Modal */}
            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
                autoClose={notification.autoClose}
            />
        </motion.div>
    );
};

export default AdminReports;
