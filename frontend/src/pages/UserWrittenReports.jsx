import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";
import "./UserWrittenReports.css"; // ✅ Import the new CSS file

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const UserWrittenReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
            setError("User not found. Please log in.");
            setLoading(false);
            return;
        }

        axios.get(`${BACKEND_URL}/api/written-test-reports/user?username=${user.name}`)
            .then(res => setReports(res.data))
            .catch(() => setError("Error fetching reports. Try again later."))
            .finally(() => setLoading(false));
    }, []);

    const deleteReport = async (testName) => {
        if (!window.confirm(`Are you sure you want to delete the report for "${testName}"?`)) return;

        try {
            const response = await axios.delete(`${BACKEND_URL}/api/written-test-reports/delete?testName=${encodeURIComponent(testName)}`);
            if (response.status === 200) {
                alert("Report deleted successfully!");
                setReports(reports.filter(report => report.testName !== testName));
            }
        } catch (error) {
            console.error("Error deleting report:", error);
            alert("Failed to delete report.");
        }
    };

    if (loading) return <p>Loading reports...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="reports-container">
            <h1>📄 My Written Test Reports</h1>
            {reports.length === 0 ? (
                <p>No reports found.</p>
            ) : (
                <div className="reports-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Test Name</th>
                                <th>Score</th>
                                <th>Total Marks</th>
                                <th>Passed</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report, index) => (
                                <tr key={index}>
                                    <td>{report.testName}</td>
                                    <td>{report.score.toFixed(1)}</td>
                                    <td>{report.total}</td>
                                    <td>{report.score >= report.total * 0.5 ? "✅" : "❌"}</td>
                                    <td>
                                        <button className="view-btn" onClick={() => navigate(`/user/written-test-report/${report.testName}`)}>View</button>
                                        <button className="delete-btn" onClick={() => deleteReport(report.testName)}>Delete</button>
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

export default UserWrittenReports;
