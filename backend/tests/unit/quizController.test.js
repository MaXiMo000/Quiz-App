import {
    createQuiz,
    getQuizzes,
    deleteQuiz,
    addQuestion,
    getQuizById,
    deleteQuestion,
    updateQuizStats
} from "../../controllers/quizController.js";
import Quiz from "../../models/Quiz.js";
import UserQuiz from "../../models/User.js";
import { ok, okMsg, err, invalid } from "../helpers/envelope.js";
import mongoose from "mongoose";

// quizController validates ObjectId format before it touches the database
// (a deliberate guard). Tests that pass "quizId" get a 400 and never reach
// the logic they mean to exercise, so ids here are real ObjectIds.
const VALID_QUIZ_ID = "507f1f77bcf86cd799439011";
const MISSING_QUIZ_ID = "507f1f77bcf86cd799439012";
const VALID_USER_ID = "507f191e810c19729de860ea";

jest.mock("../../models/Quiz.js", () => {
    const mockQuiz = jest.fn().mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(data)
    }));
    mockQuiz.find = jest.fn();
    mockQuiz.findById = jest.fn();
    mockQuiz.findOne = jest.fn();
    mockQuiz.deleteOne = jest.fn();
    return {
        __esModule: true,
        default: mockQuiz,
    };
});

jest.mock("../../models/User.js", () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
    },
}));

jest.mock("../../services/reviewScheduler.js", () => ({
    createInitialReviewSchedules: jest.fn(),
}));

