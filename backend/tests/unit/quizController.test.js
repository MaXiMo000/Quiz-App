import { createQuiz, getQuizzes } from "../../controllers/quizController.js";
import Quiz from "../../models/Quiz.js";
import UserQuiz from "../../models/User.js";

jest.mock("../../models/Quiz.js");
jest.mock("../../models/User.js");

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
    it("should create a new quiz", async () => {
      req.user.role = "admin";
      req.body = {
        title: "Test Quiz",
        description: "A test quiz",
        questions: [],
      };

      Quiz.prototype.save = jest.fn().mockResolvedValue({});
      UserQuiz.findById = jest.fn().mockResolvedValue({ _id: "userId", name: "testuser" });

      await createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe("getQuizzes", () => {
    it("should return all quizzes", async () => {
      Quiz.find = jest.fn().mockResolvedValue([{}, {}]);

      await getQuizzes(req, res);

      expect(res.json).toHaveBeenCalledWith([{}, {}]);
    });
  });
});
