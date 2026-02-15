import WrittenTest from "../models/WrittenTest.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { generateFromGemini } from "../utils/geminiHelper.js";
import logger from "../utils/logger.js";
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendCreated } from "../utils/responseHelper.js";
import AppError from "../utils/AppError.js";

dotenv.config();

// Only throw error in production, allow tests to run without API key
if (!process.env.GEMINI_API_KEY && process.env.NODE_ENV !== "test") {
    throw new Error("🚫 GEMINI_API_KEY is missing from .env file!");
}

export async function createWrittenTest(req, res) {
    logger.info(`Creating written test with title: ${req.body.title}`);
    try {
        const { title, category, questions } = req.body;
        if (!title || !category) {
            logger.warn("Missing required fields for written test creation");
            return sendValidationError(res, { title: "Title and category are required" }, "Missing required fields");
        }

        const writtenTest = new WrittenTest({ title, category, questions });
        await writtenTest.save();

        logger.info(`Successfully created written test with title: ${title}`);
        return sendCreated(res, { testId: writtenTest._id }, "Written test created successfully");
    } catch (error) {
        logger.error({ message: `Error creating written test with title: ${req.body.title}`, error: error.message, stack: error.stack });
        throw new AppError("Error creating written test", 500);
    }
}

export async function getWrittenTests(req, res) {
    logger.info("Fetching all written tests");
    try {
        const tests = await WrittenTest.find();
        logger.info(`Successfully fetched ${tests.length} written tests`);
        return sendSuccess(res, tests, "Written tests fetched successfully");
    } catch (error) {
        logger.error({ message: "Error fetching written tests", error: error.message, stack: error.stack });
        throw new AppError("Error fetching written tests", 500);
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
            return sendNotFound(res, "Test");
        }

        test.questions.push({ question, marks });
        test.totalMarks += marks;
        test.duration = test.questions.length * 10;

        await test.save();
        logger.info(`Successfully added question to written test ${testId}`);
        return sendSuccess(res, test, "Question added successfully");
    } catch (error) {
        logger.error({ message: `Failed to add question to written test ${req.params.testId}`, error: error.message, stack: error.stack });
        throw new AppError("Failed to add question", 500);
    }
}

export async function scoreWrittenAnswer(req, res) {
    logger.info("Scoring written answer");
    try {
        const { answer, question } = req.body;

        if (!answer || !question) {
            logger.warn("Answer and question are required for AI scoring");
            return sendValidationError(res, { answer: "Answer and question are required" }, "Answer and question are required");
        }

        const prompt = `
You are an AI evaluator. Score the following answer out of 10 and provide a brief explanation.

Question: ${question}
Answer: ${answer}

Return output like:
Score: 8
Feedback: Well-structured answer with key points covered.
`;

        const geminiResponse = await generateFromGemini(prompt, {
            preferredModel: "gemini-2.5-pro", // Premium model, falls back if quota exceeded
            maxRetries: 3
        });

        const scoreMatch = geminiResponse.match(/Score\s*[:-]?\s*(\d+)/i);
        const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

        logger.info("Successfully scored written answer");
        return sendSuccess(res, { score, feedback: geminiResponse.trim() }, "Answer scored successfully");
    } catch (error) {
        logger.error({ message: "Error in AI scoring", error: error.message, stack: error.stack });
        throw new AppError("Error in AI scoring", 500);
    }
}

export const deleteTest = async (req, res) => {
    logger.info(`Attempting to delete written test with title: ${req.query.title}`);
    try {
        const { title } = req.query;

        if (!title) {
            logger.warn("Test title is required for deletion");
            return sendValidationError(res, { title: "Test title is required" }, "Test title is required");
        }

        const test = await WrittenTest.findOne({ title });

        if (!test) {
            logger.warn(`Written test not found for deletion with title: ${title}`);
            return sendNotFound(res, "Test");
        }

        await WrittenTest.deleteOne({ title });
        logger.info(`Written test with title "${title}" deleted successfully`);
        return sendSuccess(res, null, "Test deleted successfully!");
    } catch (error) {
        logger.error({ message: `Error deleting written test with title: ${req.query.title}`, error: error.message, stack: error.stack });
        throw new AppError("Error deleting test", 500);
    }
};

export async function getTestById(req, res) {
    logger.info(`Fetching written test by ID: ${req.params.id}`);
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            logger.warn(`Invalid ID format for written test: ${id}`);
            return sendValidationError(res, { id: "Invalid ID format" }, "Invalid ID format");
        }

        const test = await WrittenTest.findById(id);
        if (!test) {
            logger.warn(`Written test not found: ${id}`);
            return sendNotFound(res, "Test");
        }

        logger.info(`Successfully fetched written test ${id}`);
        return sendSuccess(res, test, "Test fetched successfully");
    } catch (error) {
        logger.error({ message: `Error fetching written test ${req.params.id}`, error: error.message, stack: error.stack });
        throw new AppError("Error fetching test", 500);
    }
}

export async function deleteQuestion(req, res) {
    logger.info(`Deleting question at index ${req.params.questionIndex} from written test ${req.params.id}`);
    try {
        const test = await WrittenTest.findById(req.params.id);
        if (!test) {
            logger.warn(`Written test not found: ${req.params.id} when deleting question`);
            return sendNotFound(res, "Test");
        }

        const questionIndex = req.params.questionIndex;
        if (questionIndex < 0 || questionIndex >= test.questions.length) {
            logger.warn(`Invalid question index ${questionIndex} for written test ${req.params.id}`);
            return sendValidationError(res, { questionIndex: "Invalid question index" }, "Invalid question index");
        }

        test.questions.splice(questionIndex, 1);
        test.totalMarks -= 1;
        test.duration = test.questions.length * 10;

        await test.save();
        logger.info(`Successfully deleted question at index ${questionIndex} from written test ${req.params.id}`);
        return sendSuccess(res, { test }, "Question deleted successfully");
    } catch (error) {
        logger.error({ message: `Error deleting question from written test ${req.params.id}`, error: error.message, stack: error.stack });
        throw new AppError("Error deleting question", 500);
    }
}
