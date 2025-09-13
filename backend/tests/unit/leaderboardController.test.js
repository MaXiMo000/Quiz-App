import { getWeeklyXP, getMonthlyXP } from "../../controllers/leaderboardController.js";
import User from "../../models/User.js";
import XPLog from "../../models/XPLog.js";

jest.mock("../../models/XPLog.js");
jest.mock("../../models/User.js");

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
        User.findById.mockResolvedValueOnce({
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
            User.findById.mockResolvedValueOnce({
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
    });
});
