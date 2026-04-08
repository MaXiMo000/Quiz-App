// models/Report.js
import { Schema, model } from "mongoose";

const ReportSchema = new Schema({
    username: { type: String, required: true },
    quizName:   { type: String, required: true },
    /** Mirrors Quiz.category at submit time — used for dynamic topic bucketing */
    quizCategory: { type: String, default: "" },
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", default: null },
    score:      { type: Number, required: true },
    total:      { type: Number, required: true },
    /** Quiz/session difficulty when known (improves timing adjustment) */
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: false },
    questions: [{
        questionText:      { type: String,   required: true },
        options:           { type: [String], required: true }, // ← add this
        userAnswer:        { type: String,   required: true }, // letter
        userAnswerText:    { type: String,   required: true }, // ← add this
        correctAnswer:     { type: String,   required: true }, // letter
        correctAnswerText: { type: String,   required: true },  // ← add this
        answerTime:        { type: Number,   required: true },
        /** Per-question difficulty from quiz (enables weighted timing signal) */
        difficulty:        { type: String, enum: ["easy", "medium", "hard"], required: false },
    }]
}, { timestamps: true });

export default model("Report", ReportSchema);
