import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import collaborativeRoutes from '../../routes/collaborativeRoutes.js';
import * as collaborativeQuizService from '../../services/collaborativeQuizService.js';

// Mock the service
jest.mock('../../services/collaborativeQuizService.js');

const app = express();
app.use(express.json());

// Mock auth middleware
const auth = (req, res, next) => {
    req.user = { id: new mongoose.Types.ObjectId().toString() };
    next();
};

app.use('/api/collaborative', auth, collaborativeRoutes);

describe('Collaborative Controller', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/collaborative/sessions', () => {
        it('should create a new collaborative session and return it', async () => {
            const mockSession = { _id: new mongoose.Types.ObjectId(), roomId: 'ABCD', host: 'user1' };
            collaborativeQuizService.createSession.mockResolvedValue(mockSession);

            const res = await request(app)
                .post('/api/collaborative/sessions')
                .send({ quizId: new mongoose.Types.ObjectId(), settings: {} })
                .expect(201);

            expect(res.body.session).toEqual(expect.objectContaining({ roomId: 'ABCD' }));
            expect(collaborativeQuizService.createSession).toHaveBeenCalledTimes(1);
        });

        it('should handle errors during session creation', async () => {
            collaborativeQuizService.createSession.mockRejectedValue(new Error('Failed to create'));

            const res = await request(app)
                .post('/api/collaborative/sessions')
                .send({ quizId: new mongoose.Types.ObjectId() })
                .expect(500);

            expect(res.body.message).toBe('Failed to create collaborative session');
        });
    });

    describe('POST /api/collaborative/sessions/:roomId/join', () => {
        it('should allow a user to join a session', async () => {
            const mockSession = { _id: new mongoose.Types.ObjectId(), roomId: 'ABCD', players: ['user1', 'user2'] };
            collaborativeQuizService.joinSession.mockResolvedValue(mockSession);

            const res = await request(app)
                .post('/api/collaborative/sessions/ABCD/join')
                .expect(200);

            expect(res.body.session.players).toHaveLength(2);
            expect(collaborativeQuizService.joinSession).toHaveBeenCalledWith('ABCD', expect.any(String));
        });

        it('should handle errors when joining a session', async () => {
            collaborativeQuizService.joinSession.mockRejectedValue(new Error('Session not found'));

            const res = await request(app)
                .post('/api/collaborative/sessions/XYZ/join')
                .expect(500);

            expect(res.body.message).toBe('Failed to join collaborative session');
        });
    });
});
