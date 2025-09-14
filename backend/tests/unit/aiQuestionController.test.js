import request from "supertest";
import express from "express";
import { generateQuizQuestions, generateAdaptiveQuestions } from "../../controllers/aiQuestionController.js";
import Quiz from "../../models/Quiz.js";

// Mock the models
jest.mock("../../models/Quiz.js", () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
        find: jest.fn(),
    },
}));

jest.mock("../../models/Report.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
    },
}));

// Mock the AI service
jest.mock("../../services/aiQuestionGenerator.js", () => ({
    generateMCQ: jest.fn(),
    generateTrueFalse: jest.fn(),
    generateAdaptiveQuestions: jest.fn(),
}));

// Mock the content quality checker
jest.mock("../../services/contentQualityChecker.js", () => ({
    validateQuestion: jest.fn().mockReturnValue(true),
}));

// Mock the verifyToken middleware
jest.mock("../../middleware/auth.js", () => ({
    verifyToken: (req, res, next) => {
        req.user = { id: "60c72b9f9b1d8c001f8e4a3a" };
        next();
    },
}));

const app = express();
app.use(express.json());
app.post("/api/ai/generate-questions/:id", generateQuizQuestions);
app.post("/api/ai/generate-adaptive", generateAdaptiveQuestions);

describe("AI Question Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("generateQuizQuestions", () => {
        it("should handle missing required fields", async () => {
            const res = await request(app)
                .post("/api/ai/generate-questions/60c72b9f9b1d8c001f8e4a3a")
                .send({
                    topic: "JavaScript"
                    // Missing numQuestions
                });

            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({
                error: "Topic and number of questions are required"
            });
        });

        it("should handle invalid quiz ID", async () => {
            const res = await request(app)
                .post("/api/ai/generate-questions/invalid")
                .send({
                    topic: "JavaScript",
                    numQuestions: 5,
                    questionType: "mcq"
                });

            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({
                error: "Invalid quiz ID"
            });
        });

        it("should handle quiz not found", async () => {
            Quiz.findById.mockResolvedValue(null);

            const res = await request(app)
                .post("/api/ai/generate-questions/60c72b9f9b1d8c001f8e4a3a")
                .send({
                    topic: "JavaScript",
                    numQuestions: 5,
                    questionType: "mcq"
                });

            expect(res.statusCode).toBe(404);
            expect(res.body).toEqual({
                error: "Quiz not found"
            });
        });

        it("should handle invalid question type", async () => {
            const mockQuiz = {
                _id: "60c72b9f9b1d8c001f8e4a3a",
                title: "Test Quiz",
                questions: []
            };

            Quiz.findById.mockResolvedValue(mockQuiz);

            const res = await request(app)
                .post("/api/ai/generate-questions/60c72b9f9b1d8c001f8e4a3a")
                .send({
                    topic: "JavaScript",
                    numQuestions: 5,
                    questionType: "invalid"
                });

            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({
                error: "Invalid question type"
            });
        });

    });

    describe("generateAdaptiveQuestions", () => {

        it("should handle missing required fields", async () => {
            const res = await request(app)
                .post("/api/ai/generate-adaptive")
                .send({
                    performance: "high"
                    // Missing quizId
                });

            expect(res.statusCode).toBe(404);
            expect(res.body).toEqual({
                error: "Quiz not found"
            });
        });

        it("should handle quiz not found", async () => {
            Quiz.findById.mockResolvedValue(null);

            const res = await request(app)
                .post("/api/ai/generate-adaptive")
                .send({
                    quizId: "60c72b9f9b1d8c001f8e4a3b",
                    performance: "high",
                    numQuestions: 3
                });

            expect(res.statusCode).toBe(404);
            expect(res.body).toEqual({
                error: "Quiz not found"
            });
        });

        it("should handle database errors", async () => {
            Quiz.findById.mockRejectedValue(new Error("Database error"));

            const res = await request(app)
                .post("/api/ai/generate-adaptive")
                .send({
                    quizId: "60c72b9f9b1d8c001f8e4a3a",
                    performance: "high",
                    numQuestions: 3
                });

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                error: "Internal server error",
                details: "Database error"
            });
        });
    });
});
