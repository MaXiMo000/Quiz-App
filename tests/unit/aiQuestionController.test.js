import { generateQuizQuestions } from '../../controllers/aiQuestionController.js';
import Quiz from '../../models/Quiz.js';
import mongoose from 'mongoose';
import { generateMCQ, generateTrueFalse } from '../../services/aiQuestionGenerator.js';
import { validateQuestion } from '../../services/contentQualityChecker.js';

jest.mock('../../models/Quiz.js');
jest.mock('../../services/aiQuestionGenerator.js');
jest.mock('../../services/contentQualityChecker.js');

describe('AI Question Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { id: 'quizId' },
            body: {
                topic: 'Test Topic',
                numQuestions: 2,
                questionType: 'mcq',
            },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mongoose.Types.ObjectId.isValid = jest.fn().mockReturnValue(true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateQuizQuestions', () => {
        it('should generate and add new questions to a quiz', async () => {
            const mockQuiz = {
                _id: 'quizId',
                questions: [],
                save: jest.fn().mockResolvedValue(true),
            };
            Quiz.findById.mockResolvedValue(mockQuiz);
            generateMCQ.mockResolvedValue({
                questions: [
                    { question: 'New Question 1', difficulty: 'easy' },
                    { question: 'New Question 2', difficulty: 'medium' },
                ],
            });
            validateQuestion.mockReturnValue(true);

            await generateQuizQuestions(req, res);

            expect(Quiz.findById).toHaveBeenCalledWith('quizId');
            expect(generateMCQ).toHaveBeenCalledWith('Test Topic', 2);
            expect(mockQuiz.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('2 new questions added successfully'),
                    questions: expect.any(Array),
                })
            );
            expect(mockQuiz.questions.length).toBe(2);
        });

        it('should return 404 if quiz not found', async () => {
            Quiz.findById.mockResolvedValue(null);

            await generateQuizQuestions(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Quiz not found' });
        });

        it('should handle invalid question type', async () => {
            req.body.questionType = 'invalid_type';

            await generateQuizQuestions(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid question type' });
        });
    });
});
