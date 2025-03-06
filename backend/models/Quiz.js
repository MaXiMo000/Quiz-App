import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    question: String,
    options: [String],
    correctAnswer: String,
});

const quizSchema = new mongoose.Schema({
    title: String,
    category: String,   // ✅ Add category
    duration: Number,   // ✅ Add duration
    totalMarks: Number,
    passingMarks: Number,
    questions: [questionSchema],
});

const Quiz = mongoose.model("Quiz", quizSchema);
export default Quiz;