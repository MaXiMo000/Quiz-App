import { getDashboardData, getAllCategories } from "../../controllers/dashboardController.js";
import UserQuiz from "../../models/User.js";
import Report from "../../models/Report.js";
import Quiz from "../../models/Quiz.js";
import { ok, err } from "../helpers/envelope.js";
import { query } from "../helpers/query.js";

// dashboardController validates ObjectId format before querying, so a
// literal VALID_USER_ID 400s and never reaches the logic under test.
const VALID_USER_ID = "507f191e810c19729de860ea";

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
            params: { userId: VALID_USER_ID },
            query: {},
            user: { id: VALID_USER_ID },
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
                _id: VALID_USER_ID,
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

            // getStudyTimeData does report.questions.reduce(...), and the
            // streak/progress helpers date-sort on createdAt. Without those
            // fields the controller threw and the 500 masked the cause.
            const mockReports = [
                { score: 8, total: 10, quizName: "Quiz 1", questions: [], createdAt: new Date() },
                { score: 6, total: 10, quizName: "Quiz 2", questions: [], createdAt: new Date() },
                { score: 9, total: 10, quizName: "Quiz 3", questions: [], createdAt: new Date() },
            ];

            UserQuiz.findById.mockResolvedValue(mockUser);
            // getDashboardData and its helpers query Report several ways:
            // awaited directly, and chained through .sort().limit().lean().
            Report.find.mockImplementation(() => query(mockReports));
            // These are mocked but were never given return values, so they
            // handed back undefined and the first chained call threw -- which
            // the controller's catch turned into a generic 500.
            Quiz.find.mockImplementation(() => query([]));
            UserQuiz.find.mockImplementation(() => query([]));
            Quiz.countDocuments.mockResolvedValue(15);

            await getDashboardData(req, res);

            expect(res.json).toHaveBeenCalledWith(ok(expect.objectContaining({
                    totalQuizzes: 15,
                    completedQuizzes: 3,
                    averageScore: expect.any(Number),
                    userLevel: 1,
                    userXP: 100
                })));
        });

        it("should handle user not found", async () => {
            UserQuiz.findById.mockResolvedValue(null);

            await getDashboardData(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(err("User not found"));
        });

        it("should handle database errors", async () => {
            UserQuiz.findById.mockRejectedValue(new Error("Database error"));

            await expect(getDashboardData(req, res)).rejects.toThrow("Error fetching dashboard data");
      // The controller throws; error middleware renders it. Asserting the
      // throw keeps this meaningful instead of asserting a body that is
      // never written.
      expect(res.json).not.toHaveBeenCalled();
        });
    });

    describe("getAllCategories", () => {
        it("should return all quiz categories", async () => {
            const mockCategories = ["JavaScript", "Python", "React", "Node.js"];
            Quiz.distinct.mockResolvedValue(mockCategories);

            await getAllCategories(req, res);

            expect(res.json).toHaveBeenCalledWith(ok({
                categories: mockCategories,
                count: mockCategories.length
            }));
        });

        it("should handle database errors", async () => {
            Quiz.distinct.mockRejectedValue(new Error("Database error"));

            await expect(getAllCategories(req, res)).rejects.toThrow("Error fetching categories");
      // The controller throws; error middleware renders it. Asserting the
      // throw keeps this meaningful instead of asserting a body that is
      // never written.
      expect(res.json).not.toHaveBeenCalled();
        });
    });
});
