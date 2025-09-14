import mongoose from "mongoose";
import request from "supertest";

jest.mock("redis", () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    scan: jest.fn().mockResolvedValue({ cursor: 0, keys: [] }),
    flushDb: jest.fn().mockResolvedValue("OK"),
  })),
}));
import express from "express";
import reviewRoutes from "../routes/reviewRoutes.js";
import User from "../models/User.js";
import Quiz from "../models/Quiz.js";
import ReviewSchedule from "../models/ReviewSchedule.js";

// Mock the verifyToken middleware
jest.mock("../middleware/auth.js", () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: "60c72b9f9b1d8c001f8e4a3b" };
    next();
  },
}));

const app = express();
app.use(express.json());
app.use("/api/reviews", reviewRoutes);

describe("Review Routes", () => {
  afterEach(async () => {
    await User.deleteMany({});
    await Quiz.deleteMany({});
    await ReviewSchedule.deleteMany({});
  }, 30000);

  afterAll(async () => {
    // Close mongoose connection to prevent memory leaks
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("GET /api/reviews", () => {
    it("should return the review schedule for the user", async () => {
      const res = await request(app).get("/api/reviews");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toBeInstanceOf(Array);
    }, 30000);
  });

  describe("POST /api/reviews/update", () => {
    it("should update the review schedule", async () => {
      const user = await User.create({
        _id: "60c72b9f9b1d8c001f8e4a3b",
        name: "Test User",
        email: "test@example.com",
        password: "password",
      });

      const quiz = await Quiz.create({
        title: "Test Quiz",
        questions: [{ _id: new mongoose.Types.ObjectId(), question: "Test Question", correctAnswer: "A" }],
      });

      const res = await request(app).post("/api/reviews/update").send({
        quizId: quiz._id,
        questionId: quiz.questions[0]._id,
        quality: 5,
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("nextReviewDate");

      const reviewSchedule = await ReviewSchedule.findOne({
        user: user._id,
        quiz: quiz._id,
        question: quiz.questions[0]._id,
      });

      expect(reviewSchedule).toBeDefined();
      expect(reviewSchedule.repetitions).toBe(1);
      expect(reviewSchedule.interval).toBe(1);
    }, 30000);
  });
});
