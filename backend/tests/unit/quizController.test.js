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
      expect(res.json).toHaveBeenCalledWith(mockQuizData);
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
      expect(res.json).toHaveBeenCalledWith(mockQuizData);
    });

    it("should reject non-admin/premium users", async () => {
      req.user.role = "user";
      req.body = {
        title: "Test Quiz",
        category: "Programming",
      };

      await createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Only admins or premium users can create quizzes"
      });
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
      expect(res.json).toHaveBeenCalledWith({
        message: "User not found"
      });
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

      await createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Server error"
      });
    });
  });

  describe("getQuizzes", () => {
    it("should return all quizzes for admin", async () => {
      req.user.role = "admin";
      const mockQuizzes = [{ _id: "quiz1" }, { _id: "quiz2" }];

      Quiz.find.mockResolvedValue(mockQuizzes);

      await getQuizzes(req, res);

      expect(Quiz.find).toHaveBeenCalledWith();
      expect(res.json).toHaveBeenCalledWith(mockQuizzes);
    });

    it("should return filtered quizzes for premium user", async () => {
      req.user.role = "premium";
      req.user.id = "userId";
      const mockQuizzes = [{ _id: "quiz1" }, { _id: "quiz2" }];

      Quiz.find.mockResolvedValue(mockQuizzes);

      await getQuizzes(req, res);

      expect(Quiz.find).toHaveBeenCalledWith({
        $or: [
          { "createdBy._id": "userId" },
          { "createdBy._id": null }
        ]
      });
      expect(res.json).toHaveBeenCalledWith(mockQuizzes);
    });

    it("should return only admin quizzes for regular user", async () => {
      req.user.role = "user";
      const mockQuizzes = [{ _id: "quiz1" }];

      Quiz.find.mockResolvedValue(mockQuizzes);

      await getQuizzes(req, res);

      expect(Quiz.find).toHaveBeenCalledWith({ "createdBy._id": null });
      expect(res.json).toHaveBeenCalledWith(mockQuizzes);
    });

    it("should handle database errors", async () => {
      req.user.role = "admin";
      Quiz.find.mockRejectedValue(new Error("Database error"));

      await getQuizzes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Server error"
      });
    });
  });

  describe("deleteQuiz", () => {
    it("should delete quiz successfully", async () => {
      req.query = { title: "Test Quiz" };
      const mockQuiz = { _id: "quizId", title: "Test Quiz" };

      Quiz.findOne.mockResolvedValue(mockQuiz);
      Quiz.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await deleteQuiz(req, res);

      expect(Quiz.findOne).toHaveBeenCalledWith({ title: "Test Quiz" });
      expect(Quiz.deleteOne).toHaveBeenCalledWith({ title: "Test Quiz" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Quiz deleted successfully!"
      });
    });

    it("should handle missing title", async () => {
      req.query = {};

      await deleteQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Quiz title is required"
      });
    });

    it("should handle quiz not found", async () => {
      req.query = { title: "Non-existent Quiz" };
      Quiz.findOne.mockResolvedValue(null);

      await deleteQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Quiz not found"
      });
    });

    it("should handle database errors", async () => {
      req.query = { title: "Test Quiz" };
      Quiz.findOne.mockRejectedValue(new Error("Database error"));

      await deleteQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error deleting quiz",
        error: "Database error"
      });
    });
  });

  describe("addQuestion", () => {
    it("should add question to quiz successfully", async () => {
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
      expect(mockQuiz.totalMarks).toBe(1);
      expect(mockQuiz.passingMarks).toBe(0);
      expect(mockQuiz.duration).toBe(2);
      expect(mockQuiz.difficultyDistribution.easy).toBe(1);
      expect(mockQuiz.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockQuiz);
    });

    it("should handle quiz not found", async () => {
      req.params = { id: "nonExistentId" };
      req.body = { question: "Test question" };

      Quiz.findById.mockResolvedValue(null);

      await addQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Quiz not found"
      });
    });

    it("should handle database errors", async () => {
      req.params = { id: "quizId" };
      req.body = { question: "Test question" };

      Quiz.findById.mockRejectedValue(new Error("Database error"));

      await addQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error adding question",
        error: expect.any(Error)
      });
    });
  });

  describe("getQuizById", () => {
    it("should return quiz by id", async () => {
      req.params = { id: "quizId" };
      req.user = { id: "userId" };
      const mockQuiz = { _id: "quizId", title: "Test Quiz" };

      Quiz.findById.mockResolvedValue(mockQuiz);

      await getQuizById(req, res);

      expect(Quiz.findById).toHaveBeenCalledWith("quizId");
      expect(res.json).toHaveBeenCalledWith(mockQuiz);
    });

    it("should handle quiz not found", async () => {
      req.params = { id: "nonExistentId" };
      req.user = { id: "userId" };

      Quiz.findById.mockResolvedValue(null);

      await getQuizById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Quiz not found"
      });
    });

    it("should handle database errors", async () => {
      req.params = { id: "quizId" };
      req.user = { id: "userId" };

      Quiz.findById.mockRejectedValue(new Error("Database error"));

      await getQuizById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error fetching quiz",
        error: expect.any(Error)
      });
    });
  });

  describe("deleteQuestion", () => {
    it("should delete question successfully", async () => {
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
      expect(mockQuiz.totalMarks).toBe(1);
      expect(mockQuiz.passingMarks).toBe(0);
      expect(mockQuiz.duration).toBe(2);
      expect(mockQuiz.difficultyDistribution.easy).toBe(0);
      expect(mockQuiz.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: "Question deleted successfully",
        quiz: mockQuiz
      });
    });

    it("should handle quiz not found", async () => {
      req.params = { id: "nonExistentId", questionIndex: "0" };

      Quiz.findById.mockResolvedValue(null);

      await deleteQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Quiz not found"
      });
    });

    it("should handle invalid question index", async () => {
      req.params = { id: "quizId", questionIndex: "5" };
      const mockQuiz = {
        _id: "quizId",
        questions: [{ question: "Q1" }]
      };

      Quiz.findById.mockResolvedValue(mockQuiz);

      await deleteQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid question index"
      });
    });

    it("should handle database errors", async () => {
      req.params = { id: "quizId", questionIndex: "0" };

      Quiz.findById.mockRejectedValue(new Error("Database error"));

      await deleteQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error deleting question",
        error: expect.any(Error)
      });
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
      expect(res.json).toHaveBeenCalledWith({
        message: "Quiz statistics updated successfully",
        stats: {
          totalAttempts: 1,
          averageScore: 80,
          averageTime: 300,
          popularityScore: 80
        }
      });
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
      expect(res.json).toHaveBeenCalledWith({
        message: "Quiz not found"
      });
    });

    it("should handle database errors", async () => {
      req.body = {
        quizId: "quizId",
        score: 8,
        totalQuestions: 10,
        timeSpent: 300
      };

      Quiz.findById.mockRejectedValue(new Error("Database error"));

      await updateQuizStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error updating quiz stats",
        error: expect.any(Error)
      });
    });
  });
});
