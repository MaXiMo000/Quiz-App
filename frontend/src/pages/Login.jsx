import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import "./Login.css";
import "../App.css";
import { ThemeContext } from "../context/ThemeContext";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const { changeTheme } = useContext(ThemeContext);
    
    // Notification system
    const { notification, showError, hideNotification } = useNotification();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`/api/users/login`, { email, password }, {
                headers: { "Content-Type": "application/json" }
            });
            // ✅ Save token and user to localStorage
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));

            // ✅ Apply theme immediately after login
            const userTheme = res.data.user.selectedTheme || "Default";
            changeTheme(userTheme);

            // ✅ Navigate based on role
            if (res.data.user.role === "admin") {
                navigate("/admin");
            } else {
                navigate("/");
            }
        } catch (error) {
            console.log(error);
            showError("Login Failed");
        }
    };
    const handleGoogleLogin = () => {
        // 🔒 SECURE: Use full backend URL for Google OAuth
        const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
        window.location.href = `${backendURL}/api/users/google`;
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
            {/* ✨ Floating Orbs Background */}
            <motion.div 
                className="floating-orb login-orb-1"
                animate={{
                    y: [0, -15, 0],
                    rotate: [0, -5, 0],
                    scale: [1, 1.1, 1]
                }}
                transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div 
                className="floating-orb login-orb-2"
                animate={{
                    y: [0, 12, 0],
                    rotate: [0, 4, 0],
                    scale: [1, 0.9, 1]
                }}
                transition={{
                    duration: 9,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1.5
                }}
            />
            <motion.div 
                className="floating-orb login-orb-3"
                animate={{
                    y: [0, -8, 0],
                    rotate: [0, 6, 0],
                    scale: [1, 1.15, 1]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 3
                }}
            />

            {/* 🎭 Geometric Patterns */}
            <motion.div 
                className="geometric-pattern pattern-1"
                animate={{
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />
            <motion.div 
                className="geometric-pattern pattern-2"
                animate={{
                    rotate: [360, 0],
                    scale: [1, 0.8, 1]
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />

            <motion.div 
                className="login-box"
                initial={{ rotateX: -15, y: 30, opacity: 0 }}
                animate={{ rotateX: 0, y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8, type: "spring", stiffness: 120 }}
                whileHover={{ 
                    scale: 1.02,
                    rotateY: -2,
                    rotateX: 1,
                    transition: { duration: 0.3 }
                }}
            >
                {/* ✨ Floating Particles Inside Box */}
                <motion.div 
                    className="login-particle particle-1"
                    animate={{
                        y: [0, -6, 0],
                        opacity: [0.4, 0.9, 0.4]
                    }}
                    transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div 
                    className="login-particle particle-2"
                    animate={{
                        y: [0, 8, 0],
                        opacity: [0.3, 0.8, 0.3]
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 2
                    }}
                />
                <motion.div 
                    className="login-particle particle-3"
                    animate={{
                        y: [0, -4, 0],
                        opacity: [0.5, 0.9, 0.5]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                    }}
                />

                <motion.h2
                    initial={{ opacity: 0, y: -20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5, type: "spring", stiffness: 150 }}
                    whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                >
                    Login
                </motion.h2>

                <form onSubmit={handleLogin}>
                    <motion.div 
                        className="input-group"
                        initial={{ opacity: 0, x: -30, rotateX: -10 }}
                        animate={{ opacity: 1, x: 0, rotateX: 0 }}
                        transition={{ delay: 0.4, duration: 0.5, type: "spring", stiffness: 120 }}
                        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                        whileFocus={{ scale: 1.03, rotateX: 2 }}
                    >
                        <motion.label
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            📧 Email
                        </motion.label>
                        <motion.input 
                            type="email" 
                            placeholder="Enter your cosmic email" 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            whileFocus={{ 
                                scale: 1.02, 
                                rotateX: 1,
                                transition: { duration: 0.2 }
                            }}
                        />
                        <motion.div 
                            className="input-magic-glow"
                            initial={{ scaleX: 0 }}
                            whileFocus={{ scaleX: 1 }}
                            transition={{ duration: 0.3 }}
                        />
                    </motion.div>

                    <motion.div 
                        className="input-group"
                        initial={{ opacity: 0, x: -30, rotateX: -10 }}
                        animate={{ opacity: 1, x: 0, rotateX: 0 }}
                        transition={{ delay: 0.5, duration: 0.5, type: "spring", stiffness: 120 }}
                        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                        whileFocus={{ scale: 1.03, rotateX: 2 }}
                    >
                        <motion.label
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            🔐 Password
                        </motion.label>
                        <motion.input 
                            type="password" 
                            placeholder="Enter your secret key" 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            whileFocus={{ 
                                scale: 1.02, 
                                rotateX: 1,
                                transition: { duration: 0.2 }
                            }}
                        />
                        <motion.div 
                            className="input-magic-glow"
                            initial={{ scaleX: 0 }}
                            whileFocus={{ scaleX: 1 }}
                            transition={{ duration: 0.3 }}
                        />
                    </motion.div>

                    <motion.button 
                        type="submit" 
                        className="login-btn"
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.6, duration: 0.5, type: "spring", stiffness: 150 }}
                        whileHover={{ 
                            scale: 1.05, 
                            rotateX: 2,
                            boxShadow: "0 20px 40px rgba(99, 102, 241, 0.3)"
                        }}
                        whileTap={{ 
                            scale: 0.95,
                            rotateX: -1,
                            transition: { duration: 0.1 }
                        }}
                    >
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                        >
                            🚀 Login
                        </motion.span>
                        <motion.div 
                            className="button-magic-shimmer"
                            animate={{
                                x: ["-100%", "100%"],
                                opacity: [0, 1, 0]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear",
                                delay: 1
                            }}
                        />
                    </motion.button>

                    <motion.div 
                        className="divider"
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                    >
                        <span>or</span>
                    </motion.div>

                    <motion.button 
                        type="button" 
                        className="login-btn google-btn"
                        onClick={handleGoogleLogin}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.9, duration: 0.5, type: "spring", stiffness: 150 }}
                        whileHover={{ 
                            scale: 1.05, 
                            rotateX: 2,
                            boxShadow: "0 20px 40px rgba(66, 133, 244, 0.3)"
                        }}
                        whileTap={{ 
                            scale: 0.95,
                            rotateX: -1,
                            transition: { duration: 0.1 }
                        }}
                    >
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.0 }}
                        >
                            🌐 Sign in with Google
                        </motion.span>
                    </motion.button>
                </form>

                <motion.p 
                    className="register-link"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1, duration: 0.5 }}
                    whileHover={{ scale: 1.02 }}
                >
                    Don't have an account? 
                    <motion.span whileHover={{ scale: 1.1, color: "var(--color-primary-400)" }}>
                        <Link to="/register">✨ Register here</Link>
                    </motion.span>
                </motion.p>
            </motion.div>
            
            {/* Notification Modal */}
            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
                autoClose={notification.autoClose}
            />
        </motion.div>         
    );
};

export default Login;
