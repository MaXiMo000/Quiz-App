import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }, // For subdomain or URL
    domain: { type: String }, // Custom domain
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "UserQuiz", required: true },

    // Subscription
    subscription: {
        plan: { type: String, enum: ["free", "pro", "enterprise"], default: "free" },
        status: { type: String, enum: ["active", "inactive", "cancelled", "past_due"], default: "active" },
        startDate: { type: Date, default: Date.now },
        endDate: { type: Date },
        stripeCustomerId: { type: String },
        stripeSubscriptionId: { type: String }
    },

    // Branding (White-label)
    branding: {
        logoUrl: { type: String },
        primaryColor: { type: String, default: "#007bff" },
        secondaryColor: { type: String, default: "#6c757d" },
        fontFamily: { type: String, default: "Roboto" },
        customCss: { type: String }
    },

    // Settings
    settings: {
        allowPublicRegistration: { type: Boolean, default: true },
        defaultUserRole: { type: String, enum: ["user", "student"], default: "user" },
        features: [{ type: String }] // Enabled features
    }
}, { timestamps: true });

export default mongoose.model("Organization", organizationSchema);
