import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import passport from "passport";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import cron from "node-cron";
import { createServer } from "http";

// ✅ Load environment variables before anything else
dotenv.config();

// ✅ Load the passport Google strategy configuration
import "./config/passport.js";

// Route Imports
import userRoutes from "./routes/userRoutes.js";
import apiRoutes from "./routes/api.js";
import requestLogger from "./middleware/requestLogger.js";
import errorHandler from "./services/errorHandler.js";
import writtenTestRoutes from "./routes/writtenTestRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import intelligenceRoutes from "./routes/intelligenceRoutes.js"; // Phase 2: Intelligence Layer
import debugRoutes from "./routes/debugRoutes.js"; // Temporary debug routes

// Phase 3: Social & Gamification Routes
import socialRoutes from "./routes/socialRoutes.js";
import studyGroupRoutes from "./routes/studyGroupRoutes.js";
import gamificationRoutes from "./routes/gamificationRoutes.js";

// Phase 4: Next-Gen Features
import aiStudyBuddyRoutes from "./routes/aiStudyBuddyRoutes.js";
import realTimeQuizRoutes from "./routes/realTimeQuizRoutes.js";
import { initializeRealTimeQuiz } from "./controllers/realTimeQuizController.js";

// Phase 5: Advanced Learning Path Engine
import learningPathRoutes from "./routes/learningPathRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";

// Import the daily challenge reset function
import { resetDailyChallenges } from "./controllers/gamificationController.js";
import { connectRedis, redisClient } from "./config/redis.js";
import { RedisStore } from "connect-redis";
import MongoStore from "connect-mongo";
import logger from "./utils/logger.js";

const app = express();

// 🔒 PRODUCTION: Trust proxy for Render/Heroku (use number of proxies, not true)
// express-rate-limit rejects trust proxy === true as insecure (spoofable X-Forwarded-For).
// Render uses 1 proxy; set TRUST_PROXY_COUNT in env if your host uses more.
if (process.env.RENDER || process.env.NODE_ENV === "production") {
    const proxyCount = parseInt(process.env.TRUST_PROXY_COUNT || "1", 10) || 1;
    app.set("trust proxy", proxyCount);
    logger.info(`Trust proxy set to ${proxyCount} for production deployment`);
}

// 🔒 SECURITY: Apply security headers
app.use(requestLogger);
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.emailjs.com"]
        },
    },
    crossOriginEmbedderPolicy: false
}));

// 🔒 SECURITY: Rate limiting (skip for preflight requests and in development)
const isDevelopment = process.env.NODE_ENV === "development" || process.env.NODE_ENV !== "production";

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // ✅ PRODUCTION: Increased to 200 requests per 15 minutes (~13.3/min) - reasonable for quiz app
    message: {
        error: "Too many requests from this IP, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for preflight requests and in development
        return req.method === "OPTIONS" || isDevelopment;
    }
});

// Apply rate limiting to all requests (except preflight and in development)
if (!isDevelopment) {
    app.use(limiter);
}

// Stricter rate limiting for auth endpoints (also skip preflight and in development)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: {
        error: "Too many authentication attempts, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === "OPTIONS" || isDevelopment
});

// Middlewares
app.use(express.json({ limit: "10mb" })); // Limit payload size
app.use(mongoSanitize()); // 🔒 SECURITY: Sanitize user input against NoSQL injection

// Additional CORS middleware to handle edge cases
// Skip Socket.IO paths - Socket.IO handles its own CORS
app.use((req, res, next) => {
    // Skip Socket.IO paths - let Socket.IO handle its own CORS
    if (req.path.startsWith("/socket.io/")) {
        return next();
    }

    const origin = req.headers.origin;
    const allowedOrigins = [
        process.env.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ].filter(Boolean);

    // Log all requests for debugging
    if (process.env.NODE_ENV !== "production") {
        logger.debug({ message: `Request: ${req.method} ${req.path}`, origin: origin || "none" });
    }

    // Set CORS headers for all requests
    if (origin && allowedOrigins.some(allowed =>
        allowed === origin || allowed.replace(/\/$/, "") === origin.replace(/\/$/, "")
    )) {
        res.header("Access-Control-Allow-Origin", origin);
    }

    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Vary", "Origin"); // Important for caching

    next();
});

// 🔒 SECURITY: Configure CORS properly
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            process.env.FRONTEND_URL,
            "http://localhost:5173", // Development frontend
            "http://127.0.0.1:5173", // Alternative localhost
            "http://localhost:3000", // Alternative React port
            "http://127.0.0.1:3000"  // Alternative React port
        ].filter(Boolean); // Remove undefined values

        // Check if origin is allowed
        const isOriginAllowed = allowedOrigins.some(allowedOrigin => {
            // Exact match
            if (allowedOrigin === origin) return true;
            // Handle cases where origin might have trailing slash
            if (allowedOrigin.replace(/\/$/, "") === origin.replace(/\/$/, "")) return true;
            return false;
        });

        if (isOriginAllowed) {
            callback(null, true);
        } else {
            logger.warn({
                message: "CORS blocked origin",
                origin,
                allowedOrigins: allowedOrigins.join(", ")
            });
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
        "Cache-Control",
        "X-File-Name"
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false // Let CORS handle preflight completely
};

