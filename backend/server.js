import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import passport from "passport";
import session from "express-session";
import { RedisStore } from "connect-redis";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import cron from "node-cron";
import { createServer } from "http";

// Phase 1: Infrastructure improvements
import logger from "./utils/logger.js";
import { testConnection as testRedisConnection, redis } from "./config/redis.js";
import { requestLogger, errorLogger, securityLogger, rateLimitLogger } from "./middleware/requestLogger.js";
import ErrorHandler from "./services/errorHandler.js";
import { cache, invalidateCache } from "./middleware/cache.js";

// ✅ Load environment variables before anything else
dotenv.config();

// ✅ Load the passport Google strategy configuration
import "./config/passport.js";

// Route Imports
import userRoutes from "./routes/userRoutes.js";
import apiRoutes from "./routes/api.js";
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

// Import the daily challenge reset function
import { resetDailyChallenges, _resetDailyChallenges } from "./controllers/gamificationController.js";

const app = express();

// Phase 1: Initialize error handling
ErrorHandler.initialize();

// Phase 1: Add logging middleware
app.use(requestLogger);
app.use(securityLogger);
app.use(rateLimitLogger);

// 🔒 SECURITY: Apply security headers
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

// 🔒 SECURITY: Rate limiting (skip for preflight requests)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: "Too many requests from this IP, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for preflight requests
        return req.method === 'OPTIONS';
    }
});

// Apply rate limiting to all requests (except preflight)
app.use(limiter);

// Stricter rate limiting for auth endpoints (also skip preflight)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth requests per windowMs
    message: {
        error: "Too many authentication attempts, please try again later."
    },
    skip: (req) => {
        // Skip rate limiting for preflight requests
        return req.method === 'OPTIONS';
    }
});

// Middlewares
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(mongoSanitize()); // 🔒 SECURITY: Sanitize user input against NoSQL injection

// Additional CORS middleware to handle edge cases
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        process.env.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ].filter(Boolean);

    // Log all requests for debugging (remove in production)
    if (process.env.NODE_ENV !== 'production') {
        logger.http(`${req.method} ${req.path}`, {
            origin: origin || 'none',
            timestamp: new Date().toISOString()
        });
    }

    // Set CORS headers for all requests
    if (origin && allowedOrigins.some(allowed => 
        allowed === origin || allowed.replace(/\/$/, '') === origin.replace(/\/$/, '')
    )) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin'); // Important for caching
    
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
            if (allowedOrigin.replace(/\/$/, '') === origin.replace(/\/$/, '')) return true;
            return false;
        });
        
        if (isOriginAllowed) {
            callback(null, true);
        } else {
            logger.security('CORS blocked origin', {
                blockedOrigin: origin,
                allowedOrigins: allowedOrigins
            });
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'X-File-Name'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false // Let CORS handle preflight completely
};

// Apply CORS before other middleware to avoid interference
app.use(cors(corsOptions));

// Handle preflight requests explicitly for all routes
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin,Cache-Control,X-File-Name');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
    res.sendStatus(200);
});

const GOOGLE_SECRET = process.env.GOOGLE_SECRET;

// Configure session with Redis store for production
// Use the existing redis client from config/redis.js

// Check if Redis is connected before using it for sessions
let sessionStore;
try {
    sessionStore = new RedisStore({ client: redis });
    logger.info('Redis session store initialized successfully');
} catch (error) {
    logger.error('Failed to initialize Redis session store', error);
    // Fallback to memory store for development
    sessionStore = undefined;
}

app.use(session({ 
    store: sessionStore,
    secret: GOOGLE_SECRET, 
    resave: false, 
    saveUninitialized: false, // Don't create session until something stored
    name: 'quiz-app-session', // Custom session name
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true, // Prevent XSS attacks
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Allow cross-site requests in prod
    }
}));
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
            allowed === origin || allowed.replace(/\/$/, '') === origin.replace(/\/$/, '')
        ),
        headers: req.headers,
        method: req.method
    });
}); 

