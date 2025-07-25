import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import UserQuiz from "../models/User.js";
import XPLog from "../models/XPLog.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// ✅ Load environment variables first
dotenv.config();

// ✅ Load .env variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
const JWT_SECRET = process.env.JWT_SECRET;

// Theme unlocking function (same as in userController)
const unlockThemesForLevel = (user) => {
    const unlockThemeAtLevels = {
        2: "Light",
        3: "Dark",
        5: "Galaxy",
        7: "Forest",
        10: "Sunset",
        15: "Neon",
        4: "material-light",    
        6: "material-dark",
        8: "dracula",
        12: "nord",
        14: "solarized-light",
        16: "solarized-dark",
        18: "monokai",
        20: "one-dark",
        22: "gruvbox-dark",
        24: "gruvbox-light",
        26: "oceanic",
        28: "synthwave",
        30: "night-owl",
        32: "tokyo-night",
        34: "ayu-light"
    };

    for (const [threshold, themeName] of Object.entries(unlockThemeAtLevels)) {
        if (user.level >= Number(threshold) && !user.unlockedThemes.includes(themeName)) {
            user.unlockedThemes.push(themeName);
        }
    }
};

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
                        // Explicitly set default values to ensure they exist
                        xp: 0,
                        totalXP: 0,
                        level: 1,
                        loginStreak: 0,
                        quizStreak: 0,
                        badges: [],
                        unlockedThemes: [],
                        selectedTheme: "Default",
                        lastLogin: null,
                        lastQuizDate: null
                    });
                    await user.save();
                    
                    // Refetch the user to ensure all fields are properly set
                    user = await UserQuiz.findById(user._id);
                }

                // ✅ Apply same daily login XP logic as regular login
                const today = new Date();
                const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
                const lastLoginMidnight = lastLogin ? new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate()) : null;

                // Check if this is a new day (different from last login day)
                const isNewDay = !lastLoginMidnight || todayMidnight.getTime() !== lastLoginMidnight.getTime();

                if (isNewDay) {
                    // Check if it's consecutive day for streak
                    const oneDayAgo = new Date(todayMidnight.getTime() - 24 * 60 * 60 * 1000);
                    
                    if (lastLoginMidnight && lastLoginMidnight.getTime() === oneDayAgo.getTime()) {
                        // Continued streak
                        user.loginStreak += 1;
                    } else {
                        // Reset streak or first login
                        user.loginStreak = 1;
                    }

                    user.lastLogin = new Date();

                    // ✅ Award XP bonus for Google OAuth users too
                    const loginBonusXP = 50;
                    user.xp += loginBonusXP;
                    user.totalXP = (user.totalXP || 0) + loginBonusXP;
                    await new XPLog({ user: user._id, xp: loginBonusXP, source: 'login' }).save();

                    // ✅ Level-up logic (keep total XP, only subtract current level XP)
                    let currentLevelXP = user.xp;
                    let xpForNext = user.level * 100;
                    while (currentLevelXP >= xpForNext) {
                        currentLevelXP -= xpForNext;
                        user.level += 1;
                        xpForNext = user.level * 100;
                        unlockThemesForLevel(user);
                    }
                    user.xp = currentLevelXP; // Set remaining XP for current level

                    // Save the updated user
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
                        xp: user.xp || 0,
                        totalXP: user.totalXP || 0,
                        level: user.level || 1,
                        loginStreak: user.loginStreak || 0,
                        quizStreak: user.quizStreak || 0,
                        badges: user.badges || [],
                        unlockedThemes: user.unlockedThemes || [],
                        selectedTheme: user.selectedTheme || "Default",
                    },
                });
            } catch (err) {
                console.error("Google OAuth error:", err);
                return done(err, null);
            }
        }
    )
);

// ✅ Serialize user
passport.serializeUser((user, done) => {
    done(null, user);
});