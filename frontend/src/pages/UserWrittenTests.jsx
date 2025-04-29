import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import axios from "../utils/axios";
import "./UserWrittenTests.css"; // ✅ Import the new CSS file

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const UserWrittenTests = () => {
    const [tests, setTests] = useState([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchTests = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/written-tests`);
                setTests(res.data);
            } catch (error) {
                console.error("Error fetching users:", error);
                setError("Error fetching users. Try again later.");
            }
            finally{
                setLoading(false);
            }
        };
        fetchTests();
    }, []);

    

    if (loading) return <p>Loading Tests...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="container">
            <h2>📝 Available Written Tests</h2>
            {tests.length === 0 ? (
                <p>No written tests available</p>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Test Title</th>
                                <th>Category</th>
                                <th>Duration</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tests.map((test) => (
                                <tr key={test._id}>
                                    <td>{test.title}</td>
                                    <td>{test.category}</td>
                                    <td>{test.duration} minutes</td>
                                    <td>
                                        <button className="start-test-btn" onClick={() => navigate(`/take-written-test/${test._id}`)}>Start Test</button>
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

export default UserWrittenTests;