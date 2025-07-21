import axios from "axios";
import config from "../config/config.js";

const instance = axios.create({
    baseURL: config.BACKEND_URL,
    timeout: config.API_TIMEOUT,
    // Security headers
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    }
});

// Automatically attach token
instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle 403 (Forbidden) globally
instance.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        if (status === 403) {
            alert("⚠️ Please login first.");
            localStorage.clear();
            window.location.href = "/login";
        }

        return Promise.reject(error);
    }
);

export default instance;