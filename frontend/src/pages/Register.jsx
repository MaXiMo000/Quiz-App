import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../utils/axios";
import "./Register.css"; // Import CSS for styling
import "../App.css";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import Loading from "../components/Loading";

const Register = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Notification system
    const { notification, showSuccess, showError, hideNotification } = useNotification();

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Enter': (e) => {
            // Only submit if not already in a button and form is valid
            const target = e.target;
            if (target.tagName !== 'BUTTON' &&
                target.tagName !== 'TEXTAREA' &&
                name && email && password) {
                const form = target.closest('form');
                if (form && form.checkValidity()) {
                    e.preventDefault();
                    form.requestSubmit();
                }
            }
        },
    }, [name, email, password]);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`/api/users/register`,
                { name, email, password },
                { headers: { "Content-Type": "application/json" } } // ✅ Fix Content-Type
            );
            showSuccess("Registration Successful! Please log in.");
            setTimeout(() => navigate("/login"), 2000);
        } catch (error) {
            showError(error.response?.data?.message || "Registration Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modern-auth-container">
            {/* Background Elements */}
            <div className="auth-bg-gradient"></div>
            <div className="floating-elements">
                <div className="floating-orb orb-1"></div>
                <div className="floating-orb orb-2"></div>
                <div className="floating-orb orb-3"></div>
            </div>

            {/* Main Content */}
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Create Account</h1>
                    <p>Join our community today</p>
                </div>

                <form onSubmit={handleRegister} className="auth-form">
                    <div className="input-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your full name"
                            required
                            disabled={loading}
                            aria-label="Full name"
                            aria-required="true"
                            autoComplete="name"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                            disabled={loading}
                            aria-label="Email address"
                            aria-required="true"
                            autoComplete="email"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a password"
                            required
                            disabled={loading}
                            aria-label="Password"
                            aria-required="true"
                            autoComplete="new-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-btn primary"
                        disabled={loading}
                        aria-label="Create new account"
                        aria-busy={loading}
                    >
                        <span>Create Account</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Already have an account? <Link to="/login">Sign in</Link></p>
                </div>
            </div>

            {/* Full Screen Loader */}
            {loading && <Loading fullScreen={true} />}

            {/* Notification Modal */}
            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
                autoClose={notification.autoClose}
            />
        </div>
    );
};

export default Register;
