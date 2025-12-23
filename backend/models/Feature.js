import mongoose from "mongoose";

const featureSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // e.g., "analytics", "white-label"
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String, enum: ["core", "advanced", "enterprise"], default: "core" },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Feature", featureSchema);
