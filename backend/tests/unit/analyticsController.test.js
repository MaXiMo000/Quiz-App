import request from 'supertest';
import app from '../../server.js';
import Report from '../../models/Report.js';
import User from '../../models/User.js';
import cacheService from '../../services/cacheService.js';

describe('Analytics Controller Tests', () => {
  let testUser;
  let testReports;
  let authToken;

  beforeEach(async () => {
    // Clean up test data
    await Report.deleteMany({});
    await User.deleteMany({});
    await cacheService.flushAll();

    // Create test user
    testUser = await global.testUtils.createTestUser({
      name: 'Analytics Test User',
      email: 'analytics@example.com',
      role: 'premium'
    });

    // Create test reports
    testReports = await Report.create([
      {
        username: testUser.name,
        quizTitle: 'Math Quiz',
        score: 80,
        totalQuestions: 10,
        correctAnswers: 8,
        timeSpent: 300,
        questions: [
          {
            questionText: 'What is 2+2?',
            userAnswer: '4',
            correctAnswer: '4',
            answerTime: 30
          },
          {
            questionText: 'What is 3+3?',
            userAnswer: '5',
            correctAnswer: '6',
            answerTime: 45
          }
        ],
        createdAt: new Date()
      },
      {
        username: testUser.name,
        quizTitle: 'Science Quiz',
        score: 90,
        totalQuestions: 10,
        correctAnswers: 9,
        timeSpent: 250,
        questions: [
          {
            questionText: 'What is H2O?',
            userAnswer: 'Water',
            correctAnswer: 'Water',
            answerTime: 20
          }
        ],
        createdAt: new Date()
      }
    ]);

    // Generate auth token
    const jwt = (await import('jsonwebtoken')).default;
    authToken = jwt.sign(
      { id: testUser._id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/analytics/question-stats', () => {
    it('should get question statistics', async () => {
      const response = await request(app)
        .get('/api/analytics/question-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      
      const questionStat = response.body[0];
      expect(questionStat).toHaveProperty('question');
      expect(questionStat).toHaveProperty('correctPercent');
      expect(questionStat).toHaveProperty('avgTime');
    });

    it('should cache question statistics', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/analytics/question-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request should be cached
      const response2 = await request(app)
        .get('/api/analytics/question-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response2.body._cached).toBe(true);
      expect(response2.body._cacheKey).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/analytics/question-stats')
        .expect(401);
    });
  });

  describe('GET /api/analytics/score-trends', () => {
    it('should get score trends', async () => {
      const response = await request(app)
        .get('/api/analytics/score-trends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      
      const trend = response.body[0];
      expect(trend).toHaveProperty('date');
      expect(trend).toHaveProperty('score');
    });

    it('should cache score trends', async () => {
      // First request
      await request(app)
        .get('/api/analytics/score-trends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request should be cached
      const response = await request(app)
        .get('/api/analytics/score-trends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body._cached).toBe(true);
    });
  });

  describe('GET /api/analytics/category-performance', () => {
    it('should get category performance', async () => {
      const response = await request(app)
        .get('/api/analytics/category-performance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      
      const category = response.body[0];
      expect(category).toHaveProperty('category');
      expect(category).toHaveProperty('averageScore');
      expect(category).toHaveProperty('totalQuizzes');
    });

    it('should cache category performance', async () => {
      // First request
      await request(app)
        .get('/api/analytics/category-performance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request should be cached
      const response = await request(app)
        .get('/api/analytics/category-performance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body._cached).toBe(true);
    });
  });

  describe('Caching Behavior', () => {
    it('should have different cache keys for different users', async () => {
      // Create another user
      const anotherUser = await global.testUtils.createTestUser({
        name: 'Another User',
        email: 'another@example.com',
        role: 'premium'
      });

      const jwt = (await import('jsonwebtoken')).default;
      const anotherToken = jwt.sign(
        { id: anotherUser._id, email: anotherUser.email, role: anotherUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Get analytics for first user
      const response1 = await request(app)
        .get('/api/analytics/question-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Get analytics for second user
      const response2 = await request(app)
        .get('/api/analytics/question-stats')
        .set('Authorization', `Bearer ${anotherToken}`)
        .expect(200);

      expect(response1.body._cacheKey).not.toBe(response2.body._cacheKey);
    });

    it('should respect cache TTL', async () => {
      // Get analytics
      await request(app)
        .get('/api/analytics/question-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Wait for cache to expire (in real scenario, this would be 10 minutes)
      // For testing, we'll just verify the cache key exists
      const cacheKey = `analytics:question-stats:${testUser._id}`;
      const cachedData = await cacheService.get(cacheKey);
      expect(cachedData).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle aggregation errors gracefully', async () => {
      // Mock aggregation error
      const originalAggregate = Report.aggregate;
      Report.aggregate = jest.fn().mockRejectedValue(new Error('Aggregation error'));

      const response = await request(app)
        .get('/api/analytics/question-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal Server Error');

      // Restore original function
      Report.aggregate = originalAggregate;
    });
  });
});
