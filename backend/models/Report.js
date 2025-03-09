import { Schema, model } from "mongoose";

const ReportSchema = new Schema({
    username: { type: String, required: true },
    quizName: { type: String, required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    questions: [{ // ✅ Ensure questions array is included
        questionText: { type: String, required: true },
        userAnswer: { type: String, required: true },
        correctAnswer: { type: String, required: true },
    }]
});

export default model("Report", ReportSchema);
