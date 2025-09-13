import { getSmartRecommendations } from '../../controllers/intelligenceController.js';
import UserQuiz from '../../models/User.js';
import Report from '../../models/Report.js';
import Quiz from '../../models/Quiz.js';

jest.mock('../../models/User.js');
jest.mock('../../models/Report.js');
jest.mock('../../models/Quiz.js');

describe('Intelligence Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { id: 'userId', role: 'user' },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getSmartRecommendations', () => {
        it('should return smart recommendations for a user', async () => {
            const mockUser = {
                _id: 'userId',
                name: 'testuser',
                level: 5,
                xp: 500,
                preferences: { weakAreas: [], strongAreas: [] },
            };
            const mockReports = [
                { quizName: 'Math Basics', score: 8, total: 10 },
                { quizName: 'Science Fun', score: 4, total: 10 },
            ];
            const mockQuizzes = [
                { _id: 'quiz1', title: 'Advanced Math', category: 'mathematics', toObject: () => ({ _id: 'quiz1', title: 'Advanced Math', category: 'mathematics' }) },
                { _id: 'quiz2', title: 'Intro to Physics', category: 'science', toObject: () => ({ _id: 'quiz2', title: 'Intro to Physics', category: 'science' }) },
            ];

            UserQuiz.findById.mockResolvedValue(mockUser);
            Report.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(mockReports),
            });
            Quiz.find.mockReturnValue({
                limit: jest.fn().mockResolvedValue(mockQuizzes),
            });
            Quiz.aggregate.mockResolvedValue([]);

            await getSmartRecommendations(req, res);

            expect(UserQuiz.findById).toHaveBeenCalledWith('userId');
            expect(Report.find).toHaveBeenCalled();
            expect(Quiz.find).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    recommendations: expect.any(Array),
                })
            );
            const response = res.json.mock.calls[0][0];
            expect(response.recommendations.length).toBeGreaterThan(0);
        });

        it('should return 404 if user not found', async () => {
            UserQuiz.findById.mockResolvedValue(null);

            await getSmartRecommendations(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
        });
    });
});
