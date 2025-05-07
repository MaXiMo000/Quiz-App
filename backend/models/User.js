import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: false },
    role:     { type: String, enum: ["admin", "user", "premium"], default: "user" },
    badges: { type: [String], default: [] },
    xp:       { type: Number, default: 0 },          // total XP
    totalXP: { type: Number, default: 0 },
    level:    { type: Number, default: 1 },          // current level
    loginStreak:   { type: Number, default: 0 },     // consecutive login days
    lastLogin:     { type: Date,   default: null },  // last login date
    quizStreak:    { type: Number, default: 0 },     // consecutive quiz days
    lastQuizDate:  { type: Date,   default: null },  // last quiz date
    unlockedThemes:{ type: [String], default: [] },   // unlocked UI themes
    selectedTheme: { type: String, default: "Default" }, // selected UI theme
}, { timestamps: true });

export default mongoose.model("UserQuiz", userSchema);