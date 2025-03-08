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

        // ✅ AI Prompt
        const prompt = `Generate ${numQuestions} multiple-choice questions about "${topic}" in JSON format.
        The format should be:
        {
            "questions": [
                {
                    "question": "What is 2 + 2?",
                    "options": ["3", "4", "5", "6"],
                    "correctAnswer": "B"
                }
            ]
        }
        Only return JSON. No explanations or additional text.`;

        console.log("AI Prompt:", prompt);

        // ✅ Call Together AI API Using Their Official SDK
        const response = await together.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
            max_tokens: 300,
            temperature: 0.7
        });

        console.log("AI Response:", response);

        // ✅ Extract JSON from AI response
        let aiGeneratedData;
        try {
            aiGeneratedData = JSON.parse(response.choices[0].message.content);
        } catch (parseError) {
            return res.status(500).json({ error: "Invalid JSON format from AI response", details: parseError.message });
        }

        // ✅ Validate AI response
        if (!aiGeneratedData.questions || !Array.isArray(aiGeneratedData.questions)) {
            return res.status(500).json({ error: "Invalid questions format from AI response" });
        }

        // ✅ Add questions to quiz in database
        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ error: "Quiz not found" });

        console.log("Quiz before adding questions:", quiz);
        quiz.questions.push(...aiGeneratedData.questions);

        // ✅ Automatically update marks & duration
        quiz.totalMarks = quiz.questions.length;
        quiz.passingMarks = Math.ceil(quiz.totalMarks / 2);
        quiz.duration = quiz.questions.length * 2;

        await quiz.save();
        console.log("Quiz after adding questions:", quiz);

        res.json({ message: "Questions added successfully", questions: aiGeneratedData.questions });
    } catch (error) {
        console.error("🔥 Error Generating AI Questions:", error);
        res.status(500).json({ error: "Failed to generate AI questions", details: error.message });
    }
};
