import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import "./UserReports.css"; // Import the specific CSS file for UserReports
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";

const UserReports = () => {
    const [reports, setReports] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Notification system
    const { notification, showSuccess, showError, showWarning, hideNotification } = useNotification();

    // Initialize user from localStorage once
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        setUser(storedUser);
    }, []);

    const getReport = useCallback(async () => {
        if (!user?.name) return;
        
        try {
            const response = await axios.get(`/api/reports/user?username=${user.name}`); // auto-token
            setReports(response.data);
        } catch (error) {
            console.error("Error fetching quizzes:", error);
            setError("Error fetching Quiz. Try again later.");
        }
        finally{
            setLoading(false);
        }
    }, [user?.name]);

    useEffect(() => {
        if (user?.name) {
            getReport();
        }
    }, [user?.name, getReport]); // ✅ Include getReport in dependencies

    const deleteReport = async (id) => {
        if (!id) {
            showWarning("Report ID is missing!");
            return;
        }
    
        try {
            const response = await axios.delete(`/api/reports/${id}`);
    
            if (response.status === 200) {
                showSuccess("Report deleted successfully!");
                getReport(); // Refresh reports list after deletion
            }
        } catch (error) {
            console.error("Error deleting report:", error);
            showError("Failed to delete report. Check the API response.");
        }
    };

    if (loading) return <Spinner message="Loading reports..." />;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="container">
            <h1>📄 My Quiz Reports</h1>
            {reports.length === 0 ? (
                <p>No reports found.</p>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Quiz Name</th>
                                <th>Score</th>
                                <th>Total Marks</th>
                                <th>Passed</th>
                                <th>View</th>
                                <th>Delete</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report, index) => (
                                <tr key={index}>
                                    <td>{report.quizName}</td>
                                    <td>{report.score.toFixed(1)}</td>
                                    <td>{report.total}</td>
                                    <td>{report.score >= report.total * 0.5 ? "✅" : "❌"}</td>
                                    <td>
                                    <Link to={`/report/${report._id}`}>
                                        <button className="view-btn">View Report</button>
                                    </Link> 
                                    </td>
                                    <td>
                                        <button className="delete-btn" onClick={() => deleteReport(report._id)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* Notification Modal */}
            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
                autoClose={notification.autoClose}
            />
        </div>
    );
};

export default UserReports;