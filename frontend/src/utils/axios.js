import axios from "axios";
import config from "../config/config.js";

const instance = axios.create({
    baseURL: config.BACKEND_URL,
    timeout: config.API_TIMEOUT,
    withCredentials: true, // Important for CORS with credentials
    // Security headers
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    }
});

// Automatically attach token (never send "Bearer undefined" or "Bearer null")
instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token && token.trim() !== '' && token !== 'undefined' && token !== 'null') {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ✅ Normalize standardized backend responses
// Automatically extract data from { status, statusCode, message, data } format
instance.interceptors.response.use(
    (response) => {
        // Check if response follows standardized format
        if (response.data &&
            typeof response.data === 'object' &&
            'status' in response.data &&
            'statusCode' in response.data &&
            'data' in response.data) {

            // Standardized format: { status, statusCode, message, data }
            // Extract the actual data and attach metadata for reference
            const standardizedResponse = {
                ...response,
                data: response.data.data, // Extract nested data
                // Keep metadata accessible if needed
                _metadata: {
                    status: response.data.status,
                    statusCode: response.data.statusCode,
                    message: response.data.message
                }
            };
            return standardizedResponse;
        }

        // Non-standardized format (backward compatibility)
        return response;
    },
    (error) => {
        // ✅ Normalize standardized error responses
        if (error.response?.data &&
            typeof error.response.data === 'object' &&
            'status' in error.response.data &&
            'statusCode' in error.response.data) {

            // Standardized error format: { status, statusCode, message, errors? }
            const errorData = error.response.data;
            error.response.data = {
                ...(errorData.errors || {}),
                message: errorData.message || 'An error occurred'
            };
        } else if (error.response?.data?.message) {
            // Ensure error message is accessible even if not standardized
            error.response.data = {
                ...error.response.data,
                message: error.response.data.message
            };
        }

        const status = error.response?.status;

        // Handle rate limiting specifically
        if (status === 429) {
            console.error('❌ Rate Limited:', error.message);

            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 107, 107, 0.95);
                backdrop-filter: blur(10px);
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-weight: 500;
                box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
                max-width: 300px;
            `;
            notification.innerHTML = '⚠️ Too many requests. Please wait a moment and try again.';

            document.body.appendChild(notification);

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 3000);

            return Promise.reject(error);
        }

        // Handle CORS errors specifically
        if (error.code === 'ERR_NETWORK' || !error.response) {
            console.error('❌ Network/CORS Error:', error.message);

            // Show user-friendly CORS error message
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 165, 0, 0.95);
                backdrop-filter: blur(10px);
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-weight: 500;
                box-shadow: 0 8px 32px rgba(255, 165, 0, 0.3);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
                max-width: 300px;
            `;
            notification.innerHTML = '⚠️ Connection issue detected. Please refresh the page.';

            document.body.appendChild(notification);

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);
        }

        if (status === 403) {
            // Create a more elegant notification for authentication failure
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 107, 107, 0.95);
                backdrop-filter: blur(10px);
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-weight: 500;
                box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            `;
            notification.innerHTML = '⚠️ Please login first. Redirecting...';

            // Add animation keyframes if not already added
            if (!document.querySelector('#auth-notification-styles')) {
                const style = document.createElement('style');
                style.id = 'auth-notification-styles';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(notification);

            // Remove notification and redirect after 2 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
                localStorage.clear();
                window.location.href = "/login";
            }, 2000);
        }

        return Promise.reject(error);
    }
);

export default instance;
