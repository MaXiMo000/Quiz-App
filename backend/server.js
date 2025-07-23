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

// 🔒 SECURITY: Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: "Too many requests from this IP, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to all requests
app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth requests per windowMs
    message: {
        error: "Too many authentication attempts, please try again later."
    }
});

// Middlewares
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(mongoSanitize()); // 🔒 SECURITY: Sanitize user input against NoSQL injection

// 🔒 SECURITY: Configure CORS properly
const corsOptions = {
    origin: [
        process.env.FRONTEND_URL,
        "http://localhost:5173", // Development frontend
        "http://127.0.0.1:5173"  // Alternative localhost
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

const GOOGLE_SECRET = process.env.GOOGLE_SECRET;

app.use(session({ secret: GOOGLE_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());

// Test Route
app.get("/ping", (req, res) => {
    res.status(200).send("Server is awake");
}); 

// Routes
app.use("/api/users/login", authLimiter); // Apply auth rate limiting
app.use("/api/users/register", authLimiter); // Apply auth rate limiting
app.use("/api/users", userRoutes);
app.use("/api", apiRoutes);
app.use("/api/written-tests", writtenTestRoutes);
app.use("/api/analytics", analyticsRoutes);

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