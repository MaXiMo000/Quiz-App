import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import emailjs from '@emailjs/browser';
import contactConfig from "../config/contactConfig.js";
import NotificationModal from "../components/NotificationModal";
import { useNotification } from "../hooks/useNotification";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import "./contact.css";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            duration: 0.8,
            staggerChildren: 0.2,
            delayChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: {
        y: 60,
        opacity: 0,
        rotateX: -30,
        scale: 0.8
    },
    visible: {
        y: 0,
        opacity: 1,
        rotateX: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 12,
            duration: 0.6
        }
    }
};

const textVariants = {
    hidden: {
        x: -100,
        opacity: 0,
        rotateY: -30
    },
    visible: {
        x: 0,
        opacity: 1,
        rotateY: 0,
        transition: {
            type: "spring",
            stiffness: 80,
            damping: 15,
            duration: 0.8
        }
    }
};

const Contact = () => {
    const formRef = useRef();
    const autoSaveTimeoutRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Load saved form data from localStorage
    const loadSavedFormData = () => {
        try {
            const saved = localStorage.getItem('contact_form_data');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load saved form data:', e);
        }
        return { name: '', email: '', message: '' };
    };

    const [formData, setFormData] = useState(loadSavedFormData);
    const [errors, setErrors] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [touched, setTouched] = useState({
        name: false,
        email: false,
        message: false
    });
    const [autoSaved, setAutoSaved] = useState(false);

    // Notification system
    const { notification, showSuccess, showError, hideNotification } = useNotification();

    // Auto-save form data to localStorage
    const saveFormData = useCallback((data) => {
        try {
            localStorage.setItem('contact_form_data', JSON.stringify(data));
            setAutoSaved(true);
            setTimeout(() => setAutoSaved(false), 2000);
        } catch (e) {
            console.error('Failed to save form data:', e);
        }
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, []);

    // Ensure no internal scrolling - page scrolls naturally
    useEffect(() => {
        // Remove any overflow constraints that might cause internal scrollbars
        const contactElement = document.querySelector('.contact');
        const textContainer = document.querySelector('.textContainer');
        const formContainer = document.querySelector('.formContainer');

        if (contactElement) {
            contactElement.style.overflow = 'visible';
            contactElement.style.overflowY = 'visible';
            contactElement.style.height = 'auto';
            contactElement.style.maxHeight = 'none';
        }
        if (textContainer) {
            textContainer.style.overflow = 'visible';
            textContainer.style.overflowY = 'visible';
            textContainer.style.height = 'auto';
            textContainer.style.maxHeight = 'none';
        }
        if (formContainer) {
            formContainer.style.overflow = 'visible';
            formContainer.style.overflowY = 'visible';
            formContainer.style.height = 'auto';
            formContainer.style.maxHeight = 'none';
        }
    }, []);

    // Validation functions
    const validateName = (name) => {
        if (!name.trim()) return 'Name is required';
        if (name.trim().length < 2) return 'Name must be at least 2 characters';
        if (name.trim().length > 50) return 'Name must be less than 50 characters';
        return '';
    };

    const validateEmail = (email) => {
        if (!email.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return 'Please enter a valid email address';
        return '';
    };

    const validateMessage = (message) => {
        if (!message.trim()) return 'Message is required';
        if (message.trim().length < 10) return 'Message must be at least 10 characters';
        if (message.trim().length > 1000) return 'Message must be less than 1000 characters';
        return '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newFormData = {
            ...formData,
            [name]: value
        };
        setFormData(newFormData);

        // Clear previous timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Auto-save to localStorage (debounced)
        autoSaveTimeoutRef.current = setTimeout(() => {
            saveFormData(newFormData);
        }, 1000);

        // Real-time validation
        if (touched[name]) {
            let error = '';
            switch (name) {
                case 'name':
                    error = validateName(value);
                    break;
                case 'email':
                    error = validateEmail(value);
                    break;
                case 'message':
                    error = validateMessage(value);
                    break;
                default:
                    break;
            }
            setErrors({
                ...errors,
                [name]: error
            });
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched({
            ...touched,
            [name]: true
        });

        // Validate on blur
        let error = '';
        switch (name) {
            case 'name':
                error = validateName(value);
                break;
            case 'email':
                error = validateEmail(value);
                break;
            case 'message':
                error = validateMessage(value);
                break;
            default:
                break;
        }
        setErrors({
            ...errors,
            [name]: error
        });
    };

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        // Mark all fields as touched
        setTouched({
            name: true,
            email: true,
            message: true
        });

        // Validate all fields
        const nameError = validateName(formData.name);
        const emailError = validateEmail(formData.email);
        const messageError = validateMessage(formData.message);

        const newErrors = {
            name: nameError,
            email: emailError,
            message: messageError
        };

        setErrors(newErrors);

        // Check if form is valid
        if (nameError || emailError || messageError) {
            setError('Please fix the errors before submitting.');
            showError('Please fix the errors before submitting.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            // Send email directly using EmailJS
            await emailjs.send(
                contactConfig.SERVICE_ID,
                contactConfig.TEMPLATE_ID,
                {
                    from_name: formData.name.trim(),
                    from_email: formData.email.trim(),
                    message: formData.message.trim(),
                },
                contactConfig.PUBLIC_KEY
            );
            setSuccess(true);
            const emptyFormData = { name: '', email: '', message: '' };
            setFormData(emptyFormData);
            setErrors({ name: '', email: '', message: '' });
            setTouched({ name: false, email: false, message: false });

            // Clear saved form data after successful submission
            try {
                localStorage.removeItem('contact_form_data');
            } catch (e) {
                console.error('Failed to clear saved form data:', e);
            }

            showSuccess('Message sent successfully! We will get back to you soon.');

            // Auto-hide success message after 5 seconds
            setTimeout(() => {
                setSuccess(false);
            }, 5000);
        } catch (error) {
            console.error('Contact form error:', error);
            const errorMsg = error.text || 'Failed to send message. Please try again.';
            setError(errorMsg);
            showError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [formData, showSuccess, showError]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            if (error) setError('');
            if (success) setSuccess(false);
            hideNotification();
        },
        'Enter': (e) => {
            const target = e.target;
            const isInputElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
            if (!isInputElement && formRef.current) {
                const form = formRef.current;
                if (form.checkValidity()) {
                    e.preventDefault();
                    handleSubmit(e);
                }
            }
        },
    }, [error, success, handleSubmit]);

    return (
        <motion.div
            className="contact"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="floating-elements">
                <motion.div
                    className="floating-orb orb-1"
                    animate={{
                        y: [-20, 20, -20],
                        x: [-10, 10, -10],
                        rotate: [0, 180, 360]
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="floating-orb orb-2"
                    animate={{
                        y: [30, -30, 30],
                        x: [15, -15, 15],
                        rotate: [360, 180, 0]
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="floating-orb orb-3"
                    animate={{
                        y: [-25, 25, -25],
                        x: [-20, 20, -20],
                        rotate: [0, 360, 0]
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>

            <motion.div
                className="textContainer"
                variants={textVariants}
            >
                <div className="header-section">
                    <motion.h1
                        initial={{ opacity: 0, y: -50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                            delay: 0.3,
                            duration: 0.8,
                            type: "spring",
                            stiffness: 120
                        }}
                    >
                        Let's Create Something
                        <span className="gradient-text"> Amazing Together</span>
                    </motion.h1>

                    <motion.p
                        className="subtitle"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                    >
                        Ready to transform your ideas into reality?
                        Let's connect and build the future together.
                    </motion.p>
                </div>

                <motion.div
                    className="contact-items"
                    variants={containerVariants}
                >
                    <motion.div className="item" variants={itemVariants}>
                        <div className="item-icon">📧</div>
                        <div className="item-content">
                            <h2>Email</h2>
                            <span>test@test.com</span>
                        </div>
                    </motion.div>

                    <motion.div className="item" variants={itemVariants}>
                        <div className="item-icon">📱</div>
                        <div className="item-content">
                            <h2>Phone</h2>
                            <span>+91 00000-00000</span>
                        </div>
                    </motion.div>

                    <motion.div className="item" variants={itemVariants}>
                        <div className="item-icon">📍</div>
                        <div className="item-content">
                            <h2>Address</h2>
                            <span>Test City, India</span>
                        </div>
                    </motion.div>
                </motion.div>

            </motion.div>

            <motion.div
                className="formContainer"
                variants={itemVariants}
            >
                <div className="form-header">
                    <motion.h2
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                    >
                        Send Us a Message
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                    >
                        We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                    </motion.p>
                </div>

                <motion.form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0, duration: 0.6 }}
                >
                    <motion.div
                        className={`input-group ${touched.name && errors.name ? 'input-error' : ''} ${touched.name && !errors.name && formData.name ? 'input-valid' : ''}`}
                        whileFocus={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                    >
                        <input
                            type="text"
                            name="name"
                            placeholder="Your Name"
                            value={formData.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            required
                            aria-label="Your name"
                            aria-required="true"
                            aria-invalid={touched.name && errors.name ? 'true' : 'false'}
                            aria-describedby={touched.name && errors.name ? 'name-error' : undefined}
                            autoComplete="name"
                            maxLength={50}
                        />
                        {touched.name && errors.name && (
                            <motion.span
                                id="name-error"
                                className="field-error"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                {errors.name}
                            </motion.span>
                        )}
                        {touched.name && !errors.name && formData.name && (
                            <motion.span
                                className="field-success"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                ✓
                            </motion.span>
                        )}
                    </motion.div>

                    <motion.div
                        className={`input-group ${touched.email && errors.email ? 'input-error' : ''} ${touched.email && !errors.email && formData.email ? 'input-valid' : ''}`}
                        whileFocus={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                    >
                        <input
                            type="email"
                            name="email"
                            placeholder="Your Email"
                            value={formData.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            required
                            aria-label="Your email address"
                            aria-required="true"
                            aria-invalid={touched.email && errors.email ? 'true' : 'false'}
                            aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
                            autoComplete="email"
                        />
                        {touched.email && errors.email && (
                            <motion.span
                                id="email-error"
                                className="field-error"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                {errors.email}
                            </motion.span>
                        )}
                        {touched.email && !errors.email && formData.email && (
                            <motion.span
                                className="field-success"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                ✓
                            </motion.span>
                        )}
                    </motion.div>

                    <motion.div
                        className={`input-group ${touched.message && errors.message ? 'input-error' : ''} ${touched.message && !errors.message && formData.message ? 'input-valid' : ''}`}
                        whileFocus={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                    >
                        <textarea
                            name="message"
                            placeholder="Your Message (min 10 characters)"
                            rows="6"
                            value={formData.message}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            required
                            aria-label="Your message"
                            aria-required="true"
                            aria-invalid={touched.message && errors.message ? 'true' : 'false'}
                            aria-describedby={touched.message && errors.message ? 'message-error' : undefined}
                            maxLength={1000}
                        ></textarea>
                        <div className="textarea-footer">
                            {touched.message && errors.message ? (
                                <motion.span
                                    id="message-error"
                                    className="field-error"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    {errors.message}
                                </motion.span>
                            ) : (
                                <span className="char-count">
                                    {formData.message.length}/1000
                                </span>
                            )}
                            {touched.message && !errors.message && formData.message && (
                                <motion.span
                                    className="field-success"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    ✓
                                </motion.span>
                            )}
                        </div>
                    </motion.div>

                    <div className="submit-section">
                        {autoSaved && (
                            <motion.div
                                className="auto-save-indicator"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                💾 Draft saved
                            </motion.div>
                        )}
                        <motion.button
                            type="submit"
                            className="submit-btn"
                            disabled={loading}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            aria-label="Send message"
                            aria-busy={loading}
                        >
                        {loading ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                                ⟳
                            </motion.div>
                        ) : (
                            <>Send Message</>
                        )}
                        </motion.button>
                    </div>

                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                className="form-error-message"
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                transition={{ duration: 0.3 }}
                            >
                                <span className="error-icon">❌</span>
                                <span>{error}</span>
                                <button
                                    type="button"
                                    className="error-close"
                                    onClick={() => setError('')}
                                    aria-label="Close error message"
                                >
                                    ✕
                                </button>
                            </motion.div>
                        )}

                        {success && (
                            <motion.div
                                className="form-success-message"
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                transition={{ duration: 0.3 }}
                            >
                                <motion.div
                                    className="success-icon"
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        rotate: [0, 10, -10, 0]
                                    }}
                                    transition={{
                                        duration: 0.5,
                                        repeat: 2
                                    }}
                                >
                                    ✅
                                </motion.div>
                                <div className="success-content">
                                    <h3>Message Sent Successfully!</h3>
                                    <p>We've received your message and will get back to you soon.</p>
                                </div>
                                <button
                                    type="button"
                                    className="success-close"
                                    onClick={() => setSuccess(false)}
                                    aria-label="Close success message"
                                >
                                    ✕
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.form>
            </motion.div>

            {/* Notification Modal */}
            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
                autoClose={notification.autoClose}
            />
        </motion.div>
    );
};

export default Contact;
