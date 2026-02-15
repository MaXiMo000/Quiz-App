import React from "react";
import { Navigate } from "react-router-dom";
import { getUserFromStorage } from "../utils/localStorage";

const AuthWrapper = ({ children }) => {
    const user = getUserFromStorage();
    return user ? children : <Navigate to="/login" />;
};

export default AuthWrapper;
