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
    
    // Phase 2: Intelligence Layer - User preferences and analytics
    preferences: {
        favoriteCategories: { type: [String], default: [] },
        preferredDifficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
        studyTime: { type: String, enum: ["morning", "afternoon", "evening", "night"], default: "afternoon" },
        weakAreas: { type: [String], default: [] },
        strongAreas: { type: [String], default: [] }
    },
    
    // Performance tracking for adaptive difficulty
    performanceHistory: [{
        quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
        category: String,
        difficulty: { type: String, enum: ["easy", "medium", "hard"] },
        score: Number,
        totalQuestions: Number,
        timeSpent: Number, // in seconds
        date: { type: Date, default: Date.now }
    }],
    
    // Smart recommendations tracking
    recommendationHistory: [{
        quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
        reason: String, // e.g., "based_on_category", "difficulty_match", "weakness_improvement"
        recommended: { type: Date, default: Date.now },
        taken: { type: Boolean, default: false },
        takenAt: Date
    }]
}, { timestamps: true });

export default mongoose.model("UserQuiz", userSchema);