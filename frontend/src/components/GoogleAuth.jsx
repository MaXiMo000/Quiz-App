import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import NotificationModal from "./NotificationModal";
import { useNotification } from "../hooks/useNotification";

const GoogleAuth = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Notification system
    const { notification, showError, hideNotification } = useNotification();

    useEffect(() => {
        const token = searchParams.get("token");
        const _id = searchParams.get("_id");
        const name = searchParams.get("name");
        const email = searchParams.get("email");
        const role = searchParams.get("role");

        if (token && email && role && _id) {
            const user = {_id, name, email, role };
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            navigate(role === "admin" ? "/admin" : "/");
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
