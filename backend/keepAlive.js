import axios from "axios";

const PING_URL = `${process.env.BACKEND_URL}/api/users`; // Adjust if needed

const pingServer = async () => {
    try {
        await axios.get(PING_URL);
        console.log("✅ Server pinged successfully");
    } catch (error) {
        console.error("❌ Keep-alive ping failed:", error.message);
    }
};

// Ping server every 5 minutes
setInterval(pingServer, 5 * 60 * 1000);