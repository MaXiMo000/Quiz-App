import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../app.css";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const UserReports = () => {
    const [reports, setReports] = useState([]);
    const user = JSON.parse(localStorage.getItem("user"));

    const getReport = () => {
        fetch(`${BACKEND_URL}/api/reports/user?username=${user?.name}`)
            .then(res => res.json())
            .then(data => setReports(data))
            .catch(error => console.error("Error fetching reports:", error));
    };

    useEffect(() => {
        getReport();
    }, [user]);

    const deleteReport = async (quizName) => {
        if (!quizName) {
            alert("Report is missing!");
            return;
        }

        try {
            const response = await axios.delete(`${BACKEND_URL}/api/reports/delete?quizName=${encodeURIComponent(quizName)}`);

            if (response.status === 200) {
                alert("Quiz deleted successfully!");
                getReport(); // ✅ Refresh reports list after deletion
            }
        } catch (error) {
            console.error("Error deleting report:", error);
            alert("Failed to delete report. Check the API response.");
        }
    };

    return (
        <div className="container">
    <h1>📄 My Quiz Reports</h1>
    {reports.length === 0 ? (
        <p>No reports found.</p>
    ) : (
        <div className="table-container"> {/* ✅ Scrollable Container */}
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
                                <Link to={`/report/${report.quizName}`}>
                                    <button className="view-btn">View Report</button>
                                </Link>
                            </td>
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

export default UserReports;