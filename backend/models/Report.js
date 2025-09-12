// models/Report.js
import { Schema, model } from "mongoose";

const ReportSchema = new Schema({
    username: { type: String, required: true },
    quizName:   { type: String, required: true },
    score:      { type: Number, required: true },
    total:      { type: Number, required: true },
    questions: [{
        questionText:      { type: String,   required: true },
        options:           { type: [String], required: true }, // ← add this
        userAnswer:        { type: String,   required: true }, // letter
        userAnswerText:    { type: String,   required: true }, // ← add this
        correctAnswer:     { type: String,   required: true }, // letter
        correctAnswerText: { type: String,   required: true },  // ← add this
        answerTime:        { type: Number,   required: true }
    }]
}, { timestamps: true });

// Indexes for performance
ReportSchema.index({ username: 1 });
ReportSchema.index({ quizName: 1 });
ReportSchema.index({ createdAt: -1 }); // For time-based queries

export default model("Report", ReportSchema);