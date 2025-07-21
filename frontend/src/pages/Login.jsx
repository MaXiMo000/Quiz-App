import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import "./Login.css";
import "../App.css";
import { ThemeContext } from "../context/ThemeContext";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const { changeTheme } = useContext(ThemeContext);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`/api/users/login`, { email, password }, {
                headers: { "Content-Type": "application/json" }
            });
            console.log(JSON.stringify(res.data))
            // ✅ Save token and user to localStorage
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));

            // ✅ Apply theme immediately after login
            const userTheme = res.data.user.selectedTheme || "Default";
            console.log('Login: Applying theme:', userTheme);
            changeTheme(userTheme);

            // ✅ Navigate based on role
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
    const handleGoogleLogin = () => {
        // 🔒 SECURE: Use relative URL for Google OAuth
        window.location.href = "/api/users/google";
    };

    return (
        <motion.div 
            className="login-container"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ 
                duration: 0.6,
                type: "spring",
                stiffness: 100 
            }}
        >
            <motion.div 
                className="login-box"
                initial={{ rotateX: -15 }}
                animate={{ rotateX: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                whileHover={{ 
                    scale: 1.02,
                    rotateY: 2,
                    transition: { duration: 0.3 }
                }}
            >
                <motion.h2
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    Login
                </motion.h2>
                <form onSubmit={handleLogin}>
                    <motion.div 
                        className="input-group"
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                    >
                        <label>Email</label>
                        <input type="email" onChange={(e) => setEmail(e.target.value)} required />
                    </motion.div>
                    <motion.div 
                        className="input-group"
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                    >
                        <label>Password</label>
                        <input type="password" onChange={(e) => setPassword(e.target.value)} required />
                    </motion.div>
                    <motion.button 
                        type="submit" 
                        className="login-btn"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Login
                    </motion.button>
                </form>
                <motion.button 
                    className="login-btn google-btn" 
                    onClick={handleGoogleLogin}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Sign in with Google
                </motion.button>
                <motion.p 
                    className="register-link"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                >
                    Don't have an account? <Link to="/register">Register here</Link>
                </motion.p>
            </motion.div>
        </motion.div>
    );
};

export default Login;
