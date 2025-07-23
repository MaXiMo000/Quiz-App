import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import UserQuiz from "../models/User.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// ✅ Load environment variables first
dotenv.config();

// ✅ Load .env variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
const JWT_SECRET = process.env.JWT_SECRET;

// 🔒 SECURITY: Validate required environment variables
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL || !JWT_SECRET) {
    console.error("❌ Missing required environment variables:");
    console.error("GOOGLE_CLIENT_ID:", GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Missing");
    console.error("GOOGLE_CLIENT_SECRET:", GOOGLE_CLIENT_SECRET ? "✅ Set" : "❌ Missing");
    console.error("GOOGLE_CALLBACK_URL:", GOOGLE_CALLBACK_URL ? "✅ Set" : "❌ Missing");
    console.error("JWT_SECRET:", JWT_SECRET ? "✅ Set" : "❌ Missing");
    throw new Error("Missing required environment variables for Google OAuth");
}

// ✅ Google Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;
                let user = await UserQuiz.findOne({ email });

                if (!user) {
                    user = new UserQuiz({
                        name: profile.displayName,
                        email: email,
                        role: "user",
                    });
                    await user.save();
                }

                const token = jwt.sign(
                    { id: user._id, email: user.email, role: user.role },
                    JWT_SECRET,
                    { expiresIn: "1h" }
                );

                return done(null, {
                    token,
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        xp: user.xp,
                        level: user.level,
                        loginStreak: user.loginStreak,
                        badges: user.badges || [],
                        unlockedThemes: user.unlockedThemes || [],
                        selectedTheme: user.selectedTheme || "Default",
                    },
                });
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

// ✅ Serialize user
passport.serializeUser((user, done) => {
    done(null, user);
});