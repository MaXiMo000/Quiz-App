import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import "./Register.css"; // Import CSS for styling
import "../App.css";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";

const Register = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    
    // Notification system
    const { notification, showSuccess, showError, hideNotification } = useNotification();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`/api/users/register`,
                { name, email, password },
                { headers: { "Content-Type": "application/json" } } // ✅ Fix Content-Type
            );
            console.log("Response:", response.data);
            showSuccess("Registration Successful! Please log in.");
            setTimeout(() => navigate("/login"), 2000);
        } catch (error) {
            console.log("Error Response:", error.response?.data || error.message);
            showError(error.response?.data?.message || "Registration Failed");
        }
    };

    return (
        <motion.div 
            className="register-container"
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
                className="floating-orb register-orb-1"
                animate={{
                    y: [0, -20, 0],
                    rotate: [0, 5, 0],
                    scale: [1, 1.1, 1]
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div 
                className="floating-orb register-orb-2"
                animate={{
                    y: [0, 15, 0],
                    rotate: [0, -3, 0],
                    scale: [1, 0.9, 1]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                }}
            />
            <motion.div 
                className="floating-orb register-orb-3"
                animate={{
                    y: [0, -10, 0],
                    rotate: [0, 8, 0],
                    scale: [1, 1.2, 1]
                }}
                transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
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
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />
            <motion.div 
                className="geometric-pattern pattern-2"
                animate={{
                    rotate: [360, 0],
                    scale: [1, 0.9, 1]
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />

        <motion.div 
            className="register-box"
            initial={{ rotateX: -15, y: 30, opacity: 0 }}
            animate={{ rotateX: 0, y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8, type: "spring", stiffness: 120 }}
            whileHover={{ 
                scale: 1.02,
                rotateY: 2,
                rotateX: 1,
                transition: { duration: 0.3 }
            }}
        >
            {/* ✨ Floating Particles Inside Box */}
            <motion.div 
                className="register-particle particle-1"
                animate={{
                    y: [0, -8, 0],
                    opacity: [0.3, 0.8, 0.3]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div 
                className="register-particle particle-2"
                animate={{
                    y: [0, 10, 0],
                    opacity: [0.4, 0.9, 0.4]
                }}
                transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                }}
            />
            <motion.div 
                className="register-particle particle-3"
                animate={{
                    y: [0, -6, 0],
                    opacity: [0.2, 0.7, 0.2]
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
            />

            <motion.h2
                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5, type: "spring", stiffness: 150 }}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
                Register
            </motion.h2>
            <form onSubmit={handleRegister}>
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
                    ✨ Name
                </motion.label>
                <motion.input 
                    type="text" 
                    placeholder="Enter your magical name" 
                    onChange={(e) => setName(e.target.value)} 
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
                transition={{ delay: 0.6, duration: 0.5, type: "spring", stiffness: 120 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                whileFocus={{ scale: 1.03, rotateX: 2 }}
            >
                <motion.label
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                >
                    🔐 Password
                </motion.label>
                <motion.input 
                    type="password" 
                    placeholder="Create your secret key" 
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
                className="register-btn"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5, type: "spring", stiffness: 150 }}
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
                    transition={{ delay: 0.8 }}
                >
                    🚀 Register
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
            </form>
            
            <motion.p 
                className="login-link"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                whileHover={{ scale: 1.02 }}
            >
                Already have an account? 
                <motion.span whileHover={{ scale: 1.1, color: "var(--color-primary-400)" }}>
                    <Link to="/login">✨ Login here</Link>
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

export default Register;
