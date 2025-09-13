import { createWrittenTest } from '../../controllers/writtenTestController.js';
import WrittenTest from '../../models/WrittenTest.js';

jest.mock('../../models/WrittenTest.js');

describe('Written Test Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {
                title: 'Test Written Test',
                category: 'Testing',
                questions: [{ question: 'Test Question', marks: 10 }],
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

    describe('createWrittenTest', () => {
        it('should create a new written test', async () => {
            const mockTest = {
                save: jest.fn().mockResolvedValue(true),
            };
            WrittenTest.prototype.save = mockTest.save;

            await createWrittenTest(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Success!' });
        });

        it('should return 400 if required fields are missing', async () => {
            req.body.title = '';

            await createWrittenTest(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Missing required fields' });
        });
    });
});
