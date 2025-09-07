import request from 'supertest';
import app from '../../server.js';
import Report from '../../models/Report.js';
import User from '../../models/User.js';
import cacheService from '../../services/cacheService.js';

describe('Report Controller Tests', () => {
  let testUser;
  let testReport;
  let authToken;

  beforeEach(async () => {
    // Clean up test data
    await Report.deleteMany({});
    await User.deleteMany({});
    await cacheService.flushAll();

    // Create test user
    testUser = await global.testUtils.createTestUser({
      name: 'Report Test User',
      email: 'report@example.com',
      role: 'premium'
    });

    // Create test report
    testReport = await Report.create({
      username: testUser.name,
      quizTitle: 'Test Quiz',
      score: 80,
      total: 10,
      questions: [
        {
          questionText: 'What is 2+2?',
          userAnswer: '4',
          correctAnswer: '4',
          answerTime: 30
        }
      ]
    });

    // Generate auth token
    const jwt = (await import('jsonwebtoken')).default;
    authToken = jwt.sign(
      { id: testUser._id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/reports', () => {
    it('should get all reports', async () => {
      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('username');
      expect(response.body[0]).toHaveProperty('quizTitle');
    });

    it('should cache reports data', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request should be cached
      const response2 = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response2.body._cached).toBe(true);
      expect(response2.body._cacheKey).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/reports')
        .expect(401);
    });
  });

  describe('POST /api/reports', () => {
    it('should create a new report', async () => {
      const reportData = {
        username: testUser.name,
        quizName: 'New Test Quiz',
        score: 90,
        total: 10,
        questions: [
          {
            questionText: 'What is 3+3?',
            userAnswer: '6',
            correctAnswer: '6',
            answerTime: 25
          }
        ]
      };

      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(201);

      expect(response.body.message).toBe('Report saved and bonuses applied!');
      expect(response.body.report).toHaveProperty('username', reportData.username);
      expect(response.body.report).toHaveProperty('quizName', reportData.quizName);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toBe('Missing required fields');
    });

    it('should require authentication', async () => {
      const reportData = {
        username: 'Test User',
        quizName: 'Test Quiz',
        score: 80,
        total: 10,
        questions: []
      };

      await request(app)
        .post('/api/reports')
        .send(reportData)
        .expect(401);
    });
  });

  describe('GET /api/reports/user', () => {
    it('should get reports for specific user', async () => {
      const response = await request(app)
        .get('/api/reports/user')
        .query({ username: testUser.name })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].username).toBe(testUser.name);
    });

    it('should get all reports when no username provided', async () => {
      const response = await request(app)
        .get('/api/reports/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should cache user reports', async () => {
      // First request
      await request(app)
        .get('/api/reports/user')
        .query({ username: testUser.name })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request should be cached
      const response = await request(app)
        .get('/api/reports/user')
        .query({ username: testUser.name })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body._cached).toBe(true);
    });
  });

  describe('GET /api/reports/:id', () => {
    it('should get report by ID', async () => {
      const response = await request(app)
        .get(`/api/reports/${testReport._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body._id).toBe(testReport._id.toString());
      expect(response.body.username).toBe(testUser.name);
    });

    it('should return 404 for non-existent report', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/reports/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should cache report by ID', async () => {
      // First request
      await request(app)
        .get(`/api/reports/${testReport._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request should be cached
      const response = await request(app)
        .get(`/api/reports/${testReport._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body._cached).toBe(true);
    });
  });

  describe('Caching Behavior', () => {
    it('should have different cache keys for different users', async () => {
      // Create another user
      const anotherUser = await global.testUtils.createTestUser({
        name: 'Another Report User',
        email: 'another@example.com',
        role: 'premium'
      });

      const jwt = (await import('jsonwebtoken')).default;
      const anotherToken = jwt.sign(
        { id: anotherUser._id, email: anotherUser.email, role: anotherUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Get reports for first user
      const response1 = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Get reports for second user
      const response2 = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${anotherToken}`)
        .expect(200);

      expect(response1.body._cacheKey).not.toBe(response2.body._cacheKey);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalFind = Report.find;
      Report.find = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal Server Error');

      // Restore original function
      Report.find = originalFind;
    });
  });
});
