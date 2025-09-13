import { migrateQuizDifficultyDistribution } from "../../controllers/migrationController.js";
import Quiz from "../../models/Quiz.js";
import request from "supertest";
import express from "express";
import migrationRoutes from "../../routes/api.js";

// Mock the Quiz model
jest.mock("../../models/Quiz.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        findByIdAndUpdate: jest.fn(),
    },
}));

// Mock the verifyToken middleware
jest.mock("../../middleware/auth.js", () => ({
    verifyToken: (req, res, next) => {
        req.user = { id: "60c72b9f9b1d8c001f8e4a3a", role: "admin" };
        next();
    },
}));

const app = express();
app.use(express.json());
app.use("/api", migrationRoutes);

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
                .post("/api/migrate/quiz-difficulty-distribution")
                .expect(200);

            expect(res.body.message).toBe("Migration completed successfully");
            expect(res.body.updated).toBe(2);

            expect(Quiz.find).toHaveBeenCalledWith({
                difficultyDistribution: { $exists: false }
            });

            expect(Quiz.findByIdAndUpdate).toHaveBeenCalledWith(
                "quiz1",
                {
                    $set: {
                        difficultyDistribution: {
                            easy: 50,
                            medium: 25,
                            hard: 25
                        }
                    }
                }
            );

            expect(Quiz.findByIdAndUpdate).toHaveBeenCalledWith(
                "quiz2",
                {
                    $set: {
                        difficultyDistribution: {
                            easy: 0,
                            medium: 50,
                            hard: 50
                        }
                    }
                }
            );
        }, 10000);

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
                .post("/api/migrate/quiz-difficulty-distribution")
                .expect(200);

            expect(res.body.message).toBe("Migration completed successfully");
            expect(res.body.updated).toBe(1);

            expect(Quiz.findByIdAndUpdate).toHaveBeenCalledWith(
                "quiz1",
                {
                    $set: {
                        difficultyDistribution: {
                            easy: 0,
                            medium: 0,
                            hard: 0
                        }
                    }
                }
            );
        }, 10000);

        it("should handle quizzes with undefined difficulty", async () => {
            const mockQuizzes = [
                {
                    _id: "quiz1",
                    title: "Quiz with undefined difficulty",
                    questions: [
                        { difficulty: "easy" },
                        { difficulty: undefined },
                        { difficulty: "hard" },
                        { }
                    ]
                }
            ];

            Quiz.find.mockResolvedValue(mockQuizzes);
            Quiz.findByIdAndUpdate.mockResolvedValue({});

            const res = await request(app)
                .post("/api/migrate/quiz-difficulty-distribution")
                .expect(200);

            expect(res.body.message).toBe("Migration completed successfully");
            expect(res.body.updated).toBe(1);

            expect(Quiz.findByIdAndUpdate).toHaveBeenCalledWith(
                "quiz1",
                {
                    $set: {
                        difficultyDistribution: {
                            easy: 50,
                            medium: 0,
                            hard: 50
                        }
                    }
                }
            );
        }, 10000);

        it("should handle database errors during migration", async () => {
            const mockQuizzes = [
                {
                    _id: "quiz1",
                    title: "JavaScript Quiz",
                    questions: [
                        { difficulty: "easy" },
                        { difficulty: "medium" }
                    ]
                }
            ];

            Quiz.find.mockResolvedValue(mockQuizzes);
            Quiz.findByIdAndUpdate.mockRejectedValue(new Error("Database update error"));

            const res = await request(app)
                .post("/api/migrate/quiz-difficulty-distribution")
                .expect(500);

            expect(res.body.error).toBe("Migration failed");
        }, 10000);

        it("should handle no quizzes found", async () => {
            Quiz.find.mockResolvedValue([]);

            const res = await request(app)
                .post("/api/migrate/quiz-difficulty-distribution")
                .expect(200);

            expect(res.body.message).toBe("Migration completed successfully");
            expect(res.body.updated).toBe(0);
        }, 10000);

        it("should handle database connection errors", async () => {
            Quiz.find.mockRejectedValue(new Error("Database connection error"));

            const res = await request(app)
                .post("/api/migrate/quiz-difficulty-distribution")
                .expect(500);

            expect(res.body.error).toBe("Migration failed");
        }, 10000);

        it("should handle large number of quizzes", async () => {
            const mockQuizzes = Array.from({ length: 100 }, (_, i) => ({
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
                .post("/api/migrate/quiz-difficulty-distribution")
                .expect(200);

            expect(res.body.message).toBe("Migration completed successfully");
            expect(res.body.updated).toBe(100);
            expect(Quiz.findByIdAndUpdate).toHaveBeenCalledTimes(100);
        }, 15000);
    });
});
