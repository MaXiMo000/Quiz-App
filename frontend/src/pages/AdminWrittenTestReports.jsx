import React, { useEffect, useState } from "react";
import axios from "axios";
import "../App.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const AdminWrittenTestReports = () => {
    const [reports, setReports] = useState([]);

    // ✅ Fetch all reports
    const getReports = () => {
        fetch(`http://localhost:4000/api/written-test-reports`)
            .then(res => res.json())
            .then(data => setReports(data))
            .catch(error => console.error("Error fetching reports:", error));
    };

    useEffect(() => {
        getReports();
    }, []);

    // ✅ Delete report function
    const deleteReport = async (testName) => {
        if (!testName) {
            alert("Report name is missing!");
            return;
        }

        try {
            const response = await axios.delete(`http://localhost:4000/api/written-test-reports/delete?testName=${encodeURIComponent(testName)}`);

            if (response.status === 200) {
                alert("Report deleted successfully!");
                getReports(); // Refresh report list
            }
        } catch (error) {
            console.error("Error deleting report:", error);
            alert("Failed to delete report.");
        }
    };

    return (
        <div className="container">
            <h1>📄 All User Written Test Reports</h1>
            {reports.length === 0 ? (
                <p>No reports found.</p>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Username</th>
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
                                    <td>{report.username}</td>
                                    <td>{report.testName}</td>
                                    <td>{report.score.toFixed(1)}</td>
                                    <td>{report.total}</td>
                                    <td>{report.score >= report.total * 0.5 ? "✅" : "❌"}</td>
                                    <td>
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

export default AdminWrittenTestReports;