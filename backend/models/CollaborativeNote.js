import mongoose from "mongoose";

const collaborativeNoteSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StudyGroup",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    default: "",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  editHistory: [{
    editor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    editedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

const CollaborativeNote = mongoose.model("CollaborativeNote", collaborativeNoteSchema);

export default CollaborativeNote;
