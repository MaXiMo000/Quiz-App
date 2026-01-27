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
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const navigate = useNavigate();

    // Notification system
    const { notification, showSuccess, showError, hideNotification } = useNotification();

    // Password strength calculation
    const getPasswordStrength = (pwd) => {
        let strength = 0;
        if (pwd.length >= 8) strength++;
        if (pwd.length >= 12) strength++;
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
        if (/\d/.test(pwd)) strength++;
        if (/[^a-zA-Z\d]/.test(pwd)) strength++;
        return strength;
    };

    const passwordStrength = getPasswordStrength(password);
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['#f5576c', '#f5576c', '#f093fb', '#43e97b', '#43e97b'];

    // Real-time validation
    const validateField = (name, value, currentPassword = password, currentConfirmPassword = confirmPassword) => {
        const newErrors = { ...errors };
        switch (name) {
            case 'name':
                if (!value) {
                    newErrors.name = 'Name is required';
                } else if (value.length < 2) {
                    newErrors.name = 'Name must be at least 2 characters';
                } else {
                    delete newErrors.name;
                }
                break;
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
                const strength = getPasswordStrength(value);
                if (!value) {
                    newErrors.password = 'Password is required';
                } else if (value.length < 6) {
                    newErrors.password = 'Password must be at least 6 characters';
                } else if (strength < 2) {
                    newErrors.password = 'Password is too weak';
                } else {
                    delete newErrors.password;
                }
                // Also validate confirm password if it's been touched
                if (touched.confirmPassword && currentConfirmPassword) {
                    if (value !== currentConfirmPassword) {
                        newErrors.confirmPassword = 'Passwords do not match';
                    } else {
                        delete newErrors.confirmPassword;
                    }
                }
                break;
            case 'confirmPassword':
                if (!value) {
                    newErrors.confirmPassword = 'Please confirm your password';
                } else if (value !== currentPassword) {
                    newErrors.confirmPassword = 'Passwords do not match';
                } else {
                    delete newErrors.confirmPassword;
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
        if (name === 'password') {
            validateField(name, value, value, confirmPassword);
        } else if (name === 'confirmPassword') {
            validateField(name, value, password, value);
        } else {
            validateField(name, value);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'name') setName(value);
        if (name === 'email') setEmail(value);
        if (name === 'password') {
            setPassword(value);
            // Re-validate confirm password when password changes
            if (touched.confirmPassword && confirmPassword) {
                validateField('confirmPassword', confirmPassword, value, confirmPassword);
            }
            if (touched[name]) {
                validateField(name, value, value, confirmPassword);
            }
        } else if (name === 'confirmPassword') {
            setConfirmPassword(value);
            if (touched[name]) {
                validateField(name, value, password, value);
            }
        } else {
            if (touched[name]) {
                validateField(name, value);
            }
        }
    };

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Enter': (e) => {
            // Only submit if not already in a button and form is valid
            const target = e.target;
            if (target.tagName !== 'BUTTON' &&
                target.tagName !== 'TEXTAREA' &&
                name && email && password && confirmPassword) {
                const form = target.closest('form');
                if (form && form.checkValidity()) {
                    e.preventDefault();
                    form.requestSubmit();
                }
            }
        },
    }, [name, email, password, confirmPassword]);

    const handleRegister = async (e) => {
        e.preventDefault();

        // Validate all fields before submission
        const allTouched = { name: true, email: true, password: true, confirmPassword: true };
        setTouched(allTouched);

        // Validate all fields
        validateField('name', name);
        validateField('email', email);
        validateField('password', password, password, confirmPassword);
        validateField('confirmPassword', confirmPassword, password, confirmPassword);

        // Wait a tick for state to update, then check errors
        setTimeout(() => {
            const currentErrors = {};
            if (!name || name.length < 2) currentErrors.name = 'Name is required';
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) currentErrors.email = 'Valid email is required';
            if (!password || password.length < 6 || getPasswordStrength(password) < 2) currentErrors.password = 'Valid password is required';
            if (!confirmPassword || password !== confirmPassword) currentErrors.confirmPassword = 'Passwords must match';

            if (Object.keys(currentErrors).length > 0) {
                setErrors(currentErrors);
                showError("Please fix all errors before submitting");
                return;
            }

            setLoading(true);
            axios.post(`/api/users/register`,
                { name, email, password },
                { headers: { "Content-Type": "application/json" } }
            )
            .then(() => {
                showSuccess("Registration Successful! Please log in.");
                setTimeout(() => navigate("/login"), 2000);
            })
            .catch((error) => {
                showError(error.response?.data?.message || "Registration Failed");
            })
            .finally(() => {
                setLoading(false);
            });
        }, 0);
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
                    <div className={`input-group ${touched.name && errors.name ? 'input-error' : ''} ${touched.name && !errors.name && name ? 'input-valid' : ''}`}>
                        <label htmlFor="name">Full Name</label>
                        <div className="input-wrapper">
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={name}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Enter your full name"
                                required
                                disabled={loading}
                                aria-label="Full name"
                                aria-required="true"
                                aria-invalid={touched.name && errors.name ? 'true' : 'false'}
                                aria-describedby={touched.name && errors.name ? 'name-error' : undefined}
                                autoComplete="name"
                            />
                            {touched.name && !errors.name && name && (
                                <span className="input-check-icon">✓</span>
                            )}
                        </div>
                        {touched.name && errors.name && (
                            <span id="name-error" className="error-message" role="alert">{errors.name}</span>
                        )}
                    </div>

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

                    <div className={`input-group ${touched.password && errors.password ? 'input-error' : ''} ${touched.password && !errors.password && password && passwordStrength >= 2 ? 'input-valid' : ''}`}>
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Create a password"
                                required
                                disabled={loading}
                                aria-label="Password"
                                aria-required="true"
                                aria-invalid={touched.password && errors.password ? 'true' : 'false'}
                                aria-describedby={touched.password && errors.password ? 'password-error' : undefined}
                                autoComplete="new-password"
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
                            {touched.password && !errors.password && password && passwordStrength >= 2 && (
                                <span className="input-check-icon">✓</span>
                            )}
                        </div>
                        {password && (
                            <div className="password-strength">
                                <div className="strength-bar">
                                    <div
                                        className="strength-fill"
                                        style={{
                                            width: `${(passwordStrength / 5) * 100}%`,
                                            backgroundColor: strengthColors[passwordStrength - 1] || strengthColors[0]
                                        }}
                                    ></div>
                                </div>
                                <span className="strength-text" style={{ color: strengthColors[passwordStrength - 1] || strengthColors[0] }}>
                                    {passwordStrength > 0 ? strengthLabels[passwordStrength - 1] : 'Very Weak'}
                                </span>
                            </div>
                        )}
                        {touched.password && errors.password && (
                            <span id="password-error" className="error-message" role="alert">{errors.password}</span>
                        )}
                    </div>

                    <div className={`input-group ${touched.confirmPassword && errors.confirmPassword ? 'input-error' : ''} ${touched.confirmPassword && !errors.confirmPassword && confirmPassword && password === confirmPassword ? 'input-valid' : ''}`}>
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <div className="input-wrapper">
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Confirm your password"
                                required
                                disabled={loading}
                                aria-label="Confirm password"
                                aria-required="true"
                                aria-invalid={touched.confirmPassword && errors.confirmPassword ? 'true' : 'false'}
                                aria-describedby={touched.confirmPassword && errors.confirmPassword ? 'confirm-password-error' : undefined}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                            {touched.confirmPassword && !errors.confirmPassword && confirmPassword && password === confirmPassword && (
                                <span className="input-check-icon">✓</span>
                            )}
                        </div>
                        {touched.confirmPassword && errors.confirmPassword && (
                            <span id="confirm-password-error" className="error-message" role="alert">{errors.confirmPassword}</span>
                        )}
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
