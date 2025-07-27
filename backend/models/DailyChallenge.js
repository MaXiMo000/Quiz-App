import mongoose from "mongoose";

const dailyChallengeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { 
        type: String, 
        enum: ["quiz_completion", "score_target", "streak_maintenance", "category_focus", "speed_challenge"],
        required: true 
    },
    
    // Challenge parameters
    parameters: {
        targetScore: { type: Number }, // For score_target
        quizCategory: { type: String }, // For category_focus
        timeLimit: { type: Number }, // For speed_challenge (in seconds)
        streakDays: { type: Number }, // For streak_maintenance
        quizCount: { type: Number } // For quiz_completion
    },
    
    // Quiz references for the challenge
    quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }],
    timeLimit: { type: Number, default: 300 }, // Time limit per quiz in seconds
    
    // Rewards
    rewards: {
        xp: { type: Number, default: 100 },
        badge: { type: String }, // Optional badge reward
        theme: { type: String } // Optional theme unlock
    },
    
    // Challenge period
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    
    // Participants and completions
    participants: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "UserQuiz" },
        progress: { type: Number, default: 0 }, // Progress percentage
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
        attempts: { type: Number, default: 0 },
        completedQuizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }], // Track completed quizzes
        quizScores: [{
            quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
            score: { type: Number },
            percentage: { type: Number },
            timeSpent: { type: Number },
            completedAt: { type: Date, default: Date.now }
        }]
    }],
    
    // Challenge statistics
    stats: {
        totalParticipants: { type: Number, default: 0 },
        completionRate: { type: Number, default: 0 },
        averageAttempts: { type: Number, default: 0 }
    }
}, { timestamps: true });

export default mongoose.model("DailyChallenge", dailyChallengeSchema);
