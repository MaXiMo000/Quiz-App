import { createReport, getReports } from "../../controllers/reportController.js";
import Report from "../../models/Report.js";
import UserQuiz from "../../models/User.js";
import XPLog from "../../models/XPLog.js";
import mongoose from "mongoose";

jest.mock("../../models/Report.js");
jest.mock("../../models/User.js");
jest.mock("../../models/XPLog.js");

describe("Report Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
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

  describe("createReport", () => {
    it("should create a new report", async () => {
        req.body = {
            username: "testuser",
            quizName: "Test Quiz",
            score: 10,
            total: 10,
            questions: [
                {
                    questionText: "What is 2+2?",
                    options: ["2", "3", "4", "5"],
                    userAnswer: "C",
                    userAnswerText: "4",
                    correctAnswer: "C",
                    correctAnswerText: "4",
                    answerTime: 5,
                }
            ],
        };

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
            save: jest.fn().mockResolvedValue(true),
        };

        mongoose.Types.ObjectId.isValid = jest.fn().mockReturnValue(true);
        UserQuiz.findById.mockResolvedValue(mockUser);
        Report.prototype.save = jest.fn().mockResolvedValue({});
        XPLog.prototype.save = jest.fn().mockResolvedValue({});

        await createReport(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.any(Object));
    });
});

  describe("getReports", () => {
    it("should return all reports", async () => {
      Report.find = jest.fn().mockResolvedValue([{}, {}]);

      await getReports(req, res);

      expect(res.json).toHaveBeenCalledWith([{}, {}]);
    });
  });
});
