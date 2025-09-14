import {
    getSmartRecommendations,
    getAdaptiveDifficulty,
    getLearningAnalytics,
    trackUserPerformance,
    updateUserPreferences
} from "../../controllers/intelligenceController.js";
import UserQuiz from "../../models/User.js";

// Mock the models
jest.mock("../../models/User.js", () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        aggregate: jest.fn(),
    },
}));

jest.mock("../../models/Report.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
    },
}));

jest.mock("../../models/Quiz.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        findById: jest.fn(),
        findOne: jest.fn(),
        aggregate: jest.fn(),
    },
}));

jest.mock("../../models/LearningAnalytics.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
    },
}));

jest.mock("../../models/CognitiveMetrics.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
    },
}));

// Mock the analytics service
jest.mock("../../services/analyticsService.js", () => ({
    trackLearningAnalytics: jest.fn(),
    trackCognitiveMetrics: jest.fn(),
}));

// Import the mocked functions
import { trackLearningAnalytics, trackCognitiveMetrics } from "../../services/analyticsService.js";

// Mock the verifyToken middleware
jest.mock("../../middleware/auth.js", () => ({
    verifyToken: (req, res, next) => {
        req.user = { id: "60c72b9f9b1d8c001f8e4a3a", role: "user" };
        next();
    },
}));

describe("Intelligence Controller", () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            user: { id: "60c72b9f9b1d8c001f8e4a3a", role: "user" }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe("getSmartRecommendations", () => {
        it("should handle database errors gracefully", async () => {
            UserQuiz.findById.mockRejectedValue(new Error("Database error"));

            await getSmartRecommendations(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Server error"
            });
        });

        it("should handle user not found", async () => {
            UserQuiz.findById.mockResolvedValue(null);

            await getSmartRecommendations(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "User not found"
            });
        });

        it("should handle database errors", async () => {
            UserQuiz.findById.mockRejectedValue(new Error("Database error"));

            await getSmartRecommendations(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Server error"
            });
        });
    });

    describe("getAdaptiveDifficulty", () => {
        it("should handle database errors gracefully", async () => {
            req.query = { category: "Programming" };
            UserQuiz.findById.mockRejectedValue(new Error("Database error"));

            await getAdaptiveDifficulty(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Server error"
            });
        });

        it("should handle user not found", async () => {
            req.query = { category: "Programming" };
            UserQuiz.findById.mockResolvedValue(null);

            await getAdaptiveDifficulty(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "User not found"
            });
        });
    });

    describe("getLearningAnalytics", () => {
        it("should handle database errors gracefully", async () => {
            UserQuiz.findById.mockRejectedValue(new Error("Database error"));

            await getLearningAnalytics(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Server error"
            });
        });

        it("should handle user not found", async () => {
            UserQuiz.findById.mockResolvedValue(null);

            await getLearningAnalytics(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "User not found"
            });
        });
    });

    describe("trackUserPerformance", () => {
        it("should track user performance and update analytics", async () => {
            trackLearningAnalytics.mockResolvedValue(true);
            trackCognitiveMetrics.mockResolvedValue(true);

            req.body = {
                quizId: "quizId",
                score: 8,
                totalQuestions: 10,
                timeSpent: 300
            };

            await trackUserPerformance(req, res);

            expect(trackLearningAnalytics).toHaveBeenCalledWith("60c72b9f9b1d8c001f8e4a3a", "quizId", {
                engagement: 300,
                comprehension: 0.8
            });
            expect(trackCognitiveMetrics).toHaveBeenCalledWith("60c72b9f9b1d8c001f8e4a3a", "quizId", {
                responseTime: 30
            });
            expect(res.json).toHaveBeenCalledWith({
                message: "Performance tracked successfully"
            });
        });

        it("should handle missing required fields", async () => {
            req.body = {
                quizId: "quizId"
                // Missing other required fields
            };

            await trackUserPerformance(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Missing required fields: quizId, score, totalQuestions, and timeSpent are required"
            });
        });
    });

    describe("updateUserPreferences", () => {
        it("should update user preferences successfully", async () => {
            const mockUser = {
                _id: "userId",
                preferences: {
                    favoriteCategories: [],
                    strongAreas: [],
                    weakAreas: []
                },
                performanceHistory: [],
                save: jest.fn().mockResolvedValue(true)
            };

            UserQuiz.findById.mockResolvedValue(mockUser);

            req.body = {
                quizId: "quizId",
                score: 8,
                totalQuestions: 10,
                timeSpent: 300,
                category: "Programming",
                difficulty: "medium"
            };

            await updateUserPreferences(req, res);

            expect(mockUser.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                message: "User preferences updated successfully",
                preferences: mockUser.preferences
            });
        });

        it("should handle user not found", async () => {
            UserQuiz.findById.mockResolvedValue(null);

            req.body = {
                quizId: "quizId",
                score: 8,
                totalQuestions: 10,
                timeSpent: 300,
                category: "Programming",
                difficulty: "medium"
            };

            await updateUserPreferences(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "User not found"
            });
        });
    });
});
