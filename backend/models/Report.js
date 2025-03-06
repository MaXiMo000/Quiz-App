import { Schema, model } from "mongoose";

const ReportSchema = new Schema({
    username: String,
    quizName: String,
    score: Number,
    total: Number
});

export default model("Report", ReportSchema);