// Apply CORS only to non-Socket.IO paths
// Socket.IO handles its own CORS, so we skip it here
app.use((req, res, next) => {
    // Skip Socket.IO paths - let Socket.IO handle its own CORS
    if (req.path.startsWith("/socket.io/")) {
        return next();
    }
    // Apply CORS to all other paths
    return cors(corsOptions)(req, res, next);
});

// Handle preflight requests explicitly for all routes
// Skip Socket.IO paths - Socket.IO handles its own OPTIONS requests
app.options("*", (req, res) => {
    // Skip Socket.IO paths - let Socket.IO handle its own OPTIONS
    if (req.path.startsWith("/socket.io/")) {
        return res.sendStatus(200);
    }

    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,Accept,Origin,Cache-Control,X-File-Name");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Max-Age", "86400"); // Cache preflight for 24 hours
    res.sendStatus(200);
});

const GOOGLE_SECRET = process.env.GOOGLE_SECRET;
const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER;

// Configure session (store set in startServer after DB/Redis connect)
const sessionConfig = {
    secret: GOOGLE_SECRET,
    resave: false,
    saveUninitialized: false,
    name: "quiz-app-session",
    cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: isProduction ? "none" : "lax"
    }
};

// MongoDB Connection
const PORT = process.env.PORT || 4000;

