// backend/models/XPLog.js (new)
import mongoose from "mongoose";
const xpLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "UserQuiz" },
    xp:   { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
});
export default mongoose.model("XPLog", xpLogSchema);