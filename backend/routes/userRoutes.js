import express from "express";
import { registerUser, loginUser, getAllUsers, updateUserRole, updateUserTheme } from "../controllers/userController.js";
import { verifyToken } from "../middleware/auth.js";
import mongoose from "mongoose";

import passport from "passport";
import "../config/passport.js";
import UserQuiz from "../models/User.js"; // Assuming you have a User model

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google OAuth Callback
router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/login" }),
    (req, res) => {
        const { token } = req.user;

        // 🔒 SECURITY: Store user data in session instead of URL
        // Only pass the token through URL, user data retrieved via API call
        const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(`${frontendURL}/google-auth?token=${token}`);
    }
);

router.get("/", verifyToken, getAllUsers); // Protected route

// 🔒 SECURITY: New endpoint to get current user data securely
// IMPORTANT: This must come BEFORE /:id route to avoid "me" being treated as an ID
router.get("/me", verifyToken, async (req, res) => {
    try {
        console.log("📝 /me endpoint called");
        console.log("🔍 Token payload:", req.user);
        console.log("🆔 User ID from token:", req.user?.id);
        console.log("🔢 User ID type:", typeof req.user?.id);
        
        if (!req.user?.id) {
            console.log("❌ No user ID in token");
            return res.status(401).json({ error: "Invalid token - no user ID" });
        }

        // Check if user ID is valid MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
            console.log("❌ Invalid ObjectId format:", req.user.id);
            return res.status(400).json({ error: "Invalid user ID format" });
        }
        
        // First try to find user WITH password to see if user exists at all
        const userWithPassword = await UserQuiz.findById(req.user.id);
        
        if (!userWithPassword) {
            console.log("❌ User not found in database:", req.user.id);
            return res.status(404).json({ error: "User not found" });
        }

        // Now get user without password
        const user = await UserQuiz.findById(req.user.id).select('-password');
        console.log("✅ User found (without password):", user?.email);
        
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            xp: user.xp || 0,
            totalXP: user.totalXP || 0,
            level: user.level || 1,
            loginStreak: user.loginStreak || 0,
            quizStreak: user.quizStreak || 0,
            badges: user.badges || [],
            unlockedThemes: user.unlockedThemes || [],
            selectedTheme: user.selectedTheme || "Default",
        });
    } catch (err) {
        console.error("❌ /me endpoint error:", err);
        console.error("❌ Error stack:", err.stack);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

router.get("/:id", verifyToken, async (req, res) => {
    try {
        const user = await UserQuiz.findById(req.params.id);
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "User not found" });
    }
});

router.patch("/update-role", verifyToken, updateUserRole);
router.post("/:id/theme", verifyToken, updateUserTheme);

export default router;