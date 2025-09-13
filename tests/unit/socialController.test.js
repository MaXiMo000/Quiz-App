import { getFriends } from '../../controllers/socialController.js';
import UserQuiz from '../../models/User.js';
import Friend from '../../models/Friend.js';

jest.mock('../../models/User.js');
jest.mock('../../models/Friend.js');

describe('Social Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { id: 'userId' },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getFriends', () => {
        it('should return a list of friends', async () => {
            const mockUser = {
                social: {
                    friends: [
                        { _id: 'friend1', name: 'Friend One', social: { privacy: { profileVisibility: 'public' } } },
                        { _id: 'friend2', name: 'Friend Two', social: { privacy: { profileVisibility: 'public' } } },
                    ],
                },
            };
            UserQuiz.findById.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue(mockUser),
            });

            await getFriends(req, res);

            expect(UserQuiz.findById).toHaveBeenCalledWith('userId');
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    friends: expect.any(Array),
                    totalFriends: 2,
                })
            );
        });

        it('should return 404 if user not found', async () => {
            UserQuiz.findById.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue(null),
            });

            await getFriends(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
        });
    });
});
