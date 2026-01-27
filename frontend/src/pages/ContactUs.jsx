import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import NotificationModal from "../components/NotificationModal";
import "./contact.css";

export default function ContactUs() {
    const [copiedEmail, setCopiedEmail] = useState(false);
    const { notification, showSuccess, hideNotification } = useNotification();
    const email = "ritishsaini503@gmail.com";

    const copyEmailToClipboard = () => {
        navigator.clipboard.writeText(email).then(() => {
            setCopiedEmail(true);
            showSuccess('Email copied to clipboard!');
            setTimeout(() => setCopiedEmail(false), 2000);
        }).catch(() => {
            showSuccess('Failed to copy email');
        });
    };

    const contactMethods = [
        {
            icon: "✉️",
            title: "Email Us",
            content: email,
            action: "mailto",
            href: `mailto:${email}`,
            copyable: true
        },
        {
            icon: "📱",
            title: "Phone",
            content: "+91 00000-00000",
            action: "tel",
            href: "tel:+910000000000",
            copyable: false
        },
        {
            icon: "📍",
            title: "Address",
            content: "Test City, India",
            action: "location",
            href: "#",
            copyable: false
        }
    ];

    return (
        <motion.div
            className="contact-us-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            role="main"
            aria-label="Contact Us"
        >
            <motion.div
                className="contact-us-container"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                <motion.h1
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    📧 Contact Us
                </motion.h1>

                <motion.p
                    className="contact-us-subtitle"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    Get in touch with us! We're here to help and answer any questions you may have.
                </motion.p>

                <motion.div
                    className="contact-methods-grid"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                >
                    {contactMethods.map((method, index) => (
                        <motion.div
                            key={method.title}
                            className="contact-info-card"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                            whileHover={{ y: -5, scale: 1.02 }}
                        >
                            <div className="contact-info-item">
                                <motion.div
                                    className="contact-icon"
                                    whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    {method.icon}
                                </motion.div>
                                <div className="contact-details">
                                    <h2>{method.title}</h2>
                                    {method.action === "mailto" ? (
                                        <div className="contact-email-wrapper">
                                            <a
                                                href={method.href}
                                                aria-label={`Send email to ${method.content}`}
                                                className="contact-link"
                                            >
                                                {method.content}
                                            </a>
                                            {method.copyable && (
                                                <motion.button
                                                    className="copy-email-btn"
                                                    onClick={copyEmailToClipboard}
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    aria-label="Copy email to clipboard"
                                                    title="Copy email"
                                                >
                                                    {copiedEmail ? "✓" : "📋"}
                                                </motion.button>
                                            )}
                                        </div>
                                    ) : method.action === "tel" ? (
                                        <a
                                            href={method.href}
                                            className="contact-link"
                                            aria-label={`Call ${method.content}`}
                                        >
                                            {method.content}
                                        </a>
                                    ) : (
                                        <span className="contact-text">{method.content}</span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                <motion.div
                    className="contact-cta"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                >
                    <motion.div
                        className="cta-icon"
                        animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 1
                        }}
                    >
                        💬
                    </motion.div>
                    <h3>Prefer to use our contact form?</h3>
                    <p>Fill out our form and we'll get back to you as soon as possible.</p>
                    <Link to="/contact" className="contact-form-link">
                        <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            📝 Go to Contact Form
                        </motion.button>
                    </Link>
                </motion.div>
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
}
