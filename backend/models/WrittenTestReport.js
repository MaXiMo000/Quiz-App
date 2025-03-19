import { Schema, model } from "mongoose";

const WrittenTestReportSchema = new Schema({
    username: { type: String, required: true },
    testName: { type: String, required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    questions: [{
        questionText: { type: String, required: true },
        userAnswer: { type: String, required: true },
        correctAnswer: { type: String, required: true },
    }]
});

export default model("WrittenTestReport", WrittenTestReportSchema);