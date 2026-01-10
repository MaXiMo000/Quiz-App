import mongoose from "mongoose";

const groupChallengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  participatingGroups: [{
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyGroup",
    },
    score: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
    },
  }],
  status: {
    type: String,
    enum: ["upcoming", "active", "completed"],
    default: "upcoming",
  },
}, {
  timestamps: true,
});

const GroupChallenge = mongoose.model("GroupChallenge", groupChallengeSchema);

export default GroupChallenge;
