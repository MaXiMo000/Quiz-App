import { debugUserXP } from "../../controllers/debugController.js";
import UserQuiz from "../../models/User.js";
import XPLog from "../../models/XPLog.js";

jest.mock("../../models/User.js");
jest.mock("../../models/XPLog.js");

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
    });
});
