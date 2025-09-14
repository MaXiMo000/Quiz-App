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
    beforeEach(async () => {
        await Report.deleteMany({});
    }, 30000);

    afterEach(async () => {
        await Report.deleteMany({});
    }, 30000);

    describe("GET /api/analytics/question-stats", () => {
        it("should return question stats with correct data structure", async () => {
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
                        isCorrect: true,
                    },
                    {
                        questionText: "What is the capital of France?",
                        options: ["London", "Berlin", "Paris", "Madrid"],
                        userAnswer: "C",
                        userAnswerText: "Paris",
                        correctAnswer: "C",
                        correctAnswerText: "Paris",
                        answerTime: 10,
                        isCorrect: true,
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
        }, 30000);

        it("should handle multiple reports with same questions", async () => {
            // Create multiple reports with same questions
            await Report.create({
                username: "User1",
                quizName: "Test Quiz",
                score: 8,
                total: 10,
                questions: [
                    {
                        questionText: "What is 2+2?",
                        options: ["2", "3", "4", "5"],
                        userAnswer: "C",
                        userAnswerText: "4",
                        correctAnswer: "C",
                        correctAnswerText: "4",
                        answerTime: 3,
                        isCorrect: true,
                    },
                ],
            });

            await Report.create({
                username: "User2",
                quizName: "Test Quiz",
                score: 6,
                total: 10,
                questions: [
                    {
                        questionText: "What is 2+2?",
                        options: ["2", "3", "4", "5"],
                        userAnswer: "A",
                        userAnswerText: "2",
                        correctAnswer: "C",
                        correctAnswerText: "4",
                        answerTime: 7,
                        isCorrect: false,
                    },
                ],
            });

            const res = await request(app).get("/api/analytics/question-stats");
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].question).toBe("What is 2+2?");
            expect(res.body[0].correctPercent).toBe(50); // 1 out of 2 correct
            expect(res.body[0].avgTime).toBe(5); // (3 + 7) / 2
        }, 30000);

        it("should handle empty database", async () => {
            const res = await request(app).get("/api/analytics/question-stats");
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual([]);
        }, 30000);
    });

    describe("GET /api/analytics/score-trends", () => {
        it("should return score trends for a user", async () => {
            const today = new Date();
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

            await Report.create({
                username: "Test User",
                quizName: "Quiz 1",
                score: 8,
                total: 10,
                questions: [],
                createdAt: yesterday,
            });

            await Report.create({
                username: "Test User",
                quizName: "Quiz 2",
                score: 6,
                total: 10,
                questions: [],
                createdAt: today,
            });

            const res = await request(app)
                .get("/api/analytics/score-trends");

            expect(res.statusCode).toEqual(200);
            expect(res.body).toBeInstanceOf(Array);
            expect(res.body.length).toBe(2);
        }, 30000);

        it("should handle empty database", async () => {
            const res = await request(app).get("/api/analytics/score-trends");
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual([]);
        }, 30000);
    });

    describe("GET /api/analytics/topic-heatmap", () => {
        it("should return topic heatmap data", async () => {
            await Report.create({
                username: "User1",
                quizName: "JavaScript Quiz",
                score: 8,
                total: 10,
                questions: [
                    {
                        questionText: "What is JavaScript?",
                        options: ["A programming language", "A database", "A framework", "An OS"],
                        userAnswer: "A",
                        userAnswerText: "A programming language",
                        correctAnswer: "A",
                        correctAnswerText: "A programming language",
                        answerTime: 10
                    }
                ],
            });

            await Report.create({
                username: "User2",
                quizName: "Math Quiz",
                score: 6,
                total: 10,
                questions: [
                    {
                        questionText: "What is 2+2?",
                        options: ["3", "4", "5", "6"],
                        userAnswer: "B",
                        userAnswerText: "4",
                        correctAnswer: "B",
                        correctAnswerText: "4",
                        answerTime: 5
                    }
                ],
            });

            const res = await request(app).get("/api/analytics/topic-heatmap");
            expect(res.statusCode).toEqual(200);
            expect(res.body).toBeInstanceOf(Array);
            expect(res.body.length).toBeGreaterThan(0);
        }, 30000);

        it("should handle empty database", async () => {
            const res = await request(app).get("/api/analytics/topic-heatmap");
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual([]);
        }, 30000);
    });
});
