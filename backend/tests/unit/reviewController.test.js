import request from "supertest";
import express from "express";
import { getReviewSchedule, updateReview } from "../../controllers/reviewController.js";
import { getReviewScheduleForUser, updateReviewSchedule } from "../../services/reviewScheduler.js";

// Mock the reviewScheduler service
jest.mock("../../services/reviewScheduler.js", () => ({
    getReviewScheduleForUser: jest.fn(),
    updateReviewSchedule: jest.fn(),
}));

const app = express();
app.use(express.json());

// Add middleware to set req.user
app.use((req, res, next) => {
    req.user = { id: "60c72b9f9b1d8c001f8e4a3a" };
    next();
});

app.get("/api/review/schedule", getReviewSchedule);
app.put("/api/review/:reviewId", updateReview);

describe("Review Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    describe("getReviewSchedule", () => {
        it("should return user's review schedule", async () => {
            const mockReviews = [
                {
                    _id: "reviewId1",
                    user: "60c72b9f9b1d8c001f8e4a3a",
                    quiz: "quizId1",
                    question: "What is JavaScript?",
                    nextReviewDate: new Date(),
                    interval: 1,
                    easeFactor: 2.5,
                    repetitions: 0,
                    status: "pending"
                },
                {
                    _id: "reviewId2",
                    user: "60c72b9f9b1d8c001f8e4a3a",
                    quiz: "quizId2",
                    question: "What is React?",
                    nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    interval: 6,
                    easeFactor: 2.3,
                    repetitions: 1,
                    status: "pending"
                }
            ];

            getReviewScheduleForUser.mockResolvedValue(mockReviews);

            const res = await request(app)
                .get("/api/review/schedule");

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0]._id).toBe("reviewId1");
            expect(res.body[0].user).toBe("60c72b9f9b1d8c001f8e4a3a");
            expect(res.body[0].quiz).toBe("quizId1");
            expect(res.body[0].question).toBe("What is JavaScript?");
            expect(res.body[0].interval).toBe(1);
            expect(res.body[0].easeFactor).toBe(2.5);
            expect(res.body[0].repetitions).toBe(0);
            expect(res.body[0].status).toBe("pending");
            expect(getReviewScheduleForUser).toHaveBeenCalledWith("60c72b9f9b1d8c001f8e4a3a");
        });

        it("should return reviews due for review", async () => {
            const mockReviews = [
                {
                    _id: "reviewId1",
                    user: "60c72b9f9b1d8c001f8e4a3a",
                    quiz: "quizId1",
                    question: "What is JavaScript?",
                    nextReviewDate: new Date(Date.now() - 1000), // Past date
                    interval: 1,
                    easeFactor: 2.5,
                    repetitions: 0,
                    status: "pending"
                }
            ];

            getReviewScheduleForUser.mockResolvedValue(mockReviews);

            const res = await request(app)
                .get("/api/review/schedule")
                .query({ due: "true" });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0]._id).toBe("reviewId1");
            expect(res.body[0].user).toBe("60c72b9f9b1d8c001f8e4a3a");
            expect(res.body[0].quiz).toBe("quizId1");
            expect(res.body[0].question).toBe("What is JavaScript?");
            expect(res.body[0].interval).toBe(1);
            expect(res.body[0].easeFactor).toBe(2.5);
            expect(res.body[0].repetitions).toBe(0);
            expect(res.body[0].status).toBe("pending");
        });

        it("should handle database errors", async () => {
            getReviewScheduleForUser.mockRejectedValue(new Error("Database error"));

            const res = await request(app)
                .get("/api/review/schedule");

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                message: "Internal Server Error"
            });
        });

        it("should return empty array when no reviews found", async () => {
            getReviewScheduleForUser.mockResolvedValue([]);

            const res = await request(app)
                .get("/api/review/schedule");

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
        });
    });

    describe("updateReview", () => {
        it("should update review with quality rating", async () => {
            const mockReview = {
                _id: "reviewId",
                user: "60c72b9f9b1d8c001f8e4a3a",
                quiz: "quizId",
                question: "What is JavaScript?",
                nextReviewDate: new Date(),
                interval: 1,
                easeFactor: 2.5,
                repetitions: 0,
                status: "pending"
            };

            updateReviewSchedule.mockResolvedValue(mockReview);

            const res = await request(app)
                .put("/api/review/reviewId")
                .send({ quizId: "quizId", questionId: "questionId", quality: 4 });

            expect(res.statusCode).toBe(200);
            expect(res.body._id).toBe("reviewId");
            expect(res.body.user).toBe("60c72b9f9b1d8c001f8e4a3a");
            expect(res.body.quiz).toBe("quizId");
            expect(res.body.question).toBe("What is JavaScript?");
            expect(res.body.interval).toBe(1);
            expect(res.body.easeFactor).toBe(2.5);
            expect(res.body.repetitions).toBe(0);
            expect(res.body.status).toBe("pending");
            expect(updateReviewSchedule).toHaveBeenCalledWith("60c72b9f9b1d8c001f8e4a3a", "quizId", "questionId", 4);
        });

        it("should handle different quality ratings", async () => {
            const mockReview = {
                _id: "reviewId",
                user: "60c72b9f9b1d8c001f8e4a3a",
                quiz: "quizId",
                question: "What is JavaScript?",
                nextReviewDate: new Date(),
                interval: 1,
                easeFactor: 2.5,
                repetitions: 0,
                status: "pending"
            };

            updateReviewSchedule.mockResolvedValue(mockReview);

            // Test with quality 1 (forgot)
            const res1 = await request(app)
                .put("/api/review/reviewId")
                .send({ quizId: "quizId", questionId: "questionId", quality: 1 });

            expect(res1.statusCode).toBe(200);
            expect(res1.body._id).toBe("reviewId");
            expect(res1.body.user).toBe("60c72b9f9b1d8c001f8e4a3a");

            // Test with quality 5 (perfect)
            const res2 = await request(app)
                .put("/api/review/reviewId")
                .send({ quizId: "quizId", questionId: "questionId", quality: 5 });

            expect(res2.statusCode).toBe(200);
            expect(res2.body._id).toBe("reviewId");
            expect(res2.body.user).toBe("60c72b9f9b1d8c001f8e4a3a");
        });

        it("should handle service errors", async () => {
            updateReviewSchedule.mockRejectedValue(new Error("Service error"));

            const res = await request(app)
                .put("/api/review/nonexistent")
                .send({ quizId: "quizId", questionId: "questionId", quality: 4 });

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                message: "Internal Server Error"
            });
        });

        it("should handle missing required parameters", async () => {
            const res = await request(app)
                .put("/api/review/reviewId")
                .send({});

            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({
                message: "Missing required parameters: quizId, questionId, and quality are required"
            });
        });
    });
});
