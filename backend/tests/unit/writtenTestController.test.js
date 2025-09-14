import request from "supertest";
import express from "express";
import {
    createWrittenTest,
    getWrittenTests,
    addQuestionToTest,
    scoreWrittenAnswer,
    deleteTest,
    getTestById,
    deleteQuestion
} from "../../controllers/writtenTestController.js";
import WrittenTest from "../../models/WrittenTest.js";

// Mock the models
jest.mock("../../models/WrittenTest.js", () => {
    const mockWrittenTest = jest.fn().mockImplementation((data) => ({
        ...data,
        _id: "testId",
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
    }));

    // Add static methods to the constructor
    mockWrittenTest.find = jest.fn();
    mockWrittenTest.findById = jest.fn();
    mockWrittenTest.findByIdAndUpdate = jest.fn();
    mockWrittenTest.findByIdAndDelete = jest.fn();
    mockWrittenTest.create = jest.fn();
    mockWrittenTest.findOne = jest.fn();
    mockWrittenTest.deleteOne = jest.fn();

    return {
        __esModule: true,
        default: mockWrittenTest,
    };
});

jest.mock("../../models/WrittenTestReport.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        create: jest.fn(),
    },
}));

// Mock the AI service
jest.mock("../../services/aiQuestionGenerator.js", () => ({
    scoreWrittenAnswer: jest.fn(),
}));

// Mock Google Generative AI
jest.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockResolvedValue({
                response: {
                    text: jest.fn().mockReturnValue("Score: 8\nFeedback: Good answer")
                }
            })
        })
    }))
}));

// Mock mongoose
jest.mock("mongoose", () => ({
    Types: {
        ObjectId: {
            isValid: jest.fn().mockReturnValue(true)
        }
    },
    connection: {
        readyState: 1
    }
}));

const app = express();
app.use(express.json());

// Add middleware to set req.user
app.use((req, res, next) => {
    req.user = { id: "60c72b9f9b1d8c001f8e4a3a" };
    next();
});
app.post("/api/written-tests", createWrittenTest);
app.get("/api/written-tests", getWrittenTests);
app.post("/api/written-tests/:testId/questions", addQuestionToTest);
app.post("/api/written-tests/:testId/score", scoreWrittenAnswer);
app.delete("/api/written-tests", deleteTest);
app.get("/api/written-tests/:id", getTestById);
app.delete("/api/written-tests/:testId/questions/:questionIndex", deleteQuestion);

