import WrittenTest from "../models/WrittenTest.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withCachingAndLogging, controllerConfigs, cacheKeyGenerators } from "../utils/controllerUtils.js";
import logger from "../utils/logger.js";

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

const _createWrittenTest = async (req, res) => {
    const { title, category, questions } = req.body;
    if (!title || !category) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    const writtenTest = new WrittenTest({ title, category, questions });
    await writtenTest.save();

    res.status(200).json({ message: "Success!" });
};

export const createWrittenTest = withCachingAndLogging(_createWrittenTest, {
    ...controllerConfigs.quiz,
    operation: 'Create Written Test',
    cacheTTL: 0, // No caching for create operations
    logFields: ['body.title', 'body.category']
});

const _getWrittenTests = async (req, res) => {
    const tests = await WrittenTest.find();
    res.json(tests);
};

export const getWrittenTests = withCachingAndLogging(_getWrittenTests, {
    ...controllerConfigs.quiz,
    operation: 'Get Written Tests',
    cacheTTL: 600, // 10 minutes
    cacheKeyGenerator: cacheKeyGenerators.roleBased
});

const _addQuestionToTest = async (req, res) => {
    const { testId } = req.params;
    const { question, marks } = req.body;

    const test = await WrittenTest.findById(testId);
    if (!test) return res.status(404).json({ error: "Test not found" });

    test.questions.push({ question, marks });
    test.totalMarks += marks;
    test.duration = test.questions.length * 10;

    await test.save();
    res.json(test);
};

export const addQuestionToTest = withCachingAndLogging(_addQuestionToTest, {
    ...controllerConfigs.quiz,
    operation: 'Add Question to Test',
    cacheTTL: 0, // No caching for create operations
    logFields: ['params.testId', 'body.question', 'body.marks']
});

const _scoreWrittenAnswer = async (req, res) => {
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
};

export const scoreWrittenAnswer = withCachingAndLogging(_scoreWrittenAnswer, {
    ...controllerConfigs.quiz,
    operation: 'Score Written Answer',
    cacheTTL: 0, // No caching for AI operations
    logFields: ['body.question', 'body.answer']
});

const _deleteTest = async (req, res) => {
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
};

export const deleteTest = withCachingAndLogging(_deleteTest, {
    ...controllerConfigs.quiz,
    operation: 'Delete Written Test',
    cacheTTL: 0, // No caching for delete operations
    logFields: ['query.title']
});

const _getTestById = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
    }

    const test = await WrittenTest.findById(id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    res.json(test);
};

export const getTestById = withCachingAndLogging(_getTestById, {
    ...controllerConfigs.quiz,
    operation: 'Get Written Test by ID',
    cacheTTL: 300, // 5 minutes
    cacheKeyGenerator: (req) => `written-test:id:${req.params.id}`
});

const _deleteQuestion = async (req, res) => {
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
};

export const deleteQuestion = withCachingAndLogging(_deleteQuestion, {
    ...controllerConfigs.quiz,
    operation: 'Delete Written Test Question',
    cacheTTL: 0, // No caching for delete operations
    logFields: ['params.id', 'params.questionIndex']
});