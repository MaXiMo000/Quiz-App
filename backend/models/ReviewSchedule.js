import mongoose from "mongoose";

const reviewScheduleSchema = new mongoose.Schema(
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
    question: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // Note: This references a question within a quiz, not a separate Question model
    },
    // Spaced Repetition Fields
    easinessFactor: {
      type: Number,
      default: 2.5,
    },
    repetitions: {
      type: Number,
      default: 0,
    },
    interval: {
      type: Number, // in days
      default: 0,
    },
    nextReviewDate: {
      type: Date,
      required: true,
    },
    lastReviewedDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

reviewScheduleSchema.index({ user: 1, quiz: 1, question: 1 }, { unique: true });
reviewScheduleSchema.index({ user: 1, nextReviewDate: 1 });

const ReviewSchedule = mongoose.model("ReviewSchedule", reviewScheduleSchema);

export default ReviewSchedule;
