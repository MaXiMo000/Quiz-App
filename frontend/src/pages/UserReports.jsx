import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../utils/axios";
import "./UserReports.css"; // Import the specific CSS file for UserReports

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const UserReports = () => {
    const [reports, setReports] = useState([]);
    const user = JSON.parse(localStorage.getItem("user"));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const getReport = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/api/reports/user?username=${user?.name}`); // auto-token
            setReports(response.data);
        } catch (error) {
            console.error("Error fetching quizzes:", error);
            setError("Error fetching Quiz. Try again later.");
        }
        finally{
            setLoading(false);
        }
    };

    useEffect(() => {
        getReport();
    }, [user]);

    const deleteReport = async (id) => {
        if (!id) {
            alert("Report ID is missing!");
            return;
        }
    
        try {
            const response = await axios.delete(`${BACKEND_URL}/api/reports/${id}`);
    
            if (response.status === 200) {
                alert("Report deleted successfully!");
                getReport(); // Refresh reports list after deletion
            }
        } catch (error) {
            console.error("Error deleting report:", error);
            alert("Failed to delete report. Check the API response.");
        }
    };

    if (loading) return <p>Loading report...</p>;
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
        </div>
    );
};

export default UserReports;