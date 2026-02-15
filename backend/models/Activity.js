import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserQuiz",
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: [
            "quiz_completed",
            "achievement_earned",
            "challenge_completed",
            "friend_added",
            "level_up",
            "bookmark_added",
            "report_viewed"
        ],
        required: true,
        index: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

// Compound indexes for efficient queries
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, type: 1, createdAt: -1 });

export default mongoose.model("Activity", activitySchema);
