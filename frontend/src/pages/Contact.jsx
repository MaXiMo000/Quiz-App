import { useRef, useState } from "react";
import { motion } from "framer-motion";
import emailjs from "@emailjs/browser";
import "./contact.css";

const variants = {
    initial: { y: 500, opacity: 0 },
    animate: {
        y: 0,
        opacity: 1,
        transition: { duration: 1, staggerChildren: 0.2 },
    },
};

export default function Contact() {
    const formRef = useRef();
    const [error, setError] = useState(false);
    const [success, setSuccess] = useState(false);

    const sendEmail = (e) => {
        e.preventDefault();
        emailjs
        .sendForm(
            import.meta.env.VITE_CONTACT_SERVICE,
            import.meta.env.VITE_CONTACT_TEMPLATE,
            formRef.current,
            { publicKey: import.meta.env.VITE_CONTACT_KEY }
        )
        .then(() => setSuccess(true), () => setError(true));
    };

    return (
        <motion.div
        className="contact"
        variants={variants}
        initial="initial"
        animate="animate"
        >
        <div className="textContainer">
            <h1>Let's Work Together</h1>

            <div className="item">
            <h2>Mail</h2>
            <span>ritishsaini503@gmail.com</span>
            </div>

            <div className="item">
            <h2>Address</h2>
            <span>Chandigarh, Punjab</span>
            </div>

            <div className="item">
            <h2>Phone</h2>
            <span>+91-9465069768</span>
            </div>
        </div>

        <div className="formContainer">
            <form ref={formRef} onSubmit={sendEmail}>
            <input name="name" type="text" placeholder="Name" required />
            <input name="email" type="email" placeholder="Email" required />
            <textarea name="message" rows="8" placeholder="Message" />
            <button type="submit">Submit</button>

            {error && <p className="error">Error sending message.</p>}
            {success && <p className="success">Message sent!</p>}
            </form>
        </div>
        </motion.div>
    );
}