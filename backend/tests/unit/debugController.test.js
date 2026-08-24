/**
 * These assertions were written against a response shape the controllers no
 * longer use. The repo standardised on utils/responseHelper -- every success
 * is now {status, statusCode, message, data} and failures throw AppError
 * rather than writing a body -- and the suite was never updated. CI could not
 * report it because the workflow ran `npm test || echo "Tests failed"`, which
 * exits 0 whatever happens.
 *
 * Rewritten against what the controllers actually do, plus the access-control
 * assertions the endpoints never had.
 */
import { debugUserXP, resetUserXP, fixGoogleOAuthUsers } from "../../controllers/debugController.js";
import UserQuiz from "../../models/User.js";
import XPLog from "../../models/XPLog.js";

jest.mock("../../models/User.js", () => ({
    __esModule: true,
    default: { findById: jest.fn(), find: jest.fn() },
}));

jest.mock("../../models/XPLog.js", () => ({
    __esModule: true,
    default: { find: jest.fn(), aggregate: jest.fn(), deleteMany: jest.fn() },
}));

/** The envelope every successful response is wrapped in. */
const success = (dataMatcher) => expect.objectContaining({
    status: "success",
    data: dataMatcher,
});

describe("Debug Controller", () => {
    let req, res;

    beforeEach(() => {
        req = { params: { userId: "userId" }, user: { id: "admin1", role: "admin" } };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    afterEach(() => jest.clearAllMocks());

    describe("debugUserXP", () => {
        const seedUser = (overrides = {}) => {
            UserQuiz.findById.mockResolvedValue({
                _id: "userId", name: "testuser", xp: 100, totalXP: 1000,
                level: 1, loginStreak: 0, quizStreak: 0,
                lastLogin: new Date(), lastQuizDate: new Date(),
                createdAt: new Date(), ...overrides,
            });
            XPLog.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
            });
            XPLog.aggregate.mockResolvedValue([{ totalXP: 1000 }]);
        };

        it("returns the XP debug payload inside the standard envelope", async () => {
            seedUser();
            await debugUserXP(req, res);
            expect(res.json).toHaveBeenCalledWith(success(expect.objectContaining({
                user: expect.any(Object),
                recentXPLogs: expect.any(Array),
                calculatedTotalXP: 1000,
                xpMismatch: false,
            })));
        });

        it("flags a mismatch between logged XP and stored totalXP", async () => {
            seedUser({ totalXP: 7 });
            await debugUserXP(req, res);
            expect(res.json).toHaveBeenCalledWith(success(
                expect.objectContaining({ xpMismatch: true })));
        });

        it("404s when the user does not exist", async () => {
            UserQuiz.findById.mockResolvedValue(null);
            await debugUserXP(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ status: "error", message: "User not found" }));
        });

        it("throws rather than reporting a 200 when the database fails", async () => {
            UserQuiz.findById.mockRejectedValue(new Error("Database error"));
            await expect(debugUserXP(req, res)).rejects.toThrow("Server error");
            expect(res.json).not.toHaveBeenCalled();
        });
    });

    describe("resetUserXP", () => {
        it("zeroes the progression fields and confirms", async () => {
            const mockUser = {
                _id: "userId", xp: 100, totalXP: 1000, level: 5,
                loginStreak: 3, quizStreak: 2,
                lastLogin: new Date(), lastQuizDate: new Date(),
                save: jest.fn().mockResolvedValue(true),
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
            expect(res.json).toHaveBeenCalledWith(success(
                expect.objectContaining({ user: mockUser })));
        });

        it("404s when the user does not exist", async () => {
            UserQuiz.findById.mockResolvedValue(null);
            await resetUserXP(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it("throws when the database fails", async () => {
            UserQuiz.findById.mockRejectedValue(new Error("Database error"));
            await expect(resetUserXP(req, res)).rejects.toThrow("Server error");
        });
    });

    describe("fixGoogleOAuthUsers", () => {
        const seedTwo = () => {
            const users = [
                { name: "user1", email: "user1@example.com", xp: 50, save: jest.fn().mockResolvedValue(true) },
                { name: "user2", email: "user2@example.com", xp: 0, save: jest.fn().mockResolvedValue(true) },
            ];
            UserQuiz.find.mockResolvedValue(users);
            return users;
        };

        it("backfills the missing fields and reports counts", async () => {
            const users = seedTwo();
            await fixGoogleOAuthUsers(req, res);
            expect(users[0].totalXP).toBe(50);
            expect(users[0].quizStreak).toBe(0);
            expect(users[0].save).toHaveBeenCalled();
            expect(users[1].save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(success(
                expect.objectContaining({ totalFound: 2, fixedCount: 2 })));
        });

        it("does not leak any user's name or email in the response", async () => {
            // This endpoint used to return {name, email} for every user it
            // touched, which made a repair route into a user directory for
            // whoever could reach it.
            seedTwo();
            await fixGoogleOAuthUsers(req, res);
            const body = JSON.stringify(res.json.mock.calls[0][0]);
            expect(body).not.toContain("@example.com");
            expect(body).not.toContain("user1");
            expect(body).not.toContain("fixedUsers");
        });

        it("handles there being nothing to fix", async () => {
            UserQuiz.find.mockResolvedValue([]);
            await fixGoogleOAuthUsers(req, res);
            expect(res.json).toHaveBeenCalledWith(success(
                expect.objectContaining({ totalFound: 0, fixedCount: 0 })));
        });

        it("throws when the database fails", async () => {
            UserQuiz.find.mockRejectedValue(new Error("Database error"));
            await expect(fixGoogleOAuthUsers(req, res)).rejects.toThrow("Server error");
        });
    });
});
