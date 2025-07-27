import mongoose from "mongoose";

const friendSchema = new mongoose.Schema({
    requester: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "UserQuiz", 
        required: true 
    },
    recipient: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "UserQuiz", 
        required: true 
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "declined", "blocked"],
        default: "pending"
    },
    requestDate: { type: Date, default: Date.now },
    responseDate: { type: Date }
}, { timestamps: true });

// Ensure a user can't send multiple friend requests to the same person
friendSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export default mongoose.model("Friend", friendSchema);
