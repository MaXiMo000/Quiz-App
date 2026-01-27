import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../utils/axios";
import "./Login.css";
import "../App.css";
import { ThemeContext } from "../context/ThemeContext";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import Loading from "../components/Loading";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const navigate = useNavigate();
    const { changeTheme } = useContext(ThemeContext);

    // Notification system
    const { notification, showError, hideNotification } = useNotification();

    // Real-time validation
    const validateField = (name, value) => {
        const newErrors = { ...errors };
        switch (name) {
            case 'email':
                if (!value) {
                    newErrors.email = 'Email is required';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    newErrors.email = 'Please enter a valid email';
                } else {
                    delete newErrors.email;
                }
                break;
            case 'password':
                if (!value) {
                    newErrors.password = 'Password is required';
                } else if (value.length < 6) {
                    newErrors.password = 'Password must be at least 6 characters';
                } else {
                    delete newErrors.password;
                }
                break;
            default:
                break;
        }
        setErrors(newErrors);
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched({ ...touched, [name]: true });
        validateField(name, value);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'email') setEmail(value);
        if (name === 'password') setPassword(value);

        if (touched[name]) {
            validateField(name, value);
        }
    };

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Enter': (e) => {
            // Only submit if not already in a button and form is valid
            const target = e.target;
            if (target.tagName !== 'BUTTON' &&
                target.tagName !== 'TEXTAREA' &&
                email && password) {
                const form = target.closest('form');
                if (form && form.checkValidity()) {
                    e.preventDefault();
                    form.requestSubmit();
                }
            }
        },
    }, [email, password]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`/api/users/login`, { email, password }, {
                headers: { "Content-Type": "application/json" }
            });
            // ✅ Save token and user to localStorage
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));

            // ✅ Apply theme immediately after login
            const userTheme = res.data.user.selectedTheme || "Default";
            changeTheme(userTheme);

            // ✅ Navigate based on role
            if (res.data.user.role === "admin") {
                navigate("/admin");
            } else {
                navigate("/");
            }
        // eslint-disable-next-line no-unused-vars
        } catch (error) {
            showError("Login Failed");
        } finally {
            setLoading(false);
        }
    };
    const handleGoogleLogin = () => {
        // 🔒 SECURE: Use full backend URL for Google OAuth
        const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
        window.location.href = `${backendURL}/api/users/google`;
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
                    <h1>Welcome Back</h1>
                    <p>Sign in to your account</p>
                </div>

                <form onSubmit={handleLogin} className="auth-form">
                    <div className={`input-group ${touched.email && errors.email ? 'input-error' : ''} ${touched.email && !errors.email && email ? 'input-valid' : ''}`}>
                        <label htmlFor="email">Email</label>
                        <div className="input-wrapper">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Enter your email"
                                required
                                disabled={loading}
                                aria-label="Email address"
                                aria-required="true"
                                aria-invalid={touched.email && errors.email ? 'true' : 'false'}
                                aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
                                autoComplete="email"
                            />
                            {touched.email && !errors.email && email && (
                                <span className="input-check-icon">✓</span>
                            )}
                        </div>
                        {touched.email && errors.email && (
                            <span id="email-error" className="error-message" role="alert">{errors.email}</span>
                        )}
                    </div>

                    <div className={`input-group ${touched.password && errors.password ? 'input-error' : ''} ${touched.password && !errors.password && password ? 'input-valid' : ''}`}>
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Enter your password"
                                required
                                disabled={loading}
                                aria-label="Password"
                                aria-required="true"
                                aria-invalid={touched.password && errors.password ? 'true' : 'false'}
                                aria-describedby={touched.password && errors.password ? 'password-error' : undefined}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                tabIndex={-1}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                            {touched.password && !errors.password && password && (
                                <span className="input-check-icon">✓</span>
                            )}
                        </div>
                        {touched.password && errors.password && (
                            <span id="password-error" className="error-message" role="alert">{errors.password}</span>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="auth-btn primary"
                        disabled={loading}
                        aria-label="Sign in to your account"
                        aria-busy={loading}
                    >
                        <span>Sign In</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>

                    <div className="divider">
                        <span>or</span>
                    </div>

                    <button
                        type="button"
                        className="auth-btn google"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Continue with Google
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Don't have an account? <Link to="/register">Create one</Link></p>
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

export default Login;
