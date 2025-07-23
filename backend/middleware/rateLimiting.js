import rateLimit from "express-rate-limit";

// 🔒 SECURITY: Rate limiting configurations for different endpoints

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: "Too many requests from this IP, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth requests per windowMs
    message: {
        error: "Too many authentication attempts, please try again later."
    },
    skipSuccessfulRequests: true, // Don't count successful requests
});

export const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 contact form submissions per hour
    message: {
        error: "Too many contact form submissions, please try again later."
    }
});

export const quizLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 quiz-related requests per minute
    message: {
        error: "Too many quiz requests, please slow down."
    }
});
