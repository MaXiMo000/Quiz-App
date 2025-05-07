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
        const { token, user } = req.user;

        // Redirect with JWT and user info as query
        const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(`${frontendURL}/google-auth?token=${token}&_id=${user._id}&name=${user.name}&email=${user.email}&role=${user.role}`);
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

export default router;