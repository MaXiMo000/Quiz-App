import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import gamificationRoutes from '../../routes/gamificationRoutes.js';
import User from '../../models/User.js';
import Quiz from '../../models/Quiz.js';
import GroupChallenge from '../../models/GroupChallenge.js';

// Setup express app
const app = express();
app.use(express.json());

// Middleware to attach user to request if token is valid
app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = { id: decoded.id, role: decoded.role };
        } catch (err) {
            // ignore invalid token for tests that don't need auth
        }
    }
    next();
});

app.use('/api/gamification', gamificationRoutes);

describe('Gamification Controller v2', () => {
    let adminUser, quiz, adminToken;

    beforeAll(async () => {
        // Create a user and a quiz for testing
        adminUser = new User({ _id: new mongoose.Types.ObjectId(), name: 'Admin User', email: 'admin@example.com', password: 'password', role: 'admin' });
        await adminUser.save();

        quiz = new Quiz({ title: 'Test Quiz', createdBy: adminUser._id, questions: [] });
        await quiz.save();

        // Generate token
        adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Quiz.deleteMany({});
        await GroupChallenge.deleteMany({});
    });

    describe('POST /api/gamification/challenges/group/create', () => {
        it('should create a new group challenge if user is admin', async () => {
            const challengeData = {
                title: 'New Group Challenge',
                description: 'Challenge description',
                quizId: quiz._id,
                startTime: new Date(),
                endTime: new Date(Date.now() + 86400000), // 1 day from now
            };

            const res = await request(app)
                .post('/api/gamification/challenges/group/create')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(challengeData)
                .expect(201);

            expect(res.body.message).toBe('Group challenge created successfully');
            expect(res.body.groupChallenge.title).toBe(challengeData.title);

            const challenge = await GroupChallenge.findById(res.body.groupChallenge._id);
            expect(challenge).not.toBeNull();
            expect(challenge.title).toBe(challengeData.title);
        });

        it('should return 403 if user is not an admin', async () => {
            const user = new User({ name: 'Test User', email: 'test@example.com', password: 'password', role: 'user' });
            await user.save();
            const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

            const challengeData = {
                title: 'New Group Challenge',
                description: 'Challenge description',
                quizId: quiz._id,
                startTime: new Date(),
                endTime: new Date(Date.now() + 86400000),
            };

            const res = await request(app)
                .post('/api/gamification/challenges/group/create')
                .set('Authorization', `Bearer ${token}`)
                .send(challengeData)
                .expect(403);

            expect(res.body.message).toBe('Only admins can create group challenges');
        });
    });
});
