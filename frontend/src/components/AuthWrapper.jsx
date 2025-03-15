import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthWrapper = ({ children }) => {
    const navigate = useNavigate();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
            navigate("/login"); // ✅ Redirect to login if not logged in
        }
    }, [navigate]);

    return children; // ✅ Render the app only if logged in
};

export default AuthWrapper;