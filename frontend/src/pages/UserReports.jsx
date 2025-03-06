import React, { useEffect, useState } from "react";
import "../app.css";
import axios from "axios";

const UserReports = () => {
    const [reports, setReports] = useState([]);
    const user = JSON.parse(localStorage.getItem("user"));

    const getReport = () => {
        fetch(`http://localhost:5000/api/reports/user?username=${user?.name}`)
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
            const response = await axios.delete(`http://localhost:5000/api/reports/delete?quizName=${encodeURIComponent(quizName)}`);

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
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map((report, index) => (
                        <tr key={index}>
                            <td>{report.quizName}</td>
                            <td>{report.score}</td>
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

export default UserReports;