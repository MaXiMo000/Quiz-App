import mongoose from "mongoose";

const studyGroupSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    creator: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "UserQuiz", 
        required: true 
    },
    members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "UserQuiz" },
        role: { type: String, enum: ["admin", "moderator", "member"], default: "member" },
        joinedAt: { type: Date, default: Date.now }
    }],
    isPrivate: { type: Boolean, default: false },
    maxMembers: { type: Number, default: 50, min: 2, max: 100 },
    category: { type: String }, // e.g., "Math", "Science", "General"
    tags: [{ type: String }],
    
    // Group statistics
    stats: {
        totalQuizzes: { type: Number, default: 0 },
        totalSessions: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
        mostActiveDay: { type: String, default: "Monday" }
    },
    
    // Study sessions and activities
    activities: [{
        type: { type: String, enum: ["quiz_shared", "member_joined", "member_left", "quiz_completed", "challenge_created"] },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "UserQuiz" },
        details: { type: mongoose.Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now }
    }],
    
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("StudyGroup", studyGroupSchema);
