import { runMigration } from '../../controllers/migrationController.js';
import Quiz from '../../models/Quiz.js';

jest.mock('../../models/Quiz.js');

describe('Migration Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('runMigration', () => {
        it('should run the migration successfully', async () => {
            const mockQuizzes = [
                {
                    _id: 'quiz1',
                    questions: [{ difficulty: 'easy' }, { difficulty: 'medium' }],
                },
            ];
            Quiz.find.mockResolvedValue(mockQuizzes);
            Quiz.findByIdAndUpdate.mockResolvedValue(true);

            await runMigration(req, res);

            expect(Quiz.find).toHaveBeenCalled();
            expect(Quiz.findByIdAndUpdate).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Migration completed successfully',
                    updatedCount: 1,
                })
            );
        });

        it('should handle migration failure', async () => {
            Quiz.find.mockRejectedValue(new Error('DB error'));

            await runMigration(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Migration failed',
                })
            );
        });
    });
});
