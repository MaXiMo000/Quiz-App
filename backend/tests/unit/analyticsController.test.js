import mongoose from "mongoose";
import request from "supertest";
import express from "express";
import analyticsRoutes from "../../routes/analyticsRoutes.js";
import Report from "../../models/Report.js";

// Mock the verifyToken middleware
jest.mock("../../middleware/auth.js", () => ({
    verifyToken: (req, res, next) => {
        req.user = { id: "60c72b9f9b1d8c001f8e4a3a" };
        next();
    },
}));

const app = express();
app.use(express.json());
app.use("/api/analytics", analyticsRoutes);

describe("Analytics Routes", () => {
    afterEach(async () => {
        await Report.deleteMany({});
    });

    describe("GET /api/analytics/question-stats", () => {
        it("should return question stats", async () => {
            await Report.create({
                username: "Test User",
                quizName: "Test Quiz",
                score: 5,
                total: 10,
                questions: [
                    {
                        questionText: "What is 2+2?",
                        options: ["2", "3", "4", "5"],
                        userAnswer: "C",
                        userAnswerText: "4",
                        correctAnswer: "C",
                        correctAnswerText: "4",
                        answerTime: 5,
                    },
                    {
                        questionText: "What is the capital of France?",
                        options: ["London", "Berlin", "Paris", "Madrid"],
                        userAnswer: "C",
                        userAnswerText: "Paris",
                        correctAnswer: "C",
                        correctAnswerText: "Paris",
                        answerTime: 10,
                    },
                ],
            });

            const res = await request(app).get("/api/analytics/question-stats");
            expect(res.statusCode).toEqual(200);
            expect(res.body).toBeInstanceOf(Array);
            expect(res.body.length).toBe(2);

            const sortedBody = res.body.sort((a, b) => a.question.localeCompare(b.question));

            expect(sortedBody[0].question).toBe("What is 2+2?");
            expect(sortedBody[0].correctPercent).toBe(100);
            expect(sortedBody[0].avgTime).toBe(5);
        });
    });
});
