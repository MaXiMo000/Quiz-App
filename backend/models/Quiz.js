import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    question:      { type: String, required: true },
    options:       [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "medium"
    }
});

const quizSchema = new mongoose.Schema({
    title:         { type: String, required: true },
    category:      { type: String },
    totalMarks:    { type: Number, default: 0 },
    passingMarks:  { type: Number, default: 0 },
    duration:      { type: Number, default: 0 },  // in minutes
    questions:     [questionSchema],
    createdBy: {
        _id:  { type: mongoose.Schema.Types.ObjectId, ref: "UserQuiz", default: null },
        name: { type: String, default: "admin" }
    },
    
    // Phase 2: Intelligence Layer - Enhanced quiz metadata
    tags: [{ type: String }], // For better categorization
    averageScore: { type: Number, default: 0 },
    totalAttempts: { type: Number, default: 0 },
    averageTime: { type: Number, default: 0 }, // in seconds
    popularityScore: { type: Number, default: 0 }, // Based on attempts and ratings
    
    // Difficulty distribution
    difficultyDistribution: {
        easy: { type: Number, default: 0 },
        medium: { type: Number, default: 0 },
        hard: { type: Number, default: 0 }
    },
    
    // Recommended for (auto-populated based on performance data)
    recommendedFor: {
        categories: [{ type: String }],
        skillLevels: [{ type: String, enum: ["beginner", "intermediate", "advanced"] }],
        weakAreas: [{ type: String }]
    }
}, { timestamps: true });

export default mongoose.model("Quiz", quizSchema);