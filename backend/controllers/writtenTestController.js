import WrittenTest from "../models/WrittenTest.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../utils/logger.js";

dotenv.config();

// Only throw error in production, allow tests to run without API key
if (!process.env.GEMINI_API_KEY && process.env.NODE_ENV !== "test") {
    throw new Error("🚫 GEMINI_API_KEY is missing from .env file!");
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const generateFromGemini = async (prompt) => {
    if (!genAI) {
        // In test environment, return mock response
        if (process.env.NODE_ENV === "test") {
            return "Score: 8\nFeedback: Good answer";
        }
        throw new Error("Gemini AI not initialized - API key missing");
    }

    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-pro-001" });

    const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }]
    });

    return result.response.text();
};

export async function createWrittenTest(req, res) {
    logger.info(`Creating written test with title: ${req.body.title}`);
    try {
        const { title, category, questions } = req.body;
        if (!title || !category) {
            logger.warn("Missing required fields for written test creation");
            return res.status(400).json({ message: "Missing required fields" });
        }

        const writtenTest = new WrittenTest({ title, category, questions });
        await writtenTest.save();

        logger.info(`Successfully created written test with title: ${title}`);
        res.status(200).json({ message: "Success!" });
    } catch (error) {
        logger.error({ message: `Error creating written test with title: ${req.body.title}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error creating written test", error });
    }
}

export async function getWrittenTests(req, res) {
    logger.info("Fetching all written tests");
    try {
        const tests = await WrittenTest.find();
        logger.info(`Successfully fetched ${tests.length} written tests`);
        res.json(tests);
    } catch (error) {
        logger.error({ message: "Error fetching written tests", error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error fetching written tests", error });
    }
}

export async function addQuestionToTest(req, res) {
    logger.info(`Adding question to written test ${req.params.testId}`);
    try {
        const { testId } = req.params;
        const { question, marks } = req.body;

        const test = await WrittenTest.findById(testId);
        if (!test) {
            logger.warn(`Written test not found: ${testId} when adding question`);
            return res.status(404).json({ error: "Test not found" });
        }

        test.questions.push({ question, marks });
        test.totalMarks += marks;
        test.duration = test.questions.length * 10;

        await test.save();
        logger.info(`Successfully added question to written test ${testId}`);
        res.json(test);
    } catch (error) {
        logger.error({ message: `Failed to add question to written test ${req.params.testId}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Failed to add question", error });
    }
}

export async function scoreWrittenAnswer(req, res) {
    logger.info("Scoring written answer");
    try {
        const { answer, question } = req.body;

        if (!answer || !question) {
            logger.warn("Answer and question are required for AI scoring");
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

        const scoreMatch = geminiResponse.match(/Score\s*[:-]?\s*(\d+)/i);
        const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

        logger.info("Successfully scored written answer");
        res.json({ score, feedback: geminiResponse.trim() });
    } catch (error) {
        logger.error({ message: "Error in AI scoring", error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error in AI scoring", error });
    }
}

export const deleteTest = async (req, res) => {
    logger.info(`Attempting to delete written test with title: ${req.query.title}`);
    try {
        const { title } = req.query;

        if (!title) {
            logger.warn("Test title is required for deletion");
            return res.status(400).json({ message: "Test title is required" });
        }

        const test = await WrittenTest.findOne({ title });

        if (!test) {
            logger.warn(`Written test not found for deletion with title: ${title}`);
            return res.status(404).json({ message: "Test not found" });
        }

        await WrittenTest.deleteOne({ title });
        logger.info(`Written test with title "${title}" deleted successfully`);
        return res.status(200).json({ message: "Test deleted successfully!" });
    } catch (error) {
        logger.error({ message: `Error deleting written test with title: ${req.query.title}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error deleting test", error: error.message });
    }
};

export async function getTestById(req, res) {
    logger.info(`Fetching written test by ID: ${req.params.id}`);
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            logger.warn(`Invalid ID format for written test: ${id}`);
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const test = await WrittenTest.findById(id);
        if (!test) {
            logger.warn(`Written test not found: ${id}`);
            return res.status(404).json({ message: "Test not found" });
        }

        logger.info(`Successfully fetched written test ${id}`);
        res.json(test);
    } catch (error) {
        logger.error({ message: `Error fetching written test ${req.params.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error fetching test", error });
    }
}

export async function deleteQuestion(req, res) {
    logger.info(`Deleting question at index ${req.params.questionIndex} from written test ${req.params.id}`);
    try {
        const test = await WrittenTest.findById(req.params.id);
        if (!test) {
            logger.warn(`Written test not found: ${req.params.id} when deleting question`);
            return res.status(404).json({ message: "Test not found" });
        }

        const questionIndex = req.params.questionIndex;
        if (questionIndex < 0 || questionIndex >= test.questions.length) {
            logger.warn(`Invalid question index ${questionIndex} for written test ${req.params.id}`);
            return res.status(400).json({ message: "Invalid question index" });
        }

        test.questions.splice(questionIndex, 1);
        test.totalMarks -= 1;
        test.duration = test.questions.length * 10;

        await test.save();
        logger.info(`Successfully deleted question at index ${questionIndex} from written test ${req.params.id}`);
        res.json({ message: "Question deleted successfully", test });
    } catch (error) {
        logger.error({ message: `Error deleting question from written test ${req.params.id}`, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Error deleting question", error });
    }
}
