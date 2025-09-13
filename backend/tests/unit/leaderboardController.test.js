import { getWeeklyXP, getMonthlyXP, getAllTimeXP } from "../../controllers/leaderboardController.js";
import UserQuiz from "../../models/User.js";
import XPLog from "../../models/XPLog.js";

// Mock the models
jest.mock("../../models/XPLog.js", () => ({
    __esModule: true,
    default: {
        aggregate: jest.fn(),
    },
}));

jest.mock("../../models/User.js", () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
    },
}));

describe("Leaderboard Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
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

  describe("getWeeklyXP", () => {
    it("should return weekly XP data", async () => {
        XPLog.aggregate = jest.fn().mockResolvedValue([
            { _id: "user1", totalXP: 100 },
            { _id: "user2", totalXP: 200 },
        ]);
        UserQuiz.findById.mockResolvedValueOnce({
            name: "User1",
            badges: [],
            save: jest.fn().mockResolvedValue(true),
        }).mockResolvedValueOnce({
            name: "User2",
            badges: [],
            save: jest.fn().mockResolvedValue(true),
        });

        await getWeeklyXP(req, res);

        expect(res.json).toHaveBeenCalledWith([
            { username: "User1", xp: 100 },
            { username: "User2", xp: 200 },
        ]);
    });
    });

    describe("getMonthlyXP", () => {
        it("should return monthly XP data", async () => {
            XPLog.aggregate = jest.fn().mockResolvedValue([
                { _id: "user1", totalXP: 1000 },
                { _id: "user2", totalXP: 2000 },
            ]);
            UserQuiz.findById.mockResolvedValueOnce({
                name: "User1",
                badges: [],
                save: jest.fn().mockResolvedValue(true),
            }).mockResolvedValueOnce({
                name: "User2",
                badges: [],
                save: jest.fn().mockResolvedValue(true),
            });

            await getMonthlyXP(req, res);

            expect(res.json).toHaveBeenCalledWith([
                { username: "User1", xp: 1000 },
                { username: "User2", xp: 2000 },
            ]);
        });

        it("should handle database errors", async () => {
            XPLog.aggregate = jest.fn().mockRejectedValue(new Error("Database error"));

            await getMonthlyXP(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Server error"
            });
        });
    });

    describe("getAllTimeXP", () => {
        it("should return all-time XP data", async () => {
            XPLog.aggregate = jest.fn().mockResolvedValue([
                { _id: "user1", totalXP: 5000 },
                { _id: "user2", totalXP: 3000 },
                { _id: "user3", totalXP: 1000 },
            ]);
            UserQuiz.findById.mockResolvedValueOnce({
                name: "User1",
                badges: [],
                save: jest.fn().mockResolvedValue(true),
            }).mockResolvedValueOnce({
                name: "User2",
                badges: [],
                save: jest.fn().mockResolvedValue(true),
            }).mockResolvedValueOnce({
                name: "User3",
                badges: [],
                save: jest.fn().mockResolvedValue(true),
            });

            await getAllTimeXP(req, res);

            expect(res.json).toHaveBeenCalledWith([
                { username: "User1", xp: 5000 },
                { username: "User2", xp: 3000 },
                { username: "User3", xp: 1000 },
            ]);
        });

        it("should handle empty leaderboard", async () => {
            XPLog.aggregate = jest.fn().mockResolvedValue([]);

            await getAllTimeXP(req, res);

            expect(res.json).toHaveBeenCalledWith([]);
        });

        it("should handle database errors", async () => {
            XPLog.aggregate = jest.fn().mockRejectedValue(new Error("Database error"));

            await getAllTimeXP(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Server error"
            });
        });
    });

    describe("Badge Assignment", () => {
        it("should assign Weekly Champion badge to first place", async () => {
            const mockUser = {
                name: "Champion",
                badges: [],
                save: jest.fn().mockResolvedValue(true),
            };

            XPLog.aggregate = jest.fn().mockResolvedValue([
                { _id: "user1", totalXP: 1000 },
            ]);
            UserQuiz.findById.mockResolvedValue(mockUser);

            await getWeeklyXP(req, res);

            expect(mockUser.badges).toContain("Weekly Champion");
            expect(mockUser.badges).toContain("Weekly Top 10");
            expect(mockUser.save).toHaveBeenCalled();
        });

        it("should assign Monthly Top 10 badge to top 10 users", async () => {
            const mockUsers = Array.from({ length: 12 }, (_, i) => ({
                name: `User${i + 1}`,
                badges: [],
                save: jest.fn().mockResolvedValue(true),
            }));

            XPLog.aggregate = jest.fn().mockResolvedValue(
                Array.from({ length: 12 }, (_, i) => ({ _id: `user${i + 1}`, totalXP: 1000 - i * 10 }))
            );
            UserQuiz.findById.mockImplementation((id) => {
                const index = parseInt(id.replace("user", "")) - 1;
                return Promise.resolve(mockUsers[index]);
            });

            await getMonthlyXP(req, res);

            // First user should get both badges
            expect(mockUsers[0].badges).toContain("Monthly Champion");
            expect(mockUsers[0].badges).toContain("Monthly Top 10");

            // Users 1-9 should get Top 10 badge
            for (let i = 1; i < 10; i++) {
                expect(mockUsers[i].badges).toContain("Monthly Top 10");
            }

            // User 10 and 11 should not get Top 10 badge
            expect(mockUsers[10].badges).not.toContain("Monthly Top 10");
            expect(mockUsers[11].badges).not.toContain("Monthly Top 10");
        });
    });
});
