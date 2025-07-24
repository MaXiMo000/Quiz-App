// src/components/Layout.jsx
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import MobileNavBar from "./MobileNavBar";
import ParticleBackground from "./ParticleBackground";
import { Outlet } from "react-router-dom"; // ✅ Required to render child routes

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    return (
        <>
            <ParticleBackground />
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="main-content">
                <Outlet />  {/* 🔥 This is where child routes get injected */}
            </div>
            <MobileNavBar onMenuClick={toggleSidebar} />
        </>
    );
};

export default Layout;