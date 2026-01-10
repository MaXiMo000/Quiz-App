import mongoose from "mongoose";

const studySessionSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StudyGroup",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  scheduledTime: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number, // in minutes
    required: true,
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  resources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz", // or other resource types
  }],
  status: {
    type: String,
    enum: ["scheduled", "in_progress", "completed", "canceled"],
    default: "scheduled",
  },
}, {
  timestamps: true,
});

const StudySession = mongoose.model("StudySession", studySessionSchema);

export default StudySession;
