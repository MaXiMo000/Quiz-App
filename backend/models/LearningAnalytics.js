import mongoose from "mongoose";

const learningAnalyticsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    metrics: {
      engagement: {
        type: Number, // e.g., time spent on quiz
        default: 0,
      },
      comprehension: {
        type: Number, // e.g., score
        default: 0,
      },
      retention: {
        type: Number, // e.g., score on review
        default: 0,
      },
    },
    // Add more fields as needed for advanced analytics
  },
  { timestamps: true }
);

learningAnalyticsSchema.index({ user: 1, quiz: 1 }, { unique: true });

const LearningAnalytics = mongoose.model(
  "LearningAnalytics",
  learningAnalyticsSchema
);

export default LearningAnalytics;
