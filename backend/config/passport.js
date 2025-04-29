import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import UserQuiz from "../models/User.js";
import jwt from "jsonwebtoken";

// ✅ Load .env variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Debug Logs
console.log("🔍 GOOGLE_CLIENT_ID:", GOOGLE_CLIENT_ID); // Should not be undefined
console.log("🔍 GOOGLE_CLIENT_SECRET:", GOOGLE_CLIENT_SECRET); // Should not be undefined
console.log("🔍 GOOGLE_CALLBACK_URL:", GOOGLE_CALLBACK_URL); // Should not be undefined

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
                        password: "", // Optional: leave blank for Google-auth users
                    });
                    await user.save();
                }

                const token = jwt.sign(
                    { id: user._id, email: user.email, role: user.role },
                    JWT_SECRET,
                    { expiresIn: "1h" }
                );

                return done(null, { token, user });
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