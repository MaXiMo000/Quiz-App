import { getDashboardData, getAllCategories } from "../../controllers/dashboardController.js";
import UserQuiz from "../../models/User.js";
import Report from "../../models/Report.js";
import Quiz from "../../models/Quiz.js";

jest.mock("../../models/User.js", () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
        find: jest.fn(),
    },
}));
jest.mock("../../models/Report.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
    },
}));
jest.mock("../../models/Quiz.js", () => ({
    __esModule: true,
    default: {
        countDocuments: jest.fn(),
        find: jest.fn(),
        distinct: jest.fn(),
    },
}));
jest.mock("../../models/XPLog.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
    },
}));

describe("Dashboard Controller", () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { userId: "userId" },
            query: {},
            user: { id: "userId" },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe("getDashboardData", () => {
        it("should return dashboard data with user info and quiz stats", async () => {
            const mockUser = {
                _id: "userId",
                name: "testuser",
                xp: 100,
                totalXP: 1000,
                level: 1,
                loginStreak: 5,
                quizStreak: 3,
                badges: ["First Quiz", "Speed Genius"],
                unlockedThemes: ["Dark", "Light"],
                selectedTheme: "Dark",
                lastLogin: new Date(),
                lastQuizDate: new Date(),
                role: "user"
            };

            const mockReports = [
                { score: 8, total: 10, quizName: "Quiz 1" },
                { score: 6, total: 10, quizName: "Quiz 2" },
                { score: 9, total: 10, quizName: "Quiz 3" },
            ];

            UserQuiz.findById.mockResolvedValue(mockUser);
            Report.find.mockResolvedValue(mockReports);
            Quiz.countDocuments.mockResolvedValue(15);

            await getDashboardData(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    totalQuizzes: 15,
                    completedQuizzes: 3,
                    averageScore: expect.any(Number),
                    userLevel: 1,
                    userXP: 100
                })
            );
        });

        it("should handle user not found", async () => {
            UserQuiz.findById.mockResolvedValue(null);

            await getDashboardData(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
        });

        it("should handle database errors", async () => {
            UserQuiz.findById.mockRejectedValue(new Error("Database error"));

            await getDashboardData(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error fetching dashboard data",
                error: "Database error"
            });
        });
    });

    describe("getAllCategories", () => {
        it("should return all quiz categories", async () => {
            const mockCategories = ["JavaScript", "Python", "React", "Node.js"];
            Quiz.distinct.mockResolvedValue(mockCategories);

            await getAllCategories(req, res);

            expect(res.json).toHaveBeenCalledWith({
                categories: mockCategories,
                count: mockCategories.length
            });
        });

        it("should handle database errors", async () => {
            Quiz.distinct.mockRejectedValue(new Error("Database error"));

            await getAllCategories(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error fetching categories",
                error: "Database error"
            });
        });
    });
});
