import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import NotificationModal from "./NotificationModal";
import { useNotification } from "../hooks/useNotification";
import axios from "../utils/axios";
import Loading from "./Loading";
import "./GoogleAuth.css";

const GoogleAuth = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = React.useState(true);

    // Notification system
    const { notification, showError, hideNotification } = useNotification();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axios.get('/api/users/me');
                const user = response.data;

                localStorage.setItem("user", JSON.stringify(user));

                // Small delay for smooth transition
                setTimeout(() => {
                    navigate(user.role === "admin" ? "/admin" : "/");
                }, 500);
            } catch (error) {
                console.error("Error fetching user data:", error);
                setLoading(false);
                showError("Failed to fetch user data");
                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            }
        };

        const token = searchParams.get("token");

        if (token) {
            // 🔒 SECURITY: Store token and fetch user data securely via API
            localStorage.setItem("token", token);
            fetchUserData();
        } else {
            setLoading(false);
            showError("Google Authentication Failed");
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        }
    }, [searchParams, navigate, showError]);

    return (
        <div className="google-auth-container">
            {/* Background Elements */}
            <div className="google-auth-bg-gradient"></div>
            <div className="google-auth-floating-orbs">
                <div className="google-auth-orb orb-1"></div>
                <div className="google-auth-orb orb-2"></div>
                <div className="google-auth-orb orb-3"></div>
            </div>

            {/* Loading Screen */}
            {loading ? (
                <div className="google-auth-content">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="google-auth-card"
                    >
                        {/* Google Logo */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="google-logo-container"
                        >
                            <svg width="64" height="64" viewBox="0 0 24 24" className="google-logo">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                        </motion.div>

                        {/* Loading Spinner */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="google-auth-spinner"
                        >
                            <div className="spinner-ring ring-1"></div>
                            <div className="spinner-ring ring-2"></div>
                            <div className="spinner-ring ring-3"></div>
                        </motion.div>

                        {/* Text */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="google-auth-text"
                        >
                            <h2 className="google-auth-title">Logging you in...</h2>
                            <p className="google-auth-subtitle">Please wait while we authenticate your account</p>
                        </motion.div>
                    </motion.div>
                </div>
            ) : (
                <Loading fullScreen={true} />
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

export default GoogleAuth;
