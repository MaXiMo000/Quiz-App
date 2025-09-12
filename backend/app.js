import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import passport from "passport";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import logger from "./utils/logger.js";
import requestLogger from "./middleware/requestLogger.js";
import errorHandler from "./services/errorHandler.js";
import AppError from "./utils/AppError.js";

// Load environment variables
dotenv.config();

// Passport configuration
import "./config/passport.js";

// Route Imports
import userRoutes from "./routes/userRoutes.js";
import apiRoutes from "./routes/api.js";
import writtenTestRoutes from "./routes/writtenTestRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import intelligenceRoutes from "./routes/intelligenceRoutes.js";
import debugRoutes from "./routes/debugRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";
import studyGroupRoutes from "./routes/studyGroupRoutes.js";
import gamificationRoutes from "./routes/gamificationRoutes.js";
import aiStudyBuddyRoutes from "./routes/aiStudyBuddyRoutes.js";
import realTimeQuizRoutes from "./routes/realTimeQuizRoutes.js";
import learningPathRoutes from "./routes/learningPathRoutes.js";

const app = express();

// Middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.emailjs.com", process.env.BACKEND_URL]
        },
    },
    crossOriginEmbedderPolicy: false
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests from this IP, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

app.use(requestLogger);
app.use(express.json({ limit: '10mb' }));
app.use(mongoSanitize());

const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"].filter(Boolean);
        if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new AppError('Not allowed by CORS', 403));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'X-File-Name'],
    credentials: true,
};
app.use(cors(corsOptions));

const GOOGLE_SECRET = process.env.GOOGLE_SECRET || 'supersecret';
app.use(session({
    secret: GOOGLE_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Too many authentication attempts, please try again later." },
});
app.use("/api/users/login", authLimiter);
app.use("/api/users/register", authLimiter);
app.use("/api/users", userRoutes);
app.use("/api", apiRoutes);
app.use("/api/written-tests", writtenTestRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/intelligence", intelligenceRoutes);
app.use("/api/debug", debugRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/study-groups", studyGroupRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/ai-study-buddy", aiStudyBuddyRoutes);
app.use("/api/real-time-quiz", realTimeQuizRoutes);
app.use("/api/learning-paths", learningPathRoutes);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// 404 Handler
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(errorHandler);

export default app;
