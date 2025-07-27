import mongoose from "mongoose";

const tournamentSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 1000 },
    category: { type: String, default: 'General' }, // Tournament category
    type: { 
        type: String, 
        enum: ["single_elimination", "round_robin", "time_based", "seasonal"],
        default: "time_based"
    },
    
    // Tournament settings
    settings: {
        maxParticipants: { type: Number, default: 100 },
        entryFee: { type: Number, default: 0 }, // XP cost to enter
        duration: { type: Number, required: true }, // in hours
        quizCategory: { type: String },
        difficulty: { type: String, enum: ["easy", "medium", "hard", "mixed"], default: "mixed" },
        questionsPerRound: { type: Number, default: 10 },
        timeLimit: { type: Number, default: 300 } // Time limit per quiz in seconds
    },
    
    // Quiz references for the tournament
    quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }],
    
    // Tournament schedule
    registrationStart: { type: Date, required: true },
    registrationEnd: { type: Date, required: true },
    tournamentStart: { type: Date, required: true },
    tournamentEnd: { type: Date, required: true },
    
    // Participants
    participants: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "UserQuiz" },
        registeredAt: { type: Date, default: Date.now },
        currentScore: { type: Number, default: 0 },
        totalTime: { type: Number, default: 0 }, // in seconds
        quizzesCompleted: { type: Number, default: 0 },
        rank: { type: Number, default: 0 },
        eliminated: { type: Boolean, default: false },
        completedQuizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }], // Track completed quizzes
        quizScores: [{
            quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
            score: { type: Number },
            percentage: { type: Number },
            timeSpent: { type: Number },
            completedAt: { type: Date, default: Date.now }
        }]
    }],
    
    // Prize structure
    prizes: [{
        position: { type: Number }, // 1st, 2nd, 3rd place
        xp: { type: Number, default: 0 },
        badge: { type: String },
        theme: { type: String },
        title: { type: String } // Special title for winner
    }],
    
    // Tournament status
    status: {
        type: String,
        enum: ["upcoming", "registration_open", "in_progress", "completed", "cancelled"],
        default: "upcoming"
    },
    
    // Tournament stats
    stats: {
        totalParticipants: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
        highestScore: { type: Number, default: 0 },
        winner: { type: mongoose.Schema.Types.ObjectId, ref: "UserQuiz" }
    },
    
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "UserQuiz", 
        required: true 
    },
    
    // Seasonal tournament specific
    season: { type: String }, // "Spring 2025", "Holiday Special", etc.
    theme: { type: String } // Visual theme for the tournament
}, { timestamps: true });

export default mongoose.model("Tournament", tournamentSchema);
