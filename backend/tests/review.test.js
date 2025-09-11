import mongoose from "mongoose";
import request from "supertest";
import express from "express";
import reviewRoutes from "../routes/reviewRoutes.js";
import { verifyToken } from "../middleware/auth.js";
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
  let quiz;
  let user;

  beforeAll(async () => {
    const MONGO_URI = "mongodb://127.0.0.1:27017/testdb_reviews";
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    user = await User.create({
      _id: "60c72b9f9b1d8c001f8e4a3b",
      name: "Test User",
      email: "test@example.com",
      password: "password",
    });

    quiz = await Quiz.create({
      title: "Test Quiz",
      questions: [{ _id: new mongoose.Types.ObjectId(), question: "Test Question" }],
    });
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  describe("GET /api/reviews", () => {
    it("should return the review schedule for the user", async () => {
      const res = await request(app).get("/api/reviews");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toBeInstanceOf(Array);
    });
  });

  describe("POST /api/reviews/update", () => {
    it("should update the review schedule", async () => {
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
    });
  });
});
