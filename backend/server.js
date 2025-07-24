import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import passport from "passport";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";

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

const app = express();

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
        console.log(`📝 ${req.method} ${req.path} - Origin: ${origin || 'none'} - Time: ${new Date().toISOString()}`);
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
            console.log(`CORS blocked origin: ${origin}`);
            console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
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

// Configure session with proper settings
app.use(session({ 
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

// Routes
app.use("/api/users/login", authLimiter); // Apply auth rate limiting
app.use("/api/users/register", authLimiter); // Apply auth rate limiting
app.use("/api/users", userRoutes);
app.use("/api", apiRoutes);
app.use("/api/written-tests", writtenTestRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", dashboardRoutes);

// Global error handler for CORS and other issues
app.use((error, req, res, next) => {
    // Handle CORS errors specifically
    if (error.message === 'Not allowed by CORS') {
        console.log(`❌ CORS Error - Origin: ${req.headers.origin}, Method: ${req.method}, Path: ${req.path}`);
        return res.status(403).json({
            error: 'CORS Error',
            message: 'Origin not allowed',
            origin: req.headers.origin,
            timestamp: new Date().toISOString()
        });
    }
    
    // Handle other errors
    console.error('❌ Server Error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

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
.then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})
.catch((err) => console.error("❌ MongoDB Connection Error:", err));