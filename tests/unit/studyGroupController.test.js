import { createStudyGroup } from '../../controllers/studyGroupController.js';
import StudyGroup from '../../models/StudyGroup.js';
import UserQuiz from '../../models/User.js';

jest.mock('../../models/StudyGroup.js');
jest.mock('../../models/User.js');

describe('Study Group Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { id: 'userId' },
            body: {
                name: 'Test Group',
                description: 'A group for testing',
            },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createStudyGroup', () => {
        it('should create a new study group', async () => {
            const mockGroup = {
                _id: 'groupId',
                name: 'Test Group',
                save: jest.fn().mockResolvedValue(true),
                populate: jest.fn().mockResolvedValue({}),
            };
            StudyGroup.prototype.save = mockGroup.save;
            StudyGroup.prototype.populate = mockGroup.populate;
            UserQuiz.findById.mockResolvedValue({ _id: 'userId', social: { socialStats: { groupsCreated: 0 } } });
            UserQuiz.findByIdAndUpdate.mockResolvedValue(true);

            await createStudyGroup(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Study group created successfully',
                })
            );
        });

        it('should return 400 for invalid group name', async () => {
            req.body.name = 'a';

            await createStudyGroup(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Study group name must be at least 3 characters' });
        });
    });
});
