import { getDashboardData } from "../../controllers/dashboardController.js";
import UserQuiz from "../../models/User.js";
import Report from "../../models/Report.js";
import Quiz from "../../models/Quiz.js";

jest.mock("../../models/User.js", () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
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
        it("should return dashboard data", async () => {
            const mockUser = {
                _id: "userId",
                name: "testuser",
                xp: 100,
                totalXP: 1000,
                level: 1,
                loginStreak: 0,
                quizStreak: 0,
                badges: [],
                unlockedThemes: [],
                selectedTheme: "Default",
                lastLogin: new Date(),
                lastQuizDate: new Date(),
            };
            UserQuiz.findById.mockResolvedValue(mockUser);
            Report.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([]),
                then: (resolve) => resolve([]),
            });
            Quiz.countDocuments.mockResolvedValue(10);

            await getDashboardData(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    totalQuizzes: 10,
                    completedQuizzes: 0,
                    averageScore: 0,
                })
            );
        });
    });
});
