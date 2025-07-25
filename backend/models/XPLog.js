// backend/models/XPLog.js (new)
import mongoose from "mongoose";
const xpLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "UserQuiz", required: true },
    xp:   { type: Number, default: 0, required: true },
    date: { type: Date, default: Date.now },
    source: { type: String, enum: ['quiz', 'login', 'streak', 'bonus'], default: 'quiz' }
});
export default mongoose.model("XPLog", xpLogSchema);