import mongoose from "mongoose";

// Learning Node Schema - represents a skill or concept
const learningNodeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    type: { 
        type: String, 
        enum: ["concept", "skill", "milestone", "assessment", "project"],
        default: "concept"
    },
    difficulty: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "expert"],
        default: "beginner"
    },
    prerequisites: [{ type: String }], // Array of node IDs
    estimatedTime: { type: Number, default: 30 }, // minutes
    resources: [{
        type: { type: String, enum: ["quiz", "video", "article", "exercise"] },
        id: { type: mongoose.Schema.Types.ObjectId },
        title: { type: String },
        url: { type: String }
    }],
    competencies: [{ type: String }], // Skills developed
    position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 }
    }
});

// Learning Path Schema
const learningPathSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    subject: { type: String, required: true },
    
    // Path metadata
    level: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "expert"],
        default: "beginner"
    },
    estimatedDuration: { type: Number }, // total hours
    tags: [{ type: String }],
    
    // Learning nodes and structure
    nodes: [learningNodeSchema],
    
    // Learning objectives
    objectives: [{
        id: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String },
        measurable: { type: Boolean, default: true },
        targetScore: { type: Number, default: 80 }, // percentage
        priority: { type: Number, default: 1 } // 1-5 scale
    }],
    
    // Path statistics
    stats: {
        totalLearners: { type: Number, default: 0 },
        averageCompletion: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 },
        totalRatings: { type: Number, default: 0 }
    },
    
    // Path settings
    isPublic: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    adaptiveEnabled: { type: Boolean, default: true },
    
    // Creator info
    createdBy: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "UserQuiz" },
        name: { type: String }
    }
}, { timestamps: true });

// User Progress on Learning Paths
const userPathProgressSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "UserQuiz", required: true },
    learningPath: { type: mongoose.Schema.Types.ObjectId, ref: "LearningPath", required: true },
    
    // Overall progress
    status: {
        type: String,
        enum: ["not_started", "in_progress", "completed", "paused"],
        default: "not_started"
    },
    overallProgress: { type: Number, default: 0 }, // percentage
    timeSpent: { type: Number, default: 0 }, // minutes
    
    // Node progress
    nodeProgress: [{
        nodeId: { type: String, required: true },
        status: {
            type: String,
            enum: ["locked", "available", "in_progress", "completed", "mastered"],
            default: "locked"
        },
        completionDate: { type: Date },
        timeSpent: { type: Number, default: 0 },
        attempts: { type: Number, default: 0 },
        bestScore: { type: Number, default: 0 },
        mastery: { type: Number, default: 0 }, // 0-100 mastery level
        
        // Spaced repetition data
        nextReviewDate: { type: Date },
        reviewCount: { type: Number, default: 0 },
        easeFactor: { type: Number, default: 2.5 },
        interval: { type: Number, default: 1 } // days
    }],
    
    // Objective progress
    objectiveProgress: [{
        objectiveId: { type: String, required: true },
        completed: { type: Boolean, default: false },
        currentScore: { type: Number, default: 0 },
        completionDate: { type: Date }
    }],
    
    // Learning analytics
    analytics: {
        strengths: [{ type: String }],
        weaknesses: [{ type: String }],
        learningVelocity: { type: Number, default: 1 }, // multiplier
        retentionRate: { type: Number, default: 0.8 },
        preferredDifficulty: { type: String, default: "medium" },
        studyPattern: {
            optimalSessionLength: { type: Number, default: 30 },
            preferredTimeOfDay: { type: String, default: "afternoon" },
            breakFrequency: { type: Number, default: 15 } // minutes
        }
    },
    
    // Adaptive recommendations
    recommendations: [{
        type: {
            type: String,
            enum: ["review", "advance", "practice", "break", "difficulty_adjust"]
        },
        message: { type: String },
        priority: { type: Number, default: 1 },
        expiresAt: { type: Date },
        acted: { type: Boolean, default: false }
    }],
    
    // Path customization
    personalizedPath: [{
        nodeId: { type: String },
        customOrder: { type: Number },
        adaptedDifficulty: { type: String },
        additionalResources: [{ type: String }]
    }]
}, { timestamps: true });

// Competency Tracking
const competencySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    description: { type: String },
    level: {
        type: String,
        enum: ["foundational", "intermediate", "advanced", "expert"],
        default: "foundational"
    },
    prerequisites: [{ type: String }], // Other competency names
    
    // Measurement criteria
    assessmentCriteria: [{
        criterion: { type: String, required: true },
        weight: { type: Number, default: 1 },
        measurableAction: { type: String }
    }],
    
    // Related learning paths
    relatedPaths: [{ type: mongoose.Schema.Types.ObjectId, ref: "LearningPath" }]
}, { timestamps: true });

// User Competency Progress
const userCompetencySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "UserQuiz", required: true },
    competency: { type: mongoose.Schema.Types.ObjectId, ref: "Competency", required: true },
    
    // Proficiency tracking
    currentLevel: { type: Number, default: 0 }, // 0-100 scale
    targetLevel: { type: Number, default: 80 },
    masteryDate: { type: Date },
    
    // Evidence of competency
    evidence: [{
        type: {
            type: String,
            enum: ["quiz_score", "project", "peer_review", "self_assessment"]
        },
        score: { type: Number },
        source: { type: String },
        date: { type: Date, default: Date.now },
        verified: { type: Boolean, default: false }
    }],
    
    // Learning history
    learningHistory: [{
        activity: { type: String },
        improvement: { type: Number }, // points gained
        date: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

export const LearningPath = mongoose.model("LearningPath", learningPathSchema);
export const UserPathProgress = mongoose.model("UserPathProgress", userPathProgressSchema);
export const Competency = mongoose.model("Competency", competencySchema);
export const UserCompetency = mongoose.model("UserCompetency", userCompetencySchema);
