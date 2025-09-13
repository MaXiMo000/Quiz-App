import { getLearningPaths } from "../../controllers/learningPathController.js";
import { LearningPath, UserPathProgress } from "../../models/LearningPath.js";
import User from "../../models/User.js";
import Report from "../../models/Report.js";

jest.mock("../../models/LearningPath.js", () => ({
    __esModule: true,
    LearningPath: {
        find: jest.fn(),
        countDocuments: jest.fn(),
    },
    UserPathProgress: {
        find: jest.fn(),
    },
}));
jest.mock("../../models/User.js", () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
    }
}));
jest.mock("../../models/Report.js", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
    }
}));
jest.mock("../../utils/seedLearningPaths.js");

describe("Learning Path Controller", () => {
    let req, res;

    beforeEach(() => {
        req = {
            query: {},
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

    describe("getLearningPaths", () => {
        it("should return learning paths", async () => {
            const mockPaths = [
                {
                    _id: "lp1",
                    title: "LP 1",
                    subject: "JavaScript",
                    quizzes: [{ _id: "quiz1" }],
                    toObject: () => ({ _id: "lp1", title: "LP 1", subject: "JavaScript", quizzes: [{ _id: "quiz1" }] })
                }
            ];
            const mockReports = [
                {
                    _id: "r1",
                    username: "testuser",
                    quizName: "JavaScript Basics",
                    score: 8,
                    total: 10,
                    createdAt: new Date(),
                    toObject: () => ({ _id: "r1", username: "testuser", quizName: "JavaScript Basics", score: 8, total: 10, createdAt: new Date() })
                }
            ];

            LearningPath.find.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockPaths)
            });
            LearningPath.countDocuments.mockResolvedValue(1);
            UserPathProgress.find.mockResolvedValue([]);
            User.findById.mockResolvedValue({ name: "testuser", email: "test@example.com" });
            Report.find.mockReturnValue({
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockReports)
            });

            await getLearningPaths(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    paths: expect.any(Array),
                })
            );
        });
    });
});
