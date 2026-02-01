import rateLimit from "express-rate-limit";

// 🔒 SECURITY: Rate limiting configurations for different endpoints
// ✅ DEVELOPMENT: Skip rate limiting in development mode

const isDevelopment = process.env.NODE_ENV === "development" || process.env.NODE_ENV !== "production";

// Helper function to skip rate limiting in development
const skipInDevelopment = (req) => {
    return isDevelopment || req.method === "OPTIONS";
};

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // ✅ PRODUCTION: Increased to 200 requests per 15 minutes (~13.3/min) - reasonable for quiz app
    message: {
        error: "Too many requests from this IP, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInDevelopment, // Skip in development
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // ✅ PRODUCTION: Increased to 20 auth requests per 15 minutes (~1.3/min) - allows legitimate retries
    message: {
        error: "Too many authentication attempts, please try again later."
    },
    skipSuccessfulRequests: true, // Don't count successful requests
    skip: skipInDevelopment, // Skip in development
});

export const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 contact form submissions per hour
    message: {
        error: "Too many contact form submissions, please try again later."
    },
    skip: skipInDevelopment, // Skip in development
});

export const quizLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // ✅ PRODUCTION: Increased to 50 quiz-related requests per minute - reasonable for active quiz taking
    message: {
        error: "Too many quiz requests, please slow down."
    },
    skip: skipInDevelopment, // Skip in development
});

export const roleUpdateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // Limit each IP to 20 role update requests per minute
    message: {
        error: "Too many role update requests, please slow down."
    },
    skipSuccessfulRequests: true, // Don't count successful requests
    skip: skipInDevelopment, // Skip in development
});

// 🔒 AI-specific rate limiting to prevent spam and quota exhaustion
export const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15, // ✅ PRODUCTION: Increased to 15 AI requests per minute - allows for conversational flow
    message: {
        error: "Too many AI requests. Please wait a moment before generating more content."
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInDevelopment, // Skip in development
});

// 🔒 Stricter rate limiting for AI question generation (costly operation)
export const aiQuestionLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // ✅ PRODUCTION: Increased to 10 question generation requests per 5 minutes (2/min) - balances cost and usability
    message: {
        error: "Too many question generation requests. Please wait before generating more questions."
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInDevelopment, // Skip in development
});
