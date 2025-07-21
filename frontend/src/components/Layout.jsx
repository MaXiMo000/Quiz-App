// src/components/Layout.jsx
import React from "react";
import Sidebar from "./Sidebar";
import ParticleBackground from "./ParticleBackground";
import { Outlet } from "react-router-dom"; // ✅ Required to render child routes

const Layout = () => {
    return (
        <>
            <ParticleBackground />
            <Sidebar />
            <div className="main-content">
                <Outlet />  {/* 🔥 This is where child routes get injected */}
            </div>
        </>
    );
};

export default Layout;