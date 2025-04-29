import React from "react";
import { Navigate } from "react-router-dom";

const AuthWrapper = ({ children }) => {
    const user = JSON.parse(localStorage.getItem("user"));
    return user ? children : <Navigate to="/login" />;
};

export default AuthWrapper;