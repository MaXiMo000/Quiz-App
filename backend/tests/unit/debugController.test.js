import { debugUserXP, resetUserXP, fixGoogleOAuthUsers } from "../../controllers/debugController.js";
import UserQuiz from "../../models/User.js";
import XPLog from "../../models/XPLog.js";

jest.mock("../../models/User.js", () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
        find: jest.fn(),
    },
}));

jest.mock("../../models/XPLog.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        aggregate: jest.fn(),
        deleteMany: jest.fn(),
    },
}));

describe("Debug Controller", () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { userId: "userId" },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("debugUserXP", () => {
        it("should return user XP debug info", async () => {
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
                createdAt: new Date(),
            };
            UserQuiz.findById.mockResolvedValue(mockUser);
            XPLog.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue([]),
                }),
            });
            XPLog.aggregate.mockResolvedValue([{ totalXP: 1000 }]);

            await debugUserXP(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: expect.any(Object),
                    recentXPLogs: expect.any(Array),
                    calculatedTotalXP: 1000,
                    xpMismatch: false,
                })
            );
        });

        it("should handle user not found", async () => {
            UserQuiz.findById.mockResolvedValue(null);

            await debugUserXP(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: "User not found"
            });
        });

        it("should handle database errors", async () => {
            UserQuiz.findById.mockRejectedValue(new Error("Database error"));

            await debugUserXP(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Server error",
                details: "Database error"
            });
        });
    });

    describe("resetUserXP", () => {
        it("should reset user XP successfully", async () => {
            const mockUser = {
                _id: "userId",
                name: "testuser",
                xp: 100,
                totalXP: 1000,
                level: 5,
                loginStreak: 10,
                quizStreak: 5,
                lastLogin: new Date(),
                lastQuizDate: new Date(),
                save: jest.fn().mockResolvedValue(true)
            };

            UserQuiz.findById.mockResolvedValue(mockUser);

            await resetUserXP(req, res);

            expect(mockUser.xp).toBe(0);
            expect(mockUser.totalXP).toBe(0);
            expect(mockUser.level).toBe(1);
            expect(mockUser.loginStreak).toBe(0);
            expect(mockUser.quizStreak).toBe(0);
            expect(mockUser.lastLogin).toBeNull();
            expect(mockUser.lastQuizDate).toBeNull();
            expect(mockUser.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                message: "User XP reset successfully",
                user: mockUser
            });
        });

        it("should handle user not found", async () => {
            UserQuiz.findById.mockResolvedValue(null);

            await resetUserXP(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: "User not found"
            });
        });

        it("should handle database errors", async () => {
            UserQuiz.findById.mockRejectedValue(new Error("Database error"));

            await resetUserXP(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Server error",
                details: "Database error"
            });
        });
    });

    describe("fixGoogleOAuthUsers", () => {
        it("should fix Google OAuth users with missing fields", async () => {
            const mockUsers = [
                {
                    _id: "user1",
                    name: "user1",
                    totalXP: null,
                    quizStreak: null,
                    lastLogin: null,
                    lastQuizDate: null,
                    save: jest.fn().mockResolvedValue(true)
                },
                {
                    _id: "user2",
                    name: "user2",
                    totalXP: undefined,
                    quizStreak: undefined,
                    lastLogin: undefined,
                    lastQuizDate: undefined,
                    save: jest.fn().mockResolvedValue(true)
                }
            ];

            UserQuiz.find.mockResolvedValue(mockUsers);

            await fixGoogleOAuthUsers(req, res);

            expect(mockUsers[0].totalXP).toBe(0);
            expect(mockUsers[0].quizStreak).toBe(0);
            expect(mockUsers[0].lastLogin).toBeNull();
            expect(mockUsers[0].lastQuizDate).toBeNull();
            expect(mockUsers[0].save).toHaveBeenCalled();

            expect(mockUsers[1].totalXP).toBe(0);
            expect(mockUsers[1].quizStreak).toBe(0);
            expect(mockUsers[1].lastLogin).toBeNull();
            expect(mockUsers[1].lastQuizDate).toBeNull();
            expect(mockUsers[1].save).toHaveBeenCalled();

            expect(res.json).toHaveBeenCalledWith({
                message: "Fixed 2 users successfully",
                totalFound: 2,
                fixedUsers: [
                    { name: "user1", email: undefined },
                    { name: "user2", email: undefined }
                ]
            });
        });

        it("should handle no users to fix", async () => {
            UserQuiz.find.mockResolvedValue([]);

            await fixGoogleOAuthUsers(req, res);

            expect(res.json).toHaveBeenCalledWith({
                message: "Fixed 0 users successfully",
                totalFound: 0,
                fixedUsers: []
            });
        });

        it("should handle database errors", async () => {
            UserQuiz.find.mockRejectedValue(new Error("Database error"));

            await fixGoogleOAuthUsers(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Server error",
                details: "Database error"
            });
        });
    });
});
