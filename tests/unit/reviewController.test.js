import { getReviewSchedule, updateReview } from '../../controllers/reviewController.js';
import { getReviewScheduleForUser, updateReviewSchedule } from '../../services/reviewScheduler.js';

jest.mock('../../services/reviewScheduler.js');

describe('Review Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { id: 'userId' },
            body: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getReviewSchedule', () => {
        it('should return the review schedule for a user', async () => {
            const mockSchedule = [{ question: 'Test Question', nextReviewDate: new Date() }];
            getReviewScheduleForUser.mockResolvedValue(mockSchedule);

            await getReviewSchedule(req, res);

            expect(getReviewScheduleForUser).toHaveBeenCalledWith('userId');
            expect(res.json).toHaveBeenCalledWith(mockSchedule);
        });
    });

    describe('updateReview', () => {
        it('should update the review schedule', async () => {
            req.body = {
                quizId: 'quizId',
                questionId: 'questionId',
                quality: 5,
            };
            const mockSchedule = { nextReviewDate: new Date() };
            updateReviewSchedule.mockResolvedValue(mockSchedule);

            await updateReview(req, res);

            expect(updateReviewSchedule).toHaveBeenCalledWith('userId', 'quizId', 'questionId', 5);
            expect(res.json).toHaveBeenCalledWith(mockSchedule);
        });
    });
});
