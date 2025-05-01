import axios from "axios";

const instance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
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