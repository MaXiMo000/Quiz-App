import { createReport, getReports, getReportsUser, getReportsUserID } from "../../controllers/reportController.js";
import Report from "../../models/Report.js";
import UserQuiz from "../../models/User.js";
import XPLog from "../../models/XPLog.js";
import Quiz from "../../models/Quiz.js";
import mongoose from "mongoose";

// Mock all models
jest.mock("../../models/Report.js", () => {
    const mockReport = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue({})
    }));
    mockReport.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
    });
    mockReport.findById = jest.fn();
    mockReport.findOne = jest.fn();
    return {
        __esModule: true,
        default: mockReport
    };
});

jest.mock("../../models/User.js", () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
        findOne: jest.fn()
    }
}));

jest.mock("../../models/XPLog.js", () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue({})
    }))
}));

jest.mock("../../models/Quiz.js", () => ({
    __esModule: true,
    default: {
        findOne: jest.fn()
    }
}));

// Mock the review scheduler service
jest.mock("../../services/reviewScheduler.js", () => ({
    createInitialReviewSchedules: jest.fn().mockResolvedValue(true)
}));

// Mock the logger
jest.mock("../../utils/logger.js", () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

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
    it("should create a new report successfully", async () => {
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

        const mockQuiz = {
            _id: "quizId",
            title: "Test Quiz",
            questions: [
                {
                    _id: "q1",
                    questionText: "What is 2+2?",
                    options: ["2", "3", "4", "5"],
                    correctAnswer: "C"
                }
            ]
        };

        mongoose.Types.ObjectId.isValid = jest.fn().mockReturnValue(true);
        UserQuiz.findById.mockResolvedValue(mockUser);
        Quiz.findOne.mockResolvedValue(mockQuiz);
        Report.prototype.save = jest.fn().mockResolvedValue({});
        XPLog.prototype.save = jest.fn().mockResolvedValue({});

        await createReport(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.any(Object));
    });

    it("should handle missing required fields", async () => {
        req.body = {
            username: "testuser",
            // Missing quizName, score, total, questions
        };

        await createReport(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "Missing required fields"
        });
    });

    it("should handle user not found", async () => {
        req.body = {
            username: "nonexistent",
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

        mongoose.Types.ObjectId.isValid = jest.fn().mockReturnValue(false);
        UserQuiz.findById.mockResolvedValue(null);
        UserQuiz.findOne.mockResolvedValue(null);

        await createReport(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            message: "User not found"
        });
    });

    it("should handle database errors", async () => {
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

        // Mock user lookup to return a user
        UserQuiz.findById.mockResolvedValue({
            _id: "userId",
            name: "testuser",
            totalXP: 100,
            badges: []
        });

        // Mock Quiz.findOne to return a quiz
        Quiz.findOne.mockResolvedValue({
            _id: "quizId",
            title: "Test Quiz",
            questions: []
        });

        // Mock the Report save method to throw an error
        Report.prototype.save = jest.fn().mockRejectedValue(new Error("Database error"));

        await createReport(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "Error saving report",
            error: "Database error"
        });
    });
  });

  describe("getReports", () => {
    it("should return all reports successfully", async () => {
      const mockReports = [
        { _id: "1", username: "user1", quizName: "Quiz 1" },
        { _id: "2", username: "user2", quizName: "Quiz 2" }
      ];
      Report.find.mockResolvedValue(mockReports);

      await getReports(req, res);

      expect(res.json).toHaveBeenCalledWith(mockReports);
    });

    it("should handle database errors", async () => {
      Report.find.mockRejectedValue(new Error("Database error"));

      await getReports(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error fetching reports",
        error: expect.any(Error)
      });
    });
  });

  describe("getReportsUser", () => {
    it("should return reports for specific user", async () => {
      req.query = { username: "testuser" };
      const mockReports = [
        { _id: "1", username: "testuser", quizName: "Quiz 1" },
        { _id: "2", username: "testuser", quizName: "Quiz 2" }
      ];
      Report.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockReports)
      });

      await getReportsUser(req, res);

      expect(Report.find).toHaveBeenCalledWith({ username: "testuser" });
      expect(res.json).toHaveBeenCalledWith(mockReports);
    });

    it("should return all reports when no username provided", async () => {
      req.query = {};
      const mockReports = [
        { _id: "1", username: "user1", quizName: "Quiz 1" },
        { _id: "2", username: "user2", quizName: "Quiz 2" }
      ];
      Report.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockReports)
      });

      await getReportsUser(req, res);

      expect(Report.find).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith(mockReports);
    });

    it("should handle database errors", async () => {
      req.query = { username: "testuser" };
      Report.find.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error("Database error"))
      });

      await getReportsUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error retrieving reports",
        error: expect.any(Error)
      });
    });
  });

  describe("getReportsUserID", () => {
    it("should return report by ID successfully", async () => {
      req.params = { id: "reportId123" };
      const mockReport = {
        _id: "reportId123",
        username: "testuser",
        quizName: "Test Quiz",
        score: 10,
        total: 10
      };
      Report.findById.mockResolvedValue(mockReport);

      await getReportsUserID(req, res);

      expect(Report.findById).toHaveBeenCalledWith("reportId123");
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });

    it("should handle report not found", async () => {
      req.params = { id: "nonexistent" };
      Report.findById.mockResolvedValue(null);

      await getReportsUserID(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Report not found"
      });
    });

    it("should handle database errors", async () => {
      req.params = { id: "reportId123" };
      Report.findById.mockRejectedValue(new Error("Database error"));

      await getReportsUserID(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error retrieving report",
        error: expect.any(Error)
      });
    });
  });
});
