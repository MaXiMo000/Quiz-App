import express from "express";
import { registerUser, loginUser, getAllUsers, updateUserRole, updateUserTheme } from "../controllers/userController.js";
import { verifyToken } from "../middleware/auth.js";

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

// 🔒 SECURITY: New endpoint to get current user data securely
router.get("/me", verifyToken, async (req, res) => {
    try {
        console.log("📝 /me endpoint called with user ID:", req.user?.id);
        
        if (!req.user?.id) {
            console.log("❌ No user ID in token");
            return res.status(401).json({ error: "Invalid token - no user ID" });
        }

        const user = await UserQuiz.findById(req.user.id).select('-password');
        
        if (!user) {
            console.log("❌ User not found in database:", req.user.id);
            return res.status(404).json({ error: "User not found" });
        }

        console.log("✅ User found:", user.email);
        
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            xp: user.xp || 0,
            level: user.level || 1,
            loginStreak: user.loginStreak || 0,
            badges: user.badges || [],
            unlockedThemes: user.unlockedThemes || [],
            selectedTheme: user.selectedTheme || "Default",
        });
    } catch (err) {
        console.error("❌ /me endpoint error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;