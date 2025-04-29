// src/components/Layout.jsx
import React from "react";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom"; // ✅ Required to render child routes

const Layout = () => {
    return (
        <>
            <Sidebar />
            <div className="main-content">
                <Outlet />  {/* 🔥 This is where child routes get injected */}
            </div>
        </>
    );
};

export default Layout;