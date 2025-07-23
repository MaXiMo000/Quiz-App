import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import emailjs from '@emailjs/browser';
import contactConfig from "../config/contactConfig.js";
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            // � Send email directly using EmailJS
            await emailjs.send(
                contactConfig.SERVICE_ID,
                contactConfig.TEMPLATE_ID,
                {
                    from_name: formData.name,
                    from_email: formData.email,
                    message: formData.message,
                },
                contactConfig.PUBLIC_KEY
            );
            setSuccess(true);
            setFormData({ name: '', email: '', message: '' });
        } catch (error) {
            console.error('Contact form error:', error);
            setError('Failed to send message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

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
                            <span>ritishsaini503@gmail.com</span>
                        </div>
                    </motion.div>

                    <motion.div className="item" variants={itemVariants}>
                        <div className="item-icon">📱</div>
                        <div className="item-content">
                            <h2>Phone</h2>
                            <span>+91 98765-43210</span>
                        </div>
                    </motion.div>

                    <motion.div className="item" variants={itemVariants}>
                        <div className="item-icon">📍</div>
                        <div className="item-content">
                            <h2>Address</h2>
                            <span>Delhi, India</span>
                        </div>
                    </motion.div>
                </motion.div>

                <motion.div 
                    className="social-links"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.6 }}
                >
                    <motion.a 
                        href="#" 
                        className="social-link"
                        whileHover={{ scale: 1.2, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        🌐
                    </motion.a>
                    <motion.a 
                        href="#" 
                        className="social-link"
                        whileHover={{ scale: 1.2, rotate: -5 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        📱
                    </motion.a>
                    <motion.a 
                        href="#" 
                        className="social-link"
                        whileHover={{ scale: 1.2, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        💼
                    </motion.a>
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
                        className="input-group"
                        whileFocus={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="input-icon">◉</div>
                        <input
                            type="text"
                            name="name"
                            placeholder="Your Name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </motion.div>

                    <motion.div 
                        className="input-group"
                        whileFocus={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="input-icon">✉</div>
                        <input
                            type="email"
                            name="email"
                            placeholder="Your Email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </motion.div>

                    <motion.div 
                        className="input-group"
                        whileFocus={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="input-icon">◈</div>
                        <textarea
                            name="message"
                            placeholder="Your Message"
                            rows="6"
                            value={formData.message}
                            onChange={handleChange}
                            required
                        ></textarea>
                    </motion.div>

                    <motion.button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        {loading ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                                ⟳
                            </motion.div>
                        ) : (
                            <>🚀 Send Message</>
                        )}
                    </motion.button>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                className="error-message"
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                transition={{ duration: 0.3 }}
                            >
                                ❌ {error}
                            </motion.div>
                        )}

                        {success && (
                            <motion.div
                                className="success-message"
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                transition={{ duration: 0.3 }}
                            >
                                ✅ Message sent successfully! We'll get back to you soon.
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.form>
            </motion.div>
        </motion.div>
    );
};

export default Contact;
