import WrittenTest from "../models/WrittenTest.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    throw new Error("🚫 GEMINI_API_KEY is missing from .env file!");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateFromGemini = async (prompt) => {
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-pro-001" });

    const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }]
    });

    return result.response.text();
};

export async function createWrittenTest(req, res) {
    try {
        const { title, category, questions } = req.body;
        if (!title || !category) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const writtenTest = new WrittenTest({ title, category, questions });
        await writtenTest.save();

        res.status(200).json({ message: "Success!" });
    } catch (error) {
        res.status(500).json({ message: "Error creating written test", error });
    }
}

export async function getWrittenTests(req, res) {
    try {
        const tests = await WrittenTest.find();
        res.json(tests);
    } catch (error) {
        res.status(500).json({ message: "Error fetching written tests", error });
    }
}

export async function addQuestionToTest(req, res) {
    try {
        const { testId } = req.params;
        const { question, marks } = req.body;

        const test = await WrittenTest.findById(testId);
        if (!test) return res.status(404).json({ error: "Test not found" });

        test.questions.push({ question, marks });
        test.totalMarks += marks;
        test.duration = test.questions.length * 10;

        await test.save();
        res.json(test);
    } catch (error) {
        res.status(500).json({ message: "Failed to add question", error });
    }
}

export async function scoreWrittenAnswer(req, res) {
    try {
        const { answer, question } = req.body;

        if (!answer || !question) {
            return res.status(400).json({ message: "Answer and question are required" });
        }

        const prompt = `
You are an AI evaluator. Score the following answer out of 10 and provide a brief explanation.

Question: ${question}
Answer: ${answer}

Return output like:
Score: 8
Feedback: Well-structured answer with key points covered.
`;

        const geminiResponse = await generateFromGemini(prompt);

        const scoreMatch = geminiResponse.match(/Score\s*[:\-]?\s*(\d+)/i);
        const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

        res.json({ score, feedback: geminiResponse.trim() });
    } catch (error) {
        console.error("Error in AI scoring:", error);
        res.status(500).json({ message: "Error in AI scoring", error });
    }
}

export const deleteTest = async (req, res) => {
    try {
        const { title } = req.query;

        if (!title) {
            return res.status(400).json({ message: "Test title is required" });
        }

        const test = await WrittenTest.findOne({ title });

        if (!test) {
            return res.status(404).json({ message: "Test not found" });
        }

        await WrittenTest.deleteOne({ title });
        return res.status(200).json({ message: "Test deleted successfully!" });
    } catch (error) {
        console.error("Error deleting test:", error);
        res.status(500).json({ message: "Error deleting test", error: error.message });
    }
};

export async function getTestById(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const test = await WrittenTest.findById(id);
        if (!test) return res.status(404).json({ message: "Test not found" });

        res.json(test);
    } catch (error) {
        console.error("Error fetching test:", error);
        res.status(500).json({ message: "Error fetching test", error });
    }
}

export async function deleteQuestion(req, res) {
    try {
        const test = await WrittenTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: "Test not found" });

        const questionIndex = req.params.questionIndex;
        if (questionIndex < 0 || questionIndex >= test.questions.length) {
            return res.status(400).json({ message: "Invalid question index" });
        }

        test.questions.splice(questionIndex, 1);
        test.totalMarks -= 1;
        test.duration = test.questions.length * 10;

        await test.save();
        res.json({ message: "Question deleted successfully", test });
    } catch (error) {
        console.error("Error deleting question:", error);
        res.status(500).json({ message: "Error deleting question", error });
    }
}