import dotenv from "dotenv";
import Together from "together-ai";
import Quiz from "../models/Quiz.js";
import mongoose from "mongoose";

dotenv.config();
const TOGETHER_AI_API_KEY = process.env.TOGETHER_AI_API_KEY;

// ✅ Initialize Together AI Client
const together = new Together({
    apiKey: TOGETHER_AI_API_KEY,
});

export const generateQuizQuestions = async (req, res) => {
    try {
        const { topic, numQuestions } = req.body;
        const { id } = req.params;

        console.log("Received request with topic:", topic, "and numQuestions:", numQuestions);
        console.log("Quiz ID:", id);

        if (!topic || !numQuestions) {
            return res.status(400).json({ error: "Topic and number of questions are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid Quiz ID format" });
        }

        // ✅ Enhanced AI Prompt to include difficulty tagging
        const prompt = `Generate ${numQuestions} multiple-choice questions about "${topic}" in JSON format.
        Each question must include a "difficulty" key with value "easy", "medium", or "hard".
        Return this format only:
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
        Only return valid JSON. No explanations or extra text.`;

        const response = await together.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
            max_tokens: 400,
            temperature: 0.7
        });

        let aiGeneratedData;
        try {
            aiGeneratedData = JSON.parse(response.choices[0].message.content);
        } catch (parseError) {
            return res.status(500).json({ error: "Invalid JSON format from AI response", details: parseError.message });
        }

        // ✅ Validate questions format and difficulty values
        if (!aiGeneratedData.questions || !Array.isArray(aiGeneratedData.questions)) {
            return res.status(500).json({ error: "Invalid questions format from AI response" });
        }

        const validDifficulties = ["easy", "medium", "hard"];
        aiGeneratedData.questions.forEach(q => {
            if (!validDifficulties.includes(q.difficulty)) {
                q.difficulty = "medium"; // fallback if AI misses it
            }
        });

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ error: "Quiz not found" });

        quiz.questions.push(...aiGeneratedData.questions);
        console.log(...aiGeneratedData.questions);
        quiz.totalMarks = quiz.questions.length;
        quiz.passingMarks = Math.ceil(quiz.totalMarks / 2);
        quiz.duration = quiz.questions.length * 2;

        await quiz.save();
        res.json({ message: "Questions added successfully", questions: aiGeneratedData.questions });
    } catch (error) {
        console.error("🔥 Error Generating AI Questions:", error);
        res.status(500).json({ error: "Failed to generate AI questions", details: error.message });
    }
};


export const generateAdaptiveQuestions = async (req, res) => {
    const { performance, quizId, numQuestions = 5 } = req.body;

    const quizs = await Quiz.findById(quizId);
    if (!quizs) return res.status(404).json({ error: "Quiz not found" });

    const topic = quizs.category;

    const difficulty = performance === "low" ? "easy" : performance === "high" ? "hard" : "medium";

    const prompt = `Generate exactly ${numQuestions} multiple-choice questions on topic '${topic}' with "${difficulty}" difficulty.
        Return JSON only in this format:
        {
            "questions": [
                {
                    "question": "Sample question?",
                    "options": ["A", "B", "C", "D"],
                    "correctAnswer": "B",
                    "difficulty": "${difficulty}"
                }
            ]
        }`;

    const response = await together.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        max_tokens: 400
    });

    let data;
    try {
        data = JSON.parse(response.choices[0].message.content);
    } catch {
        return res.status(500).json({ error: "AI JSON parse failed" });
    }

    // Append to existing quiz
    const quiz = await Quiz.findById(quizId);
    quiz.questions.push(...data.questions);
    quiz.totalMarks = quiz.questions.length;
    quiz.duration = quiz.questions.length * 2;
    quiz.passingMarks = Math.ceil(quiz.totalMarks / 2);
    await quiz.save();

    res.json({ message: "Adaptive questions added", questions: data.questions });
};