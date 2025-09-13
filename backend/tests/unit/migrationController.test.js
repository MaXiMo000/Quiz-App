import request from "supertest";
import express from "express";
import { migrateQuizDifficultyDistribution, runMigration } from "../../controllers/migrationController.js";
import Quiz from "../../models/Quiz.js";

// Mock the Quiz model
jest.mock("../../models/Quiz.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        findByIdAndUpdate: jest.fn(),
    },
}));

const app = express();
app.use(express.json());
app.post("/api/migration/quiz-difficulty", migrateQuizDifficultyDistribution);
app.post("/api/migration/run", runMigration);

describe("Migration Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("migrateQuizDifficultyDistribution", () => {
        it("should migrate quiz difficulty distribution successfully", async () => {
            const mockQuizzes = [
                {
                    _id: "quiz1",
                    title: "JavaScript Quiz",
                    questions: [
                        { difficulty: "easy" },
                        { difficulty: "medium" },
                        { difficulty: "hard" },
                        { difficulty: "easy" }
                    ]
                },
                {
                    _id: "quiz2",
                    title: "Python Quiz",
                    questions: [
                        { difficulty: "medium" },
                        { difficulty: "hard" }
                    ]
                }
            ];

            Quiz.find.mockResolvedValue(mockQuizzes);
            Quiz.findByIdAndUpdate.mockResolvedValue({});

            const res = await request(app)
                .post("/api/migration/quiz-difficulty");

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({
                message: "Migration completed successfully",
                updatedCount: 2
            });

            // Check that findByIdAndUpdate was called with correct data
            expect(Quiz.findByIdAndUpdate).toHaveBeenCalledWith("quiz1", {
                difficultyDistribution: {
                    easy: 2,
                    medium: 1,
                    hard: 1
                },
                averageScore: 0,
                totalAttempts: 0,
                averageTime: 0,
                popularityScore: 0,
                tags: [],
                recommendedFor: {
                    categories: [],
                    skillLevels: [],
                    weakAreas: []
                }
            });
            expect(Quiz.findByIdAndUpdate).toHaveBeenCalledWith("quiz2", {
                difficultyDistribution: {
                    easy: 0,
                    medium: 1,
                    hard: 1
                },
                averageScore: 0,
                totalAttempts: 0,
                averageTime: 0,
                popularityScore: 0,
                tags: [],
                recommendedFor: {
                    categories: [],
                    skillLevels: [],
                    weakAreas: []
                }
            });
        });

        it("should handle quizzes with no questions", async () => {
            const mockQuizzes = [
                {
                    _id: "quiz1",
                    title: "Empty Quiz",
                    questions: []
                }
            ];

            Quiz.find.mockResolvedValue(mockQuizzes);
            Quiz.findByIdAndUpdate.mockResolvedValue({});

            const res = await request(app)
                .post("/api/migration/quiz-difficulty");

            expect(res.statusCode).toBe(200);
            expect(res.body.updatedCount).toBe(1);
            expect(Quiz.findByIdAndUpdate).toHaveBeenCalledWith("quiz1", {
                difficultyDistribution: {
                    easy: 0,
                    medium: 0,
                    hard: 0
                },
                averageScore: 0,
                totalAttempts: 0,
                averageTime: 0,
                popularityScore: 0,
                tags: [],
                recommendedFor: {
                    categories: [],
                    skillLevels: [],
                    weakAreas: []
                }
            });
        });

        it("should handle quizzes with undefined difficulty", async () => {
            const mockQuizzes = [
                {
                    _id: "quiz1",
                    title: "Quiz with undefined difficulty",
                    questions: [
                        { difficulty: "easy" },
                        { difficulty: undefined },
                        { difficulty: "medium" }
                    ]
                }
            ];

            Quiz.find.mockResolvedValue(mockQuizzes);
            Quiz.findByIdAndUpdate.mockResolvedValue({});

            const res = await request(app)
                .post("/api/migration/quiz-difficulty");

            expect(res.statusCode).toBe(200);
            expect(Quiz.findByIdAndUpdate).toHaveBeenCalledWith("quiz1", {
                difficultyDistribution: {
                    easy: 1,
                    medium: 2, // undefined defaults to medium
                    hard: 0
                },
                averageScore: 0,
                totalAttempts: 0,
                averageTime: 0,
                popularityScore: 0,
                tags: [],
                recommendedFor: {
                    categories: [],
                    skillLevels: [],
                    weakAreas: []
                }
            });
        });

        it("should handle database errors during migration", async () => {
            const mockQuizzes = [
                {
                    _id: "quiz1",
                    title: "JavaScript Quiz",
                    questions: [{ difficulty: "easy" }]
                }
            ];

            Quiz.find.mockResolvedValue(mockQuizzes);
            Quiz.findByIdAndUpdate.mockRejectedValue(new Error("Update error"));

            const res = await request(app)
                .post("/api/migration/quiz-difficulty");

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                message: "Migration failed",
                error: "Update error"
            });
        });

        it("should handle no quizzes found", async () => {
            Quiz.find.mockResolvedValue([]);

            const res = await request(app)
                .post("/api/migration/quiz-difficulty");

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({
                message: "Migration completed successfully",
                updatedCount: 0
            });
        });

        it("should handle database connection errors", async () => {
            Quiz.find.mockRejectedValue(new Error("Database connection error"));

            const res = await request(app)
                .post("/api/migration/quiz-difficulty");

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                message: "Migration failed",
                error: "Database connection error"
            });
        });

        it("should handle large number of quizzes", async () => {
            const mockQuizzes = Array.from({ length: 1000 }, (_, i) => ({
                _id: `quiz${i}`,
                title: `Quiz ${i}`,
                questions: [
                    { difficulty: "easy" },
                    { difficulty: "medium" },
                    { difficulty: "hard" }
                ]
            }));

            Quiz.find.mockResolvedValue(mockQuizzes);
            Quiz.findByIdAndUpdate.mockResolvedValue({});

            const res = await request(app)
                .post("/api/migration/quiz-difficulty");

            expect(res.statusCode).toBe(200);
            expect(res.body.updatedCount).toBe(1000);
        });
    });

    describe("runMigration", () => {
        it("should run migration successfully", async () => {
            const mockQuizzes = [
                {
                    _id: "quiz1",
                    title: "JavaScript Quiz",
                    questions: [{ difficulty: "easy" }]
                }
            ];

            Quiz.find.mockResolvedValue(mockQuizzes);
            Quiz.findByIdAndUpdate.mockResolvedValue({});

            const res = await request(app)
                .post("/api/migration/run");

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({
                message: "Migration completed successfully",
                updatedCount: 1
            });
        });

        it("should handle migration errors", async () => {
            Quiz.find.mockRejectedValue(new Error("Database error"));

            const res = await request(app)
                .post("/api/migration/run");

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                message: "Migration failed",
                error: "Database error"
            });
        });

        it("should handle no quizzes found", async () => {
            Quiz.find.mockResolvedValue([]);

            const res = await request(app)
                .post("/api/migration/run");

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({
                message: "Migration completed successfully",
                updatedCount: 0
            });
        });
    });
});