const startServer = async () => {
    try {
        if (!process.env.MONGO_URI) {
            logger.error("Server Startup Error: MONGO_URI is required");
            process.exit(1);
        }
        if (!GOOGLE_SECRET || String(GOOGLE_SECRET).trim() === "") {
            logger.error("Server Startup Error: GOOGLE_SECRET is required (session signing)");
            process.exit(1);
        }
        if (GOOGLE_SECRET.length < 16) {
            logger.warn("GOOGLE_SECRET should be at least 16 characters for production security");
        }

        // Connect to MongoDB first (needed for MongoStore fallback and app data)
        await mongoose.connect(process.env.MONGO_URI);
        logger.info("Connected to MongoDB");

        // Then try Redis (optional)
        try {
            await connectRedis();
        } catch (redisError) {
            logger.error("Failed to connect to Redis", {
                message: redisError.message,
                code: redisError.code
            });
        }

        // Set session store: Redis in prod if available, else MongoStore in prod, else MemoryStore only in dev
        if (isProduction && redisClient?.isOpen) {
            sessionConfig.store = new RedisStore({
                client: redisClient,
                prefix: "quiz-app:session:",
                ttl: 24 * 60 * 60, // 24 hours in seconds
                disableTouch: true,
            });
            logger.info("✅ Redis session store configured");
        } else if (isProduction) {
            sessionConfig.store = MongoStore.create({
                client: mongoose.connection.getClient(),
                dbName: process.env.MONGO_DB_NAME || undefined,
                collectionName: "sessions",
            });
            logger.info("✅ Mongo session store configured (production, Redis unavailable)");
        } else {
            logger.info("Using MemoryStore for development");
        }

        // Mount session and passport only after store is set (avoids production MemoryStore warning)
        app.use(session(sessionConfig));
        app.use(passport.initialize());
        app.use(passport.session());

        // Test route
        app.get("/ping", (req, res) => {
            res.status(200).send("Server is awake");
        });

        // CORS debug route
        app.get("/debug/cors", (req, res) => {
            const origin = req.headers.origin;
            const allowedOrigins = [
                process.env.FRONTEND_URL,
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000"
            ].filter(Boolean);
            res.json({
                timestamp: new Date().toISOString(),
                origin: origin,
                allowedOrigins: allowedOrigins,
                isOriginAllowed: allowedOrigins.some(allowed =>
                    allowed === origin || allowed.replace(/\/$/, "") === origin.replace(/\/$/, "")
                ),
                headers: req.headers,
                method: req.method
            });
        });

        // API routes
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
        app.use("/api/reviews", reviewRoutes);
        app.use("/api/search", searchRoutes);
        app.use("/api/notifications", notificationRoutes);
        app.use("/api/activity", activityRoutes);

        app.use(errorHandler);
        app.use((req, res) => {
            res.status(404).json({
                error: "Not Found",
                message: `Route ${req.method} ${req.path} not found`,
                timestamp: new Date().toISOString()
            });
        });

        // ===================== START HTTP SERVER WITH SOCKET.IO =====================
        const server = createServer(app);

        // Initialize real-time quiz functionality
        initializeRealTimeQuiz(server);

        server.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            logger.info(`Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
            logger.info("Real-time quiz rooms enabled with Socket.IO");
            logger.info("AI Study Buddy enabled with Gemini API");
        });

        // ===================== DAILY CHALLENGE RESET SCHEDULER =====================
        // Track execution state to prevent overlapping cron jobs
        let isDailyChallengeResetRunning = false;

        // Schedule daily challenge reset every hour (for more frequent checking)
        // This will check and reset challenges that were completed more than 24 hours ago
        // Using async callback and setImmediate to prevent blocking the event loop
        cron.schedule("0 * * * *", () => {
            // Skip if previous execution is still running
            if (isDailyChallengeResetRunning) {
                logger.warn("Daily challenge reset skipped - previous execution still running");
                return;
            }

            // Use setImmediate to yield control back to event loop before starting async work
            setImmediate(async () => {
                isDailyChallengeResetRunning = true;
                logger.info("Running hourly daily challenge reset check...");
                const startTime = Date.now();
                try {
                    // Add timeout to prevent blocking (max 45 seconds)
                    const result = await Promise.race([
                        resetDailyChallenges(),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error("Reset operation timeout after 45 seconds")), 45000)
                        )
                    ]);

                    const duration = Date.now() - startTime;
                    if (result.success && result.usersReset > 0) {
                        logger.info(`Reset completed: ${result.usersReset} users across ${result.challengesModified} challenges (took ${duration}ms)`);
                    } else {
                        logger.debug(`No resets needed (took ${duration}ms)`);
                    }
                } catch (error) {
                    const duration = Date.now() - startTime;
                    logger.error({
                        message: "Error in scheduled daily challenge reset",
                        error: error.message,
                        stack: error.stack,
                        duration
                    });
                } finally {
                    isDailyChallengeResetRunning = false;
                }
            });
        }, {
            scheduled: true,
            timezone: "UTC",
            // Prevent cron from blocking - allow overlapping executions to be skipped
            // The isDailyChallengeResetRunning flag already handles this
        });

        // Also run once at server startup to catch any challenges that should have been reset
        logger.info("Running initial daily challenge reset check...");
        resetDailyChallenges()
            .then(result => {
                if (result.success && result.usersReset > 0) {
                    logger.info(`Startup reset completed: ${result.usersReset} users across ${result.challengesModified} challenges`);
                } else {
                    logger.info("No challenges needed reset at startup");
                }
            })
            .catch(error => {
                logger.error({
                    message: "Error in startup reset",
                    error: error.message,
                    stack: error.stack
                });
            });

        // ===================== USER ONLINE STATUS CLEANUP =====================
        // Track execution state to prevent overlapping cron jobs
        let isOnlineStatusCleanupRunning = false;

        // Mark users as offline if they haven't been seen in 15 minutes
        // Runs every 5 minutes to keep status accurate
        // Using setImmediate to prevent blocking the event loop
        cron.schedule("*/5 * * * *", () => {
            // Skip if previous execution is still running
            if (isOnlineStatusCleanupRunning) {
                logger.debug("Online status cleanup skipped - previous execution still running");
                return;
            }

            // Use setImmediate to yield control back to event loop before starting async work
            setImmediate(async () => {
                isOnlineStatusCleanupRunning = true;
                const startTime = Date.now();
                try {
                    const UserQuiz = (await import("./models/User.js")).default;
                    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

                    // Add timeout to prevent blocking (max 10 seconds)
                    const result = await Promise.race([
                        UserQuiz.updateMany(
                            {
                                isOnline: true,
                                lastSeen: { $lt: fifteenMinutesAgo }
                            },
                            {
                                $set: { isOnline: false }
                            }
                        ),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error("Online status cleanup timeout after 10 seconds")), 10000)
                        )
                    ]);

                    const duration = Date.now() - startTime;
                    if (result.modifiedCount > 0) {
                        logger.debug(`Marked ${result.modifiedCount} users as offline (inactive for 15+ minutes) (took ${duration}ms)`);
                    }
                } catch (error) {
                    const duration = Date.now() - startTime;
                    logger.error({
                        message: "Error updating user online status",
                        error: error.message,
                        stack: error.stack,
                        duration
                    });
                } finally {
                    isOnlineStatusCleanupRunning = false;
                }
            });
        }, {
            scheduled: true,
            timezone: "UTC",
            // Prevent cron from blocking - allow overlapping executions to be skipped
            // The isOnlineStatusCleanupRunning flag already handles this
        });
    } catch (err) {
        logger.error({
            message: "Server Startup Error",
            error: err.message,
            stack: err.stack
        });
        process.exit(1);
    }
};

startServer();
