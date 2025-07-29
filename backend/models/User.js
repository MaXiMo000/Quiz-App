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
    
    // Intelligence tracking for AI features
    intelligence: {
        weakAreas: { type: [String], default: [] },
        strongAreas: { type: [String], default: [] },
        learningStyle: { type: String, enum: ["visual", "auditory", "kinesthetic", "reading"], default: "visual" },
        adaptiveDifficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
        lastAnalyzed: { type: Date, default: Date.now }
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
    }],
    
    // Phase 3: Social Features
    social: {
        // Friends system
        friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserQuiz" }],
        friendRequests: {
            sent: [{ type: mongoose.Schema.Types.ObjectId, ref: "Friend" }],
            received: [{ type: mongoose.Schema.Types.ObjectId, ref: "Friend" }]
        },
        
        // Study groups
        studyGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "StudyGroup" }],
        
        // Social stats
        socialStats: {
            quizzesShared: { type: Number, default: 0 },
            groupsCreated: { type: Number, default: 0 },
            challengesWon: { type: Number, default: 0 },
            tournamentsParticipated: { type: Number, default: 0 },
            tournamentsWon: { type: Number, default: 0 },
            multiplayerGames: { type: Number, default: 0 },
            multiplayerWins: { type: Number, default: 0 }
        },
        
        // Privacy settings
        privacy: {
            profileVisibility: { type: String, enum: ["public", "friends", "private"], default: "public" },
            showOnlineStatus: { type: Boolean, default: true },
            allowFriendRequests: { type: Boolean, default: true },
            showProgressToFriends: { type: Boolean, default: true }
        }
    },
    
    // Phase 3: Advanced Gamification
    gamification: {
        // Skill trees
        skillTrees: {
            mathMaster: {
                level: { type: Number, default: 0 },
                xp: { type: Number, default: 0 },
                unlockedSkills: [{ type: String }]
            },
            scienceGuru: {
                level: { type: Number, default: 0 },
                xp: { type: Number, default: 0 },
                unlockedSkills: [{ type: String }]
            },
            historyBuff: {
                level: { type: Number, default: 0 },
                xp: { type: Number, default: 0 },
                unlockedSkills: [{ type: String }]
            },
            languageLord: {
                level: { type: Number, default: 0 },
                xp: { type: Number, default: 0 },
                unlockedSkills: [{ type: String }]
            }
        },
        
        // Daily challenges progress
        dailyChallenges: {
            current: { type: mongoose.Schema.Types.ObjectId, ref: "DailyChallenge" },
            completed: [{ type: mongoose.Schema.Types.ObjectId, ref: "DailyChallenge" }],
            streak: { type: Number, default: 0 },
            lastCompleted: { type: Date }
        },
        
        // Tournaments
        tournaments: {
            participating: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tournament" }],
            completed: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tournament" }],
            wins: { type: Number, default: 0 },
            totalParticipations: { type: Number, default: 0 }
        },
        
        // Special titles earned
        titles: [{
            name: { type: String },
            description: { type: String },
            earnedAt: { type: Date, default: Date.now },
            rarity: { type: String, enum: ["common", "rare", "epic", "legendary"], default: "common" }
        }],
        
        // Current equipped title
        activeTitle: { type: String }
    },
    
    // Activity status
    lastSeen: { type: Date, default: Date.now },
    isOnline: { type: Boolean, default: false },
    
    // AI Study Buddy features
    studyPlans: [{
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
        source: { type: String, enum: ["ai_generated", "manual", "template"], default: "ai_generated" },
        completedTasks: [{ type: String }],
        progress: { type: Number, default: 0 } // percentage completed
    }],
    
    reminders: [{
        text: { type: String, required: true },
        context: { type: String, default: "general" },
        createdAt: { type: Date, default: Date.now },
        scheduledFor: { type: Date },
        isActive: { type: Boolean, default: true },
        source: { type: String, enum: ["ai_study_buddy", "manual", "system"], default: "manual" },
        notificationSent: { type: Boolean, default: false }
    }]
}, { timestamps: true });

export default mongoose.model("UserQuiz", userSchema);