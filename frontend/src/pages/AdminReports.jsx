import React, { useEffect, useState } from "react";
import "../app.css";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const AdminReports = () => {
    const [reports, setReports] = useState([]);

    // Fetch all reports
    const getReports = () => {
        fetch(`${BACKEND_URL}/api/reports`)
            .then(res => res.json())
            .then(data => setReports(data))
            .catch(error => console.error("Error fetching reports:", error));
    };

    useEffect(() => {
        getReports();
    }, []);

    // Delete report function (Same as UserReports.jsx)
    const deleteReport = async (quizName) => {
        if (!quizName) {
            alert("Report is missing!");
            return;
        }

        try {
            const response = await axios.delete(`${BACKEND_URL}/api/reports/delete?quizName=${encodeURIComponent(quizName)}`);

            if (response.status === 200) {
                alert("Report deleted successfully!");
                getReports(); // Refresh report list after deletion
            }
        } catch (error) {
            console.error("Error deleting report:", error);
            alert("Failed to delete report. Check the API response.");
        }
    };

    return (
        <div className="container">
    <h1>📄 All User Quiz Reports</h1>
    {reports.length === 0 ? (
        <p>No reports found.</p>
    ) : (
        <div className="table-container"> {/* ✅ Scrollable Container */}
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
                        <tr key={index}>
                            <td>{report.username}</td>
                            <td>{report.quizName}</td>
                            <td>{report.score.toFixed(1)}</td>
                            <td>{report.total}</td>
                            <td>{report.score >= report.total * 0.5 ? "✅" : "❌"}</td>
                            <td>
                                <button className="delete-btn" onClick={() => deleteReport(report.quizName)}>Delete</button>
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

export default AdminReports;