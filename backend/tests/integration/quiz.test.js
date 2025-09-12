import { jest } from "@jest/globals";
import request from "supertest";

// Mock the auth middleware module
await jest.unstable_mockModule('../../middleware/auth.js', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: "test-user", role: "admin" };
    return next();
  },
}));

// Mock the cache middleware
await jest.unstable_mockModule('../../middleware/cache.js', () => ({
    default: () => (req, res, next) => next(),
}));


// import app after mocking
const { default: app } = await import("../../app.js");
const { default: Quiz } = await import("../../models/Quiz.js");


describe("Quiz integration (ESM)", () => {

    afterEach(async () => {
        await Quiz.deleteMany({});
    });

    it("GET /health returns ok", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "ok");
    });

    it("GET /api/quizzes returns array", async () => {
      const res = await request(app).get("/api/quizzes").expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("POST /api/quizzes creates quiz (protected route)", async () => {
        const payload = { title: "Test Quiz", category: "Test Category" };
        const res = await request(app)
          .post("/api/quizzes")
          .send(payload)
          .expect(201);

        expect(res.body).toMatchObject({ title: "Test Quiz" });
      });
  });
