import { createWrittenTestReport, getWrittenTestReports } from "../../controllers/writtenTestReportController.js";
import WrittenTestReport from "../../models/WrittenTestReport.js";

jest.mock("../../models/WrittenTestReport.js");

describe("WrittenTestReport Controller", () => {
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

  describe("createWrittenTestReport", () => {
    it("should create a new written test report", async () => {
      req.body = {
        username: "testuser",
        testName: "Test Written Test",
        score: 10,
        total: 10,
        questions: [
            {
                questionText: "What is 2+2?",
                userAnswer: "4",
                correctAnswer: "4",
            }
        ],
      };

      WrittenTestReport.prototype.save = jest.fn().mockResolvedValue({});

      await createWrittenTestReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe("getWrittenTestReports", () => {
    it("should return all written test reports", async () => {
      WrittenTestReport.find = jest.fn().mockResolvedValue([{}, {}]);

      await getWrittenTestReports(req, res);

      expect(res.json).toHaveBeenCalledWith([{}, {}]);
    });
  });
});
