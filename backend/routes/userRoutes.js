import express from "express";
import { registerUser, loginUser, getAllUsers, updateUserRole } from "../controllers/userController.js";
import { verifyToken } from "../middleware/auth.js";

import passport from "passport";
import "../config/passport.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", verifyToken, getAllUsers); // Protected route
router.patch("/update-role", verifyToken, updateUserRole);

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google OAuth Callback
router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/login" }),
    (req, res) => {
        const { token, user } = req.user;

        // Redirect with JWT and user info as query
        const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(`${frontendURL}/google-auth?token=${token}&name=${user.name}&email=${user.email}&role=${user.role}`);
    }
);

export default router;