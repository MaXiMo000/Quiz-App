import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./Login.css";
import "../App.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${BACKEND_URL}/api/users/login`, { email, password },
                { headers: { "Content-Type": "application/json" } });
            localStorage.setItem("user", JSON.stringify(res.data.user));
            // alert(res.data.message);
            if (res.data.user.role === "admin") {
                navigate("/admin"); 
            } else {
                navigate("/");
            }
            } catch (error) {
                console.log(error);
                alert("Login Failed");
            }
        };

        return (
            <div className="login-container">
                <div className="login-box">
                <h2>Login</h2>
                <form onSubmit={handleLogin}>
                    <div className="input-group">
                    <label>Email</label>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    </div>
                    <div className="input-group">
                    <label>Password</label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    </div>
                    <button type="submit" className="login-btn">Login</button>
                </form>
                <p className="register-link">
                    Don't have an account? <Link to="/register">Register here</Link>
                </p>
                </div>
            </div>
            );
};

export default Login;
