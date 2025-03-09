import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./Register.css"; // Import CSS for styling
import "../App.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Register = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${BACKEND_URL}/api/users/register`,
                { name, email, password },
                { headers: { "Content-Type": "application/json" } } // ✅ Fix Content-Type
            );
            alert("Registration Successful! Please log in.");
            navigate("/login");
        } catch (error) {
            console.log("Error Response:", error.response?.data || error.message);
            alert(error.response?.data?.message || "Registration Failed");
        }
    };

    return (
        <div className="register-container">
        <div className="register-box">
            <h2>Register</h2>
            <form onSubmit={handleRegister}>
            <div className="input-group">
                <label>Name</label>
                <input type="text" placeholder="Enter your name" onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="input-group">
                <label>Email</label>
                <input type="email" placeholder="Enter your email" onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
                <label>Password</label>
                <input type="password" placeholder="Enter your password" onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="register-btn">Register</button>
            </form>
            <p className="login-link">
                Already have an account? <Link to="/login">Login here</Link>
            </p>
        </div>
        </div>
    );
    };

export default Register;
