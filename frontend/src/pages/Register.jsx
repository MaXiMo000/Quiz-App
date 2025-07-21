import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import "./Register.css"; // Import CSS for styling
import "../App.css";

const Register = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`/api/users/register`,
                { name, email, password },
                { headers: { "Content-Type": "application/json" } } // ✅ Fix Content-Type
            );
            console.log("Response:", response.data);
            alert("Registration Successful! Please log in.");
            navigate("/login");
        } catch (error) {
            console.log("Error Response:", error.response?.data || error.message);
            alert(error.response?.data?.message || "Registration Failed");
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
        <motion.div 
            className="register-box"
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
                Register
            </motion.h2>
            <form onSubmit={handleRegister}>
            <motion.div 
                className="input-group"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
            >
                <label>Name</label>
                <input type="text" placeholder="Enter your name" onChange={(e) => setName(e.target.value)} required />
            </motion.div>
            <motion.div 
                className="input-group"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <label>Email</label>
                <input type="email" placeholder="Enter your email" onChange={(e) => setEmail(e.target.value)} required />
            </motion.div>
            <motion.div 
                className="input-group"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
            >
                <label>Password</label>
                <input type="password" placeholder="Enter your password" onChange={(e) => setPassword(e.target.value)} required />
            </motion.div>
            <motion.button 
                type="submit" 
                className="register-btn"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                Register
            </motion.button>
            </form>
            <motion.p 
                className="login-link"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
            >
                Already have an account? <Link to="/login">Login here</Link>
            </motion.p>
        </motion.div>
        </motion.div>
    );
    };

export default Register;
