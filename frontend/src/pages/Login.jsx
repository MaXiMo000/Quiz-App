import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./Login.css";
import "../App.css";
import { ThemeContext } from "../context/ThemeContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const { changeTheme } = useContext(ThemeContext);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${BACKEND_URL}/api/users/login`, { email, password }, {
                headers: { "Content-Type": "application/json" }
            });
            console.log(JSON.stringify(res.data))
            // ✅ Save token and user to localStorage
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));

            // ✅ Navigate based on role
            if (res.data.user.role === "admin") {
                changeTheme(res.data.user.selectedTheme || "Default");
                navigate("/admin");
            } else {
                changeTheme(res.data.user.selectedTheme || "Default");
                navigate("/");
            }
        } catch (error) {
            console.log(error);
            alert("Login Failed");
        }
    };
    const handleGoogleLogin = () => {
        window.open(`${BACKEND_URL}/api/users/google`, "_self");
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2>Login</h2>
                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label>Email</label>
                        <input type="email" onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input type="password" onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="login-btn">Login</button>
                </form>
                <button className="login-btn google-btn" onClick={handleGoogleLogin}>
                    Sign in with Google
                </button>
                <p className="register-link">
                    Don't have an account? <Link to="/register">Register here</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
