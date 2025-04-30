import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Quiz from "../models/Quiz.js";
import mongoose from "mongoose";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    throw new Error("🚫 GEMINI_API_KEY is missing from .env file!");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Gemini request wrapper
const generateFromGemini = async (prompt) => {
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-pro-001" });

    const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }]
    });

    return result.response.text();
};

// ✅ General MCQ Generator
export const generateQuizQuestions = async (req, res) => {
    try {
        const { topic, numQuestions } = req.body;
        const { id } = req.params;

        if (!topic || !numQuestions) {
            return res.status(400).json({ error: "Topic and number of questions are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid quiz ID" });
        }

        const prompt = `
        Generate ${numQuestions} multiple-choice questions about "${topic}".
        Each must include:
        - "question"
        - "options" (array of 4)
        - "correctAnswer" (as "A", "B", "C", "D")
        - "difficulty" ("easy" | "medium" | "hard")

        Return ONLY JSON like this:
        {
        "questions": [
            {
            "question": "What is 2 + 2?",
            "options": ["3", "4", "5", "6"],
            "correctAnswer": "B",
            "difficulty": "easy"
            }
        ]
        }
        No explanation or extra output.`;

        const aiText = await generateFromGemini(prompt);

        let parsed;
        try {
            parsed = JSON.parse(aiText);
        } catch (e) {
            return res.status(500).json({ error: "AI returned invalid JSON", details: e.message });
        }

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ error: "Quiz not found" });

        parsed.questions.forEach(q => {
            if (!["easy", "medium", "hard"].includes(q.difficulty)) {
                q.difficulty = "medium";
            }
        });

        quiz.questions.push(...parsed.questions);
        quiz.totalMarks = quiz.questions.length;
        quiz.passingMarks = Math.ceil(quiz.totalMarks / 2);
        quiz.duration = quiz.questions.length * 2;

        await quiz.save();
        res.json({ message: "Questions added successfully", questions: parsed.questions });
    } catch (err) {
        console.error("🔥 AI Question Error:", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
};

// ✅ Adaptive MCQ Generator
export const generateAdaptiveQuestions = async (req, res) => {
    try {
        const { performance, quizId, numQuestions = 5 } = req.body;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ error: "Quiz not found" });

        const topic = quiz.category;
        const difficulty = performance === "low" ? "easy" :
        performance === "high" ? "hard" : "medium";

        const prompt = `
        Generate ${numQuestions} multiple-choice questions on "${topic}".
        All should have difficulty: "${difficulty}".
        Output format:
        {
        "questions": [
            {
            "question": "...",
            "options": ["A", "B", "C", "D"],
            "correctAnswer": "A",
            "difficulty": "${difficulty}"
            }
        ]
        }
        No explanation or text outside JSON.`;

        const aiText = await generateFromGemini(prompt);

        let parsed;
        try {
            parsed = JSON.parse(aiText);
        } catch (e) {
            return res.status(500).json({ error: "AI returned invalid JSON", details: e.message });
        }

        quiz.questions.push(...parsed.questions);
        quiz.totalMarks = quiz.questions.length;
        quiz.duration = quiz.questions.length * 2;
        quiz.passingMarks = Math.ceil(quiz.totalMarks / 2);

        await quiz.save();
        res.json({ message: "Adaptive questions added", questions: parsed.questions });
    } catch (err) {
        console.error("🔥 Adaptive AI Error:", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
};
