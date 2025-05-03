import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import passport from "passport";
import session from "express-session";

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

// Middlewares
app.use(express.json());
app.use(cors());

const GOOGLE_SECRET = process.env.GOOGLE_SECRET;

app.use(session({ secret: GOOGLE_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());

// Test Route
app.get("/ping", (req, res) => {
    res.status(200).send("Server is awake");
}); 

// Routes
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