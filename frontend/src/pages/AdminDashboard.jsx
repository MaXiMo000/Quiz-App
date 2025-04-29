import { useEffect, useState } from "react";
import axios from "../utils/axios";
import "./AdminDashboard.css";
import "../App.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [quizs, setQuizs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/users`);
                setUsers(res.data);
            } catch (error) {
                console.error("Error fetching users:", error);
                setError("Error fetching users. Try again later.");
            }
            finally{
                setLoading(false);
            }
        };

        const fetchQuizs = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/quizzes`);
                setQuizs(res.data);
            } catch (error) {
                console.error("Error fetching quizzes:", error);
                setError("Error fetching users. Try again later.");
            }
            finally{
                setLoading(false);
            }
        };

        fetchUsers();
        fetchQuizs();
    }, []);

    if (loading) return <p>Loading ...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="admin-dashboard">
            <div className="dashboard-content">
                <h1>📊 Admin Dashboard</h1>
                <p>Manage users and view platform statistics.</p>

                <div className="stats">
                    <div className="stat-card">
                        <h3>Total Users</h3>
                        <p>{users.length}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Total Quizzes</h3>
                        <p>{quizs.length}</p>
                    </div>
                </div>

                <h2 className="table-title">👥 Registered Users</h2>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user._id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.role}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
