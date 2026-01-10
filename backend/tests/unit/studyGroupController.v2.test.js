import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import studyGroupRoutes from '../../routes/studyGroupRoutes.js';
import User from '../../models/User.js';
import StudyGroup from '../../models/StudyGroup.js';
import StudySession from '../../models/StudySession.js';

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

app.use('/api/study-groups', studyGroupRoutes);

describe('Study Group Controller v2', () => {
    let user, adminUser, studyGroup, token, adminToken;

    beforeAll(async () => {
        // Create users
        user = new User({ _id: new mongoose.Types.ObjectId(), name: 'Test User', email: 'test@example.com', password: 'password', role: 'user' });
        await user.save();
        adminUser = new User({ _id: new mongoose.Types.ObjectId(), name: 'Admin User', email: 'admin@example.com', password: 'password', role: 'admin' });
        await adminUser.save();

        // Create a study group
        studyGroup = new StudyGroup({
            name: 'Test Group',
            creator: adminUser._id,
            members: [{ user: adminUser._id, role: 'admin' }, { user: user._id, role: 'member' }]
        });
        await studyGroup.save();

        // Generate tokens
        token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    });

    afterAll(async () => {
        await User.deleteMany({});
        await StudyGroup.deleteMany({});
        await StudySession.deleteMany({});
    });

    describe('POST /api/study-groups/:groupId/schedule-session', () => {
        it('should schedule a new study session for a group if user is admin', async () => {
            const sessionData = {
                title: 'New Session',
                description: 'Session description',
                scheduledTime: new Date(Date.now() + 3600000), // 1 hour from now
                duration: 60
            };

            const res = await request(app)
                .post(`/api/study-groups/${studyGroup._id}/schedule-session`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(sessionData)
                .expect(201);

            expect(res.body.message).toBe('Study session scheduled successfully');
            expect(res.body.session.title).toBe(sessionData.title);

            const session = await StudySession.findById(res.body.session._id);
            expect(session).not.toBeNull();
            expect(session.title).toBe(sessionData.title);
        });

        it('should return 403 if user is not an admin', async () => {
            const sessionData = {
                title: 'New Session',
                scheduledTime: new Date(),
                duration: 60
            };

            const res = await request(app)
                .post(`/api/study-groups/${studyGroup._id}/schedule-session`)
                .set('Authorization', `Bearer ${token}`)
                .send(sessionData)
                .expect(403);

            expect(res.body.message).toBe('Only admins can schedule sessions');
        });
    });
});
