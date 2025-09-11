import mongoose from "mongoose";

const cognitiveMetricsSchema = new mongoose.Schema(
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
      responseTime: {
        type: Number, // in seconds
        default: 0,
      },
      fatigueScore: {
        type: Number, // 0-1
        default: 0,
      },
      // Add more fields as needed for cognitive metrics
    },
  },
  { timestamps: true }
);

cognitiveMetricsSchema.index({ user: 1, quiz: 1 }, { unique: true });

const CognitiveMetrics = mongoose.model(
  "CognitiveMetrics",
  cognitiveMetricsSchema
);

export default CognitiveMetrics;