// Phase 1: Enhanced caching and logging for all routes
// Routes with comprehensive caching strategy

// Authentication routes (no caching, rate limited)
app.use("/api/users/login", authLimiter);
app.use("/api/users/register", authLimiter);
app.use("/api/users", userRoutes);

// Core API routes (5-minute cache)
app.use("/api", cache(300), apiRoutes);

// Written tests (10-minute cache - less frequently updated)
app.use("/api/written-tests", cache(600), writtenTestRoutes);

// Analytics (3-minute cache - needs fresh data but can be cached briefly)
app.use("/api/analytics", cache(180), analyticsRoutes);

// Dashboard (5-minute cache - user-specific data)
app.use("/api/dashboard", cache(300), dashboardRoutes);

// Intelligence Layer (5-minute cache)
app.use("/api/intelligence", cache(300), intelligenceRoutes);

// Debug routes (no caching - development only)
app.use("/api/debug", debugRoutes);

// Social & Gamification Routes (3-minute cache)
app.use("/api/social", cache(180), socialRoutes);
app.use("/api/study-groups", cache(180), studyGroupRoutes);
app.use("/api/gamification", cache(180), gamificationRoutes);

// Next-Gen Features (5-minute cache)
app.use("/api/ai-study-buddy", cache(300), aiStudyBuddyRoutes);
app.use("/api/real-time-quiz", cache(300), realTimeQuizRoutes);

// Learning Paths (10-minute cache - stable content)
app.use("/api/learning-paths", cache(600), learningPathRoutes);

// Phase 1: Enhanced error handling
app.use(errorLogger);
app.use(ErrorHandler.expressErrorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString()
    });
});

// MongoDB Connection
const PORT = process.env.PORT || 4000;
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(async () => {
    logger.info("✅ Connected to MongoDB");
    
    // Phase 1: Test Redis connection
    const redisConnected = await testRedisConnection();
    if (redisConnected) {
        logger.info("✅ Redis connection successful");
    } else {
        logger.warn("⚠️ Redis connection failed - caching disabled");
    }
    
    // ===================== START HTTP SERVER WITH SOCKET.IO =====================
    const server = createServer(app);
    
    // Initialize real-time quiz functionality
    initializeRealTimeQuiz(server);
    
    server.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
        logger.info(`🔄 Real-time quiz rooms enabled with Socket.IO`);
        logger.info(`🤖 AI Study Buddy enabled with Gemini API`);
        logger.info(`📊 Phase 1 Infrastructure: Testing, Caching, Logging enabled`);
    });
    
    // ===================== DAILY CHALLENGE RESET SCHEDULER =====================
    // Schedule daily challenge reset every hour (for more frequent checking)
    // This will check and reset challenges that were completed more than 24 hours ago
    cron.schedule('0 * * * *', async () => {
        logger.info('🔄 Running hourly daily challenge reset check...');
        try {
            const result = await _resetDailyChallenges();
            if (result.success && result.usersReset > 0) {
                logger.info(`✅ Reset completed: ${result.usersReset} users across ${result.challengesModified} challenges`);
            }
        } catch (error) {
            logger.error('❌ Error in scheduled reset:', error);
        }
    });
    
    // Also run once at server startup to catch any challenges that should have been reset
    // Wait a bit for MongoDB connection to be fully established
    setTimeout(async () => {
        logger.info('🚀 Running initial daily challenge reset check...');
        try {
            const result = await _resetDailyChallenges();
            if (result.success && result.usersReset > 0) {
                logger.info(`✅ Startup reset completed: ${result.usersReset} users across ${result.challengesModified} challenges`);
            } else {
                logger.info('📝 No challenges needed reset at startup');
            }
        } catch (error) {
            logger.error('❌ Error in startup reset:', error);
        }
    }, 2000); // Wait 2 seconds for MongoDB to be fully ready
})
.catch((err) => logger.error("❌ MongoDB Connection Error:", err));