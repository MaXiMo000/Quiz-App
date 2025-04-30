import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    question:      { type: String, required: true },
    options:       [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "medium"
    }
});

const quizSchema = new mongoose.Schema({
    title:         { type: String, required: true },
    category:      { type: String },
    totalMarks:    { type: Number, default: 0 },
    passingMarks:  { type: Number, default: 0 },
    duration:      { type: Number, default: 0 },  // in minutes
    questions:     [questionSchema],
    createdBy: {
        _id:  { type: mongoose.Schema.Types.ObjectId, ref: "UserQuiz", default: null },
        name: { type: String, default: "Admin" }
    }
}, { timestamps: true });

export default mongoose.model("Quiz", quizSchema);