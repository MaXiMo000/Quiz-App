import {
    getLearningPaths,
    getLearningPath,
    startLearningPath,
    updateNodeProgress,
    getLearningAnalytics
} from "../../controllers/learningPathController.js";
import { LearningPath, UserPathProgress } from "../../models/LearningPath.js";
import User from "../../models/User.js";
import Report from "../../models/Report.js";
import { ok, err } from "../helpers/envelope.js";

jest.mock("../../models/LearningPath.js", () => ({
    __esModule: true,
    LearningPath: {
        find: jest.fn(),
        findById: jest.fn(),
        countDocuments: jest.fn(),
    },
    UserPathProgress: {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
    },
    Competency: {
        find: jest.fn(),
    },
    UserCompetency: {
        find: jest.fn(),
    },
}));
jest.mock("../../models/User.js", () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
    }
}));
jest.mock("../../models/Report.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
    }
}));
jest.mock("../../utils/seedLearningPaths.js");

describe("Learning Path Controller", () => {
    let req, res;

    beforeEach(() => {
        req = {
            query: {},
            user: { id: "userId" },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("getLearningPaths", () => {
        it("should return learning paths", async () => {
            const mockPaths = [
                {
                    _id: "lp1",
                    title: "LP 1",
                    subject: "JavaScript",
                    quizzes: [{ _id: "quiz1" }],
                    toObject: () => ({ _id: "lp1", title: "LP 1", subject: "JavaScript", quizzes: [{ _id: "quiz1" }] })
                }
            ];
            const mockReports = [
                {
                    _id: "r1",
                    username: "testuser",
                    quizName: "JavaScript Basics",
                    score: 8,
                    total: 10,
                    createdAt: new Date(),
                    toObject: () => ({ _id: "r1", username: "testuser", quizName: "JavaScript Basics", score: 8, total: 10, createdAt: new Date() })
                }
            ];

            LearningPath.find.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockPaths)
            });
            LearningPath.countDocuments.mockResolvedValue(1);
            UserPathProgress.find.mockResolvedValue([]);
            User.findById.mockResolvedValue({ name: "testuser", email: "test@example.com" });
            Report.find.mockReturnValue({
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockReports)
            });

            await getLearningPaths(req, res);

            expect(res.json).toHaveBeenCalledWith(ok(expect.objectContaining({
                    paths: expect.any(Array),
                })));
        });

        it("should handle database errors", async () => {
            LearningPath.find.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockRejectedValue(new Error("Database error"))
            });

            await expect(getLearningPaths(req, res)).rejects.toThrow("Server error");
      // The controller throws; error middleware renders it. Asserting the
      // throw keeps this meaningful instead of asserting a body that is
      // never written.
      expect(res.json).not.toHaveBeenCalled();
        });
    });

    describe("getLearningPath", () => {
        it("should handle path not found", async () => {
            LearningPath.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(null)
            });

            req.params = { pathId: "nonexistent" };

            await getLearningPath(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(err("Learning path not found"));
        });

        it("should handle database errors", async () => {
            LearningPath.findById.mockReturnValue({
                populate: jest.fn().mockRejectedValue(new Error("Database error"))
            });

            req.params = { pathId: "lp1" };

            await expect(getLearningPath(req, res)).rejects.toThrow("Server error");
      // The controller throws; error middleware renders it. Asserting the
      // throw keeps this meaningful instead of asserting a body that is
      // never written.
      expect(res.json).not.toHaveBeenCalled();
        });
    });

    describe("startLearningPath", () => {
        it("should handle path not found", async () => {
            LearningPath.findById.mockResolvedValue(null);

            req.params = { pathId: "nonexistent" };

            await startLearningPath(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(err("Learning path not found"));
        });

        it("should handle already completed path", async () => {
            const mockPath = {
                _id: "lp1",
                title: "JavaScript Fundamentals"
            };
            const mockProgress = {
                _id: "progress1",
                user: "userId",
                learningPath: "lp1",
                status: "completed"
            };

            LearningPath.findById.mockResolvedValue(mockPath);
            UserPathProgress.findOne.mockResolvedValue(mockProgress);

            req.params = { pathId: "lp1" };

            await startLearningPath(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(err("Learning path already completed"));
        });

        it("should handle database errors", async () => {
            LearningPath.findById.mockRejectedValue(new Error("Database error"));

            req.params = { pathId: "lp1" };

            await expect(startLearningPath(req, res)).rejects.toThrow("Server error");
      // The controller throws; error middleware renders it. Asserting the
      // throw keeps this meaningful instead of asserting a body that is
      // never written.
      expect(res.json).not.toHaveBeenCalled();
        });
    });

    describe("updateNodeProgress", () => {
        it("should handle user progress not found", async () => {
            UserPathProgress.findOne.mockResolvedValue(null);

            req.params = { pathId: "lp1", nodeId: "node1" };
            req.body = { status: "completed", score: 85 };

            await updateNodeProgress(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(err("User progress not found"));
        });

        it("should handle database errors", async () => {
            UserPathProgress.findOne.mockRejectedValue(new Error("Database error"));

            req.params = { pathId: "lp1", nodeId: "node1" };
            req.body = { status: "completed", score: 85 };

            await expect(updateNodeProgress(req, res)).rejects.toThrow("Server error");
      // The controller throws; error middleware renders it. Asserting the
      // throw keeps this meaningful instead of asserting a body that is
      // never written.
      expect(res.json).not.toHaveBeenCalled();
        });
    });

    describe("getLearningAnalytics", () => {
        it("should handle database errors", async () => {
            UserPathProgress.find.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockRejectedValue(new Error("Database error"))
            });

            await expect(getLearningAnalytics(req, res)).rejects.toThrow("Server error");
      // The controller throws; error middleware renders it. Asserting the
      // throw keeps this meaningful instead of asserting a body that is
      // never written.
      expect(res.json).not.toHaveBeenCalled();
        });
    });
});
