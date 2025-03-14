import mongoose from "mongoose";

const WrittenQuestionSchema = new mongoose.Schema({
    question: { type: String},
    marks: { type: Number, default: 10 }, // Default marks for a question
});

const WrittenTestSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    duration: { type: Number, default: 0 }, // Will be auto-updated
    totalMarks: { type: Number, default: 0 }, // Auto-calculated
    questions: [WrittenQuestionSchema],
});

const WrittenTest = mongoose.model("WrittenTest", WrittenTestSchema);
export default WrittenTest;