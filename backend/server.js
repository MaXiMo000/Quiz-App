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

// Import the daily challenge reset function
import { resetDailyChallenges } from "./controllers/gamificationController.js";
import { connectRedis, redisClient } from "./config/redis.js";
import { RedisStore } from "connect-redis";
import logger from "./utils/logger.js";

const app = express();

// 🔒 PRODUCTION: Trust proxy for Render/Heroku deployment
// This is required for express-rate-limit to work correctly behind a proxy
if (process.env.RENDER || process.env.NODE_ENV === "production") {
    app.set("trust proxy", true);
    logger.info("Trust proxy enabled for production deployment");
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
    max: 20, // ✅ PRODUCTION: Increased to 20 auth requests per 15 minutes (~1.3/min) - allows legitimate retries
    message: {
        error: "Too many authentication attempts, please try again later."
    },
    skip: (req) => {
        // Skip rate limiting for preflight requests and in development
        return req.method === "OPTIONS" || isDevelopment;
    }
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

// Configure session with Redis store for production
const sessionConfig = {
    secret: GOOGLE_SECRET,
    resave: false,
    saveUninitialized: false, // Don't create session until something stored
    name: "quiz-app-session", // Custom session name
    cookie: {
        secure: process.env.NODE_ENV === "production", // Use secure cookies in production
        httpOnly: true, // Prevent XSS attacks
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax" // Allow cross-site requests in prod
    }
};

// Use Redis store in production, MemoryStore in development
// IMPORTANT: RedisStore will be set after Redis connection is established
// This prevents errors if Redis is unavailable at startup
let useRedisStore = false;
if (process.env.NODE_ENV === "production" || process.env.RENDER) {
    // Will be set after Redis connection is verified
    useRedisStore = true;
    logger.info("Redis session store will be configured after connection");
} else {
    logger.info("Using MemoryStore for development");
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Test Route
app.get("/ping", (req, res) => {
    res.status(200).send("Server is awake");
});

// CORS Debug Route (remove in production)
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

// Routes
app.use("/api/users/login", authLimiter); // Apply auth rate limiting
app.use("/api/users/register", authLimiter); // Apply auth rate limiting
app.use("/api/users", userRoutes);
app.use("/api", apiRoutes);
app.use("/api/written-tests", writtenTestRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/intelligence", intelligenceRoutes); // Phase 2: Intelligence Layer
app.use("/api/debug", debugRoutes); // Temporary debug routes - REMOVE IN PRODUCTION

// Phase 3: Social & Gamification Routes
app.use("/api/social", socialRoutes);
app.use("/api/study-groups", studyGroupRoutes);
app.use("/api/gamification", gamificationRoutes);

// Phase 4: Next-Gen Features
app.use("/api/ai-study-buddy", aiStudyBuddyRoutes);
app.use("/api/real-time-quiz", realTimeQuizRoutes);

// Phase 5: Advanced Learning Path Engine
app.use("/api/learning-paths", learningPathRoutes);
app.use("/api/reviews", reviewRoutes);

// Global error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: "Not Found",
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString()
    });
});

// MongoDB Connection
const PORT = process.env.PORT || 4000;

const startServer = async () => {
    try {
        // Connect Redis first (but don't fail if unavailable)
        let redisConnected = false;
        try {
            await connectRedis();
            redisConnected = true;

            // Configure Redis session store if Redis is connected and in production
            if (useRedisStore && redisClient && redisClient.isOpen) {
                // Update session config with Redis store
                sessionConfig.store = new RedisStore({
                    client: redisClient,
                    prefix: "quiz-app:session:",
                    ttl: 24 * 60 * 60, // 24 hours in seconds
                    disableTouch: true, // Improve performance
                });
                logger.info("✅ Redis session store configured successfully");
            } else if (useRedisStore) {
                logger.warn("⚠️ Redis not available - falling back to MemoryStore (sessions won't persist across restarts)");
            }
        } catch (redisError) {
            logger.error("Failed to connect to Redis", {
                message: redisError.message,
                code: redisError.code
            });
            if (useRedisStore) {
                logger.warn("⚠️ Falling back to MemoryStore for sessions (Redis unavailable)");
            }
            redisConnected = false;
        }

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        logger.info("Connected to MongoDB");

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
        cron.schedule("0 * * * *", () => {
            // Skip if previous execution is still running
            if (isDailyChallengeResetRunning) {
                logger.warn("Daily challenge reset skipped - previous execution still running");
                return;
            }

            // Use process.nextTick to defer execution and prevent blocking
            process.nextTick(async () => {
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
            timezone: "UTC"
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
        cron.schedule("*/5 * * * *", () => {
            // Skip if previous execution is still running
            if (isOnlineStatusCleanupRunning) {
                logger.debug("Online status cleanup skipped - previous execution still running");
                return;
            }

            // Use process.nextTick to defer execution and prevent blocking
            process.nextTick(async () => {
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
            timezone: "UTC"
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
