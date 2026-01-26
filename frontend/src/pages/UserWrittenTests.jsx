import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import axios from "../utils/axios";
import Spinner from "../components/Spinner";
import Loading from "../components/Loading";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import "./UserWrittenTests.css"; // ✅ Import the new CSS file

const UserWrittenTests = () => {
    const [tests, setTests] = useState([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Notification system
    const { notification, showError, hideNotification } = useNotification();

    useEffect(() => {
        const fetchTests = async () => {
            try {
                const res = await axios.get('/api/written-tests');
                setTests(res.data);
            } catch (error) {
                console.error("Error fetching tests:", error);
                const errorMsg = "Error fetching tests. Try again later.";
                setError(errorMsg);
                showError(errorMsg);
            }
            finally{
                setLoading(false);
            }
        };
        fetchTests();
    }, []);



    if (loading) return <Loading fullScreen={true} />;
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
                                        <button
                                            className="start-test-btn"
                                            onClick={() => navigate(`/take-written-test/${test._id}`)}
                                            aria-label={`Start written test: ${test.title}`}
                                        >
                                            Start Test
                                        </button>
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

export default UserWrittenTests;