describe("Quiz Controller", () => {
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

  describe("createQuiz", () => {
    it("should create a new quiz as admin", async () => {
      req.user.role = "admin";
      req.body = {
        title: "Test Quiz",
        category: "Programming",
      };

      const mockQuizData = {
        _id: "quizId",
        title: "Test Quiz",
        category: "Programming",
      };

      Quiz.mockImplementation(() => ({
        ...mockQuizData,
        save: jest.fn().mockResolvedValue(mockQuizData)
      }));

      await createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(ok(mockQuizData));
    });

    it("should create a new quiz as premium user", async () => {
      req.user.role = "premium";
      req.body = {
        title: "Test Quiz",
        category: "Programming",
      };

      const mockUser = { _id: "userId", name: "testuser" };
      const mockQuizData = {
        _id: "quizId",
        title: "Test Quiz",
        category: "Programming",
      };

      UserQuiz.findById.mockResolvedValue(mockUser);
      Quiz.mockImplementation(() => ({
        ...mockQuizData,
        save: jest.fn().mockResolvedValue(mockQuizData)
      }));

      await createQuiz(req, res);

      expect(UserQuiz.findById).toHaveBeenCalledWith("userId");
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(ok(mockQuizData));
    });

    it("should reject non-admin/premium users", async () => {
      req.user.role = "user";
      req.body = {
        title: "Test Quiz",
        category: "Programming",
      };

      await createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(err("Only admins or premium users can create quizzes"));
    });

    it("should handle user not found for premium user", async () => {
      req.user.role = "premium";
      req.body = {
        title: "Test Quiz",
        category: "Programming",
      };

      UserQuiz.findById.mockResolvedValue(null);

      await createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(err("User not found"));
    });

    it("should handle database errors", async () => {
      req.user.role = "admin";
      req.body = {
        title: "Test Quiz",
        category: "Programming",
      };

      Quiz.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error("Database error"))
      }));

      await expect(createQuiz(req, res)).rejects.toThrow("Failed to create quiz");
      // The controller throws; error middleware renders it. Asserting the
      // throw keeps this meaningful instead of asserting a body that is
      // never written.
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getQuizzes", () => {
    it("should return all quizzes for admin", async () => {
      req.user.role = "admin";
      const mockQuizzes = [{ _id: "quiz1" }, { _id: "quiz2" }];

      Quiz.find.mockResolvedValue(mockQuizzes);

      await getQuizzes(req, res);

      expect(Quiz.find).toHaveBeenCalledWith();
      expect(res.json).toHaveBeenCalledWith(ok(mockQuizzes));
    });

    it("should return filtered quizzes for premium user", async () => {
      req.user.role = "premium";
      // Must be a real ObjectId: the controller validates it and then builds
      // the filter from `new ObjectId(userId)`, so "userId" 400s before any
      // query happens.
      req.user.id = VALID_USER_ID;
      const mockQuizzes = [{ _id: "quiz1" }, { _id: "quiz2" }];

      // The premium branch chains .lean() onto find().
      Quiz.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockQuizzes)
      });

      await getQuizzes(req, res);

      expect(Quiz.find).toHaveBeenCalledWith({
        $or: [
          { "createdBy._id": new mongoose.Types.ObjectId(VALID_USER_ID) },
          { "createdBy._id": null }
        ]
      });
      expect(res.json).toHaveBeenCalledWith(ok(mockQuizzes));
    });

    it("should return only admin quizzes for regular user", async () => {
      req.user.role = "user";
      const mockQuizzes = [{ _id: "quiz1" }];

      Quiz.find.mockResolvedValue(mockQuizzes);

      await getQuizzes(req, res);

      expect(Quiz.find).toHaveBeenCalledWith({ "createdBy._id": null });
      expect(res.json).toHaveBeenCalledWith(ok(mockQuizzes));
    });

    it("should handle database errors", async () => {
      req.user.role = "admin";
      Quiz.find.mockRejectedValue(new Error("Database error"));

      await expect(getQuizzes(req, res)).rejects.toThrow("Failed to fetch quizzes");
      // The controller throws; error middleware renders it. Asserting the
      // throw keeps this meaningful instead of asserting a body that is
      // never written.
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("deleteQuiz", () => {
    it("should delete quiz successfully for admin", async () => {
      req.user.role = "admin";
      req.query = { title: "Test Quiz" };
      const mockQuiz = { _id: "quizId", title: "Test Quiz" };

      Quiz.findOne.mockResolvedValue(mockQuiz);
      Quiz.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await deleteQuiz(req, res);

      expect(Quiz.findOne).toHaveBeenCalledWith({ title: "Test Quiz" });
      expect(Quiz.deleteOne).toHaveBeenCalledWith({ title: "Test Quiz" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(okMsg("Quiz deleted successfully"));
    });

    it("should delete quiz successfully for premium owner", async () => {
      req.user.role = "premium";
      req.user.id = "userId";
      req.query = { title: "Test Quiz" };
      const mockQuiz = {
        _id: "quizId",
        title: "Test Quiz",
        createdBy: { _id: "userId" }
      };

      Quiz.findOne.mockResolvedValue(mockQuiz);
      Quiz.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await deleteQuiz(req, res);

      expect(Quiz.deleteOne).toHaveBeenCalledWith({ title: "Test Quiz" });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should prevent premium user from deleting others' quiz", async () => {
      req.user.role = "premium";
      req.user.id = "userId";
      req.query = { title: "Test Quiz" };
      const mockQuiz = {
        _id: "quizId",
        title: "Test Quiz",
        createdBy: { _id: "otherUser" }
      };

      Quiz.findOne.mockResolvedValue(mockQuiz);

      await deleteQuiz(req, res);

      expect(Quiz.deleteOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(err("You can only delete your own quizzes."));
    });

    it("should prevent regular user from deleting quiz", async () => {
      req.user.role = "user";
      req.query = { title: "Test Quiz" };
      const mockQuiz = { _id: "quizId", title: "Test Quiz" };

      Quiz.findOne.mockResolvedValue(mockQuiz);

      await deleteQuiz(req, res);

      expect(Quiz.deleteOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(err("You do not have permission to delete quizzes."));
    });

    it("should handle missing title", async () => {
      req.query = {};

      await deleteQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(invalid("title", "Quiz title is required"));
    });

    it("should handle quiz not found", async () => {
      req.query = { title: "Non-existent Quiz" };
      Quiz.findOne.mockResolvedValue(null);

      await deleteQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(err("Quiz not found"));
    });

    it("should handle database errors", async () => {
      req.query = { title: "Test Quiz" };
      Quiz.findOne.mockRejectedValue(new Error("Database error"));

      await expect(deleteQuiz(req, res)).rejects.toThrow("Failed to delete quiz");
      // The controller throws; error middleware renders it. Asserting the
      // throw keeps this meaningful instead of asserting a body that is
      // never written.
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("addQuestion", () => {
    it("should add question to quiz successfully for admin", async () => {
      req.user.role = "admin";
      req.params = { id: "quizId" };
      req.body = {
        question: "What is JavaScript?",
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        difficulty: "easy"
      };

      const mockQuiz = {
        _id: "quizId",
        questions: [],
        totalMarks: 0,
        passingMarks: 0,
        duration: 0,
        difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
        save: jest.fn().mockResolvedValue(true)
      };

      Quiz.findById.mockResolvedValue(mockQuiz);

      await addQuestion(req, res);

      expect(Quiz.findById).toHaveBeenCalledWith("quizId");
      expect(mockQuiz.questions).toHaveLength(1);
      expect(res.json).toHaveBeenCalledWith(ok(mockQuiz));
    });

    it("should add question for premium owner", async () => {
      req.user.role = "premium";
      req.user.id = "userId";
      req.params = { id: "quizId" };
      req.body = { question: "Q1" };

      const mockQuiz = {
        _id: "quizId",
        createdBy: { _id: "userId" },
        questions: [],
        difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
        save: jest.fn().mockResolvedValue(true)
      };

      Quiz.findById.mockResolvedValue(mockQuiz);

      await addQuestion(req, res);

      expect(mockQuiz.questions).toHaveLength(1);
      expect(res.json).toHaveBeenCalledWith(ok(mockQuiz));
    });

    it("should prevent premium user from adding question to others' quiz", async () => {
      req.user.role = "premium";
      req.user.id = "userId";
      req.params = { id: "quizId" };

      const mockQuiz = {
        _id: "quizId",
        title: "Other Quiz",
        createdBy: { _id: "otherUser" }
      };

      Quiz.findById.mockResolvedValue(mockQuiz);

      await addQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(err("You can only add questions to your own quizzes."));
    });

    it("should prevent regular user from adding question", async () => {
      req.user.role = "user";
      req.params = { id: "quizId" };
      const mockQuiz = { _id: "quizId" };

      Quiz.findById.mockResolvedValue(mockQuiz);

      await addQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(err("You do not have permission to add questions."));
    });

    it("should handle quiz not found", async () => {
      req.params = { id: "nonExistentId" };
      req.body = { question: "Test question" };

      Quiz.findById.mockResolvedValue(null);

      await addQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(err("Quiz not found"));
    });

    it("should handle database errors", async () => {
      req.params = { id: "quizId" };
      req.body = { question: "Test question" };

      Quiz.findById.mockRejectedValue(new Error("Database error"));

      await expect(addQuestion(req, res)).rejects.toThrow();
      // The controller throws; error middleware renders it. Asserting the
      // throw keeps this meaningful instead of asserting a body that is
      // never written.
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getQuizById", () => {
    it("should return quiz by id", async () => {
      req.params = { id: VALID_QUIZ_ID };
      req.user = { id: "userId" };
      const mockQuiz = { _id: VALID_QUIZ_ID, title: "Test Quiz" };

      Quiz.findById.mockResolvedValue(mockQuiz);

      await getQuizById(req, res);

      expect(Quiz.findById).toHaveBeenCalledWith(VALID_QUIZ_ID);
      expect(res.json).toHaveBeenCalledWith(ok(mockQuiz));
    });

    it("should reject an id that is not a valid ObjectId", async () => {
      // The guard itself, which nothing covered. Without this the suite would
      // pass just as happily if the validation were deleted.
      req.params = { id: "not-an-object-id" };
      req.user = { id: "userId" };

      await getQuizById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(Quiz.findById).not.toHaveBeenCalled();
    });

    it("should handle quiz not found", async () => {
      req.params = { id: MISSING_QUIZ_ID };
      req.user = { id: "userId" };

      Quiz.findById.mockResolvedValue(null);

      await getQuizById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(err("Quiz not found"));
    });

    it("should handle database errors", async () => {
      req.params = { id: VALID_QUIZ_ID };
      req.user = { id: "userId" };

      Quiz.findById.mockRejectedValue(new Error("Database error"));

      await expect(getQuizById(req, res)).rejects.toThrow();
      // The controller throws; error middleware renders it. Asserting the
      // throw keeps this meaningful instead of asserting a body that is
      // never written.
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("deleteQuestion", () => {
    it("should delete question successfully for admin", async () => {
      req.user.role = "admin";
      req.params = { id: "quizId", questionIndex: "0" };
      const mockQuiz = {
        _id: "quizId",
        questions: [
          { question: "Q1", difficulty: "easy" },
          { question: "Q2", difficulty: "medium" }
        ],
        totalMarks: 2,
        passingMarks: 1,
        duration: 4,
        difficultyDistribution: { easy: 1, medium: 1, hard: 0 },
        save: jest.fn().mockResolvedValue(true)
      };

      Quiz.findById.mockResolvedValue(mockQuiz);

      await deleteQuestion(req, res);

      expect(Quiz.findById).toHaveBeenCalledWith("quizId");
      expect(mockQuiz.questions).toHaveLength(1);
      expect(res.json).toHaveBeenCalledWith(
        okMsg("Question deleted successfully", mockQuiz));
    });

    it("should delete question for premium owner", async () => {
      req.user.role = "premium";
      req.user.id = "userId";
      req.params = { id: "quizId", questionIndex: "0" };

      const mockQuiz = {
        _id: "quizId",
        createdBy: { _id: "userId" },
        questions: [{ question: "Q1" }],
        difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
        save: jest.fn().mockResolvedValue(true)
      };

      Quiz.findById.mockResolvedValue(mockQuiz);

      await deleteQuestion(req, res);

      expect(mockQuiz.questions).toHaveLength(0);
      expect(res.json).toHaveBeenCalledWith(
        okMsg("Question deleted successfully", mockQuiz));
    });

    it("should prevent premium user from deleting question of others' quiz", async () => {
      req.user.role = "premium";
      req.user.id = "userId";
      req.params = { id: "quizId" };

      const mockQuiz = {
        _id: "quizId",
        title: "Other Quiz",
        createdBy: { _id: "otherUser" }
      };

      Quiz.findById.mockResolvedValue(mockQuiz);

      await deleteQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(err("You can only delete questions from your own quizzes."));
    });

    it("should prevent regular user from deleting question", async () => {
      req.user.role = "user";
      req.params = { id: "quizId" };
      const mockQuiz = { _id: "quizId" };

      Quiz.findById.mockResolvedValue(mockQuiz);

      await deleteQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(err("You do not have permission to delete questions."));
    });

    it("should handle quiz not found", async () => {
      req.params = { id: "nonExistentId", questionIndex: "0" };

      Quiz.findById.mockResolvedValue(null);

      await deleteQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(err("Quiz not found"));
    });

    it("should handle invalid question index", async () => {
      req.user.role = "admin";
      req.params = { id: "quizId", questionIndex: "5" };
      const mockQuiz = {
        _id: "quizId",
        questions: [{ question: "Q1" }]
      };

      Quiz.findById.mockResolvedValue(mockQuiz);

      await deleteQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(invalid("questionIndex", "Invalid question index"));
    });

    it("should handle database errors", async () => {
      req.params = { id: "quizId", questionIndex: "0" };

      Quiz.findById.mockRejectedValue(new Error("Database error"));

      await expect(deleteQuestion(req, res)).rejects.toThrow();
      // The controller throws; error middleware renders it. Asserting the
      // throw keeps this meaningful instead of asserting a body that is
      // never written.
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("updateQuizStats", () => {
    it("should update quiz stats successfully", async () => {
      req.body = {
        quizId: "quizId",
        score: 8,
        totalQuestions: 10,
        timeSpent: 300
      };

      const mockQuiz = {
        _id: "quizId",
        totalAttempts: 0,
        averageScore: 0,
        averageTime: 0,
        popularityScore: 0,
        save: jest.fn().mockResolvedValue(true)
      };

      Quiz.findById.mockResolvedValue(mockQuiz);

      await updateQuizStats(req, res);

      expect(Quiz.findById).toHaveBeenCalledWith("quizId");
      expect(mockQuiz.totalAttempts).toBe(1);
      expect(mockQuiz.averageScore).toBe(0.8);
      expect(mockQuiz.averageTime).toBe(300);
      expect(mockQuiz.popularityScore).toBe(0.8);
      expect(mockQuiz.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(okMsg("Quiz statistics updated successfully", {
          totalAttempts: 1,
          averageScore: 80,
          averageTime: 300,
          popularityScore: 80
      }));
    });

    it("should handle quiz not found", async () => {
      req.body = {
        quizId: "nonExistentId",
        score: 8,
        totalQuestions: 10,
        timeSpent: 300
      };

      Quiz.findById.mockResolvedValue(null);

      await updateQuizStats(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(err("Quiz not found"));
    });

    it("should handle database errors", async () => {
      req.body = {
        quizId: "quizId",
        score: 8,
        totalQuestions: 10,
        timeSpent: 300
      };

      Quiz.findById.mockRejectedValue(new Error("Database error"));

      await expect(updateQuizStats(req, res)).rejects.toThrow();
      // The controller throws; error middleware renders it. Asserting the
      // throw keeps this meaningful instead of asserting a body that is
      // never written.
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
