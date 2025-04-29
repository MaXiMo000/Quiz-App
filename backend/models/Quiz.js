import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    question: String,
    options: [String],
    correctAnswer: String,
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "medium"
    }
});


const quizSchema = new mongoose.Schema({
    title: String,
    category: String,
    totalMarks: { type: Number, default: 0 },
    passingMarks: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    questions: [questionSchema],
});

const Quiz = mongoose.model("Quiz", quizSchema);
export default Quiz;