import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: false },
    role:     { type: String, enum: ["admin", "user", "premium"], default: "user" },
    badges: { type: [String], default: [] }
}, { timestamps: true });

export default mongoose.model("UserQuiz", userSchema);