describe("Written Test Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("createWrittenTest", () => {
        it("should create written test successfully", async () => {
            const mockWrittenTest = {
                _id: "testId",
                title: "JavaScript Essay Test",
                category: "Programming",
                questions: [],
                save: jest.fn().mockResolvedValue(true)
            };

            WrittenTest.mockImplementation(() => mockWrittenTest);

            const res = await request(app)
                .post("/api/written-tests")
                .send({
                    title: "JavaScript Essay Test",
                    category: "Programming",
                    questions: []
                });

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({
                message: "Success!"
            });
        });

        it("should handle missing required fields", async () => {
            const res = await request(app)
                .post("/api/written-tests")
                .send({
                    title: "JavaScript Essay Test"
                    // Missing category
                });

            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({
                message: "Missing required fields"
            });
        });

        it("should handle database errors", async () => {
            WrittenTest.mockImplementation(() => {
                throw new Error("Database error");
            });

            const res = await request(app)
                .post("/api/written-tests")
                .send({
                    title: "JavaScript Essay Test",
                    category: "Programming"
                });

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                message: "Error creating written test",
                error: expect.any(Object)
            });
        });
    });

    describe("getWrittenTests", () => {
        it("should return written tests for user", async () => {
            const mockTests = [
                {
                    _id: "testId1",
                    title: "JavaScript Essay Test",
                    description: "Test your JavaScript knowledge",
                    createdBy: "60c72b9f9b1d8c001f8e4a3a",
                    questions: [],
                    timeLimit: 60
                }
            ];

            WrittenTest.find.mockResolvedValue(mockTests);

            const res = await request(app)
                .get("/api/written-tests");

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(mockTests);
        });

        it("should handle database errors", async () => {
            WrittenTest.find.mockRejectedValue(new Error("Database error"));

            const res = await request(app)
                .get("/api/written-tests");

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                message: "Error fetching written tests",
                error: expect.any(Object)
            });
        });
    });

    describe("addQuestionToTest", () => {
        it("should add question to written test successfully", async () => {
            const mockTest = {
                _id: "testId",
                title: "JavaScript Essay Test",
                questions: [],
                totalMarks: 0,
                duration: 0,
                save: jest.fn().mockResolvedValue(true)
            };

            WrittenTest.findById.mockResolvedValue(mockTest);

            const res = await request(app)
                .post("/api/written-tests/testId/questions")
                .send({
                    question: "Explain closures in JavaScript",
                    marks: 10
                });

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(expect.objectContaining({
                _id: "testId",
                title: "JavaScript Essay Test",
                questions: expect.arrayContaining([
                    expect.objectContaining({
                        question: "Explain closures in JavaScript",
                        marks: 10
                    })
                ]),
                totalMarks: 10,
                duration: 10
            }));
            expect(mockTest.questions).toHaveLength(1);
            expect(mockTest.questions[0]).toEqual({
                question: "Explain closures in JavaScript",
                marks: 10
            });
            expect(mockTest.save).toHaveBeenCalled();
        });

        it("should handle test not found", async () => {
            WrittenTest.findById.mockResolvedValue(null);

            const res = await request(app)
                .post("/api/written-tests/nonexistent/questions")
                .send({
                    question: "Explain closures in JavaScript",
                    marks: 10
                });

            expect(res.statusCode).toBe(404);
            expect(res.body).toEqual({
                error: "Test not found"
            });
        });

        it("should handle missing required fields", async () => {
            const mockTest = {
                _id: "testId",
                questions: []
            };

            WrittenTest.findById.mockResolvedValue(mockTest);

            const res = await request(app)
                .post("/api/written-tests/testId/questions")
                .send({
                    question: "Explain closures in JavaScript"
                    // Missing marks
                });

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                message: "Failed to add question",
                error: expect.any(Object)
            });
        });
    });


    describe("deleteTest", () => {
        it("should delete written test successfully", async () => {
            const mockTest = {
                _id: "testId",
                title: "Test Title",
                createdBy: "60c72b9f9b1d8c001f8e4a3a"
            };

            WrittenTest.findOne.mockResolvedValue(mockTest);
            WrittenTest.deleteOne.mockResolvedValue({ deletedCount: 1 });

            const res = await request(app)
                .delete("/api/written-tests?title=Test Title");

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({
                message: "Test deleted successfully!"
            });
            expect(WrittenTest.findOne).toHaveBeenCalledWith({ title: "Test Title" });
        });

        it("should handle test not found", async () => {
            WrittenTest.findOne.mockResolvedValue(null);

            const res = await request(app)
                .delete("/api/written-tests?title=Nonexistent");

            expect(res.statusCode).toBe(404);
            expect(res.body).toEqual({
                message: "Test not found"
            });
            expect(WrittenTest.findOne).toHaveBeenCalledWith({ title: "Nonexistent" });
        });

        it("should handle unauthorized deletion", async () => {
            const res = await request(app)
                .delete("/api/written-tests");

            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({
                message: "Test title is required"
            });
        });
    });


    describe("deleteQuestion", () => {
        it("should delete question from written test successfully", async () => {
            const mockTest = {
                _id: "testId",
                createdBy: "60c72b9f9b1d8c001f8e4a3a",
                questions: [
                    {
                        _id: "questionId",
                        question: "Explain closures in JavaScript",
                        marks: 10
                    }
                ],
                totalMarks: 10,
                duration: 10,
                save: jest.fn().mockResolvedValue(true)
            };

            WrittenTest.findById.mockResolvedValue(mockTest);

            const res = await request(app)
                .delete("/api/written-tests/testId/questions/0");

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({
                message: "Question deleted successfully",
                test: expect.objectContaining({
                    _id: "testId",
                    createdBy: "60c72b9f9b1d8c001f8e4a3a",
                    questions: [],
                    totalMarks: 9,
                    duration: 0
                })
            });
            expect(mockTest.questions).toHaveLength(0);
            expect(mockTest.save).toHaveBeenCalled();
        });

        it("should handle test not found", async () => {
            WrittenTest.findById.mockResolvedValue(null);

            const res = await request(app)
                .delete("/api/written-tests/nonexistent/questions/0");

            expect(res.statusCode).toBe(404);
            expect(res.body).toEqual({
                message: "Test not found"
            });
        });

        it("should handle question not found", async () => {
            const mockTest = {
                _id: "testId",
                createdBy: "60c72b9f9b1d8c001f8e4a3a",
                questions: []
            };

            WrittenTest.findById.mockResolvedValue(mockTest);

            const res = await request(app)
                .delete("/api/written-tests/testId/questions/5");

            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({
                message: "Invalid question index"
            });
        });

        it("should handle unauthorized deletion", async () => {
            const mockTest = {
                _id: "testId",
                createdBy: "otherUserId",
                questions: [
                    {
                        _id: "questionId",
                        question: "Explain closures in JavaScript",
                        marks: 10
                    }
                ]
            };

            WrittenTest.findById.mockResolvedValue(mockTest);

            const res = await request(app)
                .delete("/api/written-tests/testId/questions/0");

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                message: "Error deleting question",
                error: expect.any(Object)
            });
        });
    });
});
