import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // e.g., "Free", "Pro", "Enterprise"
    price: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    duration: { type: Number, default: 30 }, // in days

    // Limits
    limits: {
        users: { type: Number, default: 50 }, // -1 for unlimited
        quizzes: { type: Number, default: 10 },
        storage: { type: Number, default: 100 } // MB
    },

    // Features enabled
    features: [{ type: String }],

    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Subscription", subscriptionSchema);
