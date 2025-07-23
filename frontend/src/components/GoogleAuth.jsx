import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import NotificationModal from "./NotificationModal";
import { useNotification } from "../hooks/useNotification";
import axios from "../utils/axios";

const GoogleAuth = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Notification system
    const { notification, showError, hideNotification } = useNotification();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axios.get('/api/users/me');
                const user = response.data;
                
                localStorage.setItem("user", JSON.stringify(user));
                navigate(user.role === "admin" ? "/admin" : "/");
            } catch (error) {
                console.error("Error fetching user data:", error);
                showError("Failed to fetch user data");
                navigate("/login");
            }
        };

        const token = searchParams.get("token");

        if (token) {
            // 🔒 SECURITY: Store token and fetch user data securely via API
            localStorage.setItem("token", token);
            fetchUserData();
        } else {
            showError("Google Authentication Failed");
            navigate("/login");
        }
    }, [searchParams, navigate, showError]);

    return (
        <div>
            Logging you in...
            <NotificationModal 
                notification={notification} 
                onClose={hideNotification} 
            />
        </div>
    );
};

export default GoogleAuth;
