import request from "supertest";
import express from "express";

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
import intelligenceRoutes from "../routes/intelligenceRoutes.js";
import User from "../models/User.js";
import Report from "../models/Report.js";
import LearningAnalytics from "../models/LearningAnalytics.js";
import CognitiveMetrics from "../models/CognitiveMetrics.js";

// Mock the verifyToken middleware
jest.mock("../middleware/auth.js", () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: "60c72b9f9b1d8c001f8e4a3a" };
    next();
  },
}));

const app = express();
app.use(express.json());
app.use("/api/intelligence", intelligenceRoutes);

describe("Intelligence Routes", () => {
  afterEach(async () => {
    await User.deleteMany({});
    await Report.deleteMany({});
    await LearningAnalytics.deleteMany({});
    await CognitiveMetrics.deleteMany({});
  }, 30000);

  describe("GET /api/intelligence/analytics", () => {
    it("should return analytics data", async () => {
      // Create a mock user
      await User.create({
        _id: "60c72b9f9b1d8c001f8e4a3a",
        name: "Test User",
        email: "test@example.com",
        password: "password",
      });

      // Create mock reports
      await Report.create({
        username: "Test User",
        quizName: "Test Quiz",
        score: 5,
        total: 10,
      });

      const res = await request(app).get("/api/intelligence/analytics");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("overview");
      expect(res.body.overview.totalQuizzes).toBe(1);
      expect(res.body.overview.averageScore).toBe(50);
      expect(res.body).toHaveProperty("trends");
      expect(res.body).toHaveProperty("predictions");
      expect(res.body.advanced).toBeDefined();
    }, 30000);
  });

  describe("POST /api/intelligence/track-performance", () => {
    it("should track user performance", async () => {
      const res = await request(app)
        .post("/api/intelligence/track-performance")
        .send({
          quizId: "60c72b9f9b1d8c001f8e4a3b",
          score: 8,
          totalQuestions: 10,
          timeSpent: 120,
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe("Performance tracked successfully");

      const learningAnalytics = await LearningAnalytics.findOne({
        user: "60c72b9f9b1d8c001f8e4a3a",
      });
      expect(learningAnalytics).toBeDefined();
      expect(learningAnalytics.metrics.comprehension).toBe(0.8);

      const cognitiveMetrics = await CognitiveMetrics.findOne({
        user: "60c72b9f9b1d8c001f8e4a3a",
      });
      expect(cognitiveMetrics).toBeDefined();
      expect(cognitiveMetrics.metrics.responseTime).toBe(12);
    }, 30000);
  });
});
