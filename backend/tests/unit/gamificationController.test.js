import { getCurrentDailyChallenge } from "../../controllers/gamificationController.js";
import DailyChallenge from "../../models/DailyChallenge.js";
import UserQuiz from "../../models/User.js";

jest.mock("../../models/DailyChallenge.js");
jest.mock("../../models/User.js");

describe("Gamification Controller", () => {
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

    describe("getCurrentDailyChallenge", () => {
        it("should return the current daily challenge", async () => {
            const mockChallenge = {
                toObject: () => ({}),
                participants: [],
            };
            DailyChallenge.find.mockReturnValue({
                populate: jest.fn().mockResolvedValue([mockChallenge]),
            });

            await getCurrentDailyChallenge(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    challenges: expect.any(Array),
                })
            );
        });
    });
});
