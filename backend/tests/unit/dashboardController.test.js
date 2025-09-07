import request from 'supertest';
import app from '../../server.js';
import User from '../../models/User.js';
import Quiz from '../../models/Quiz.js';
import Report from '../../models/Report.js';
import cacheService from '../../services/cacheService.js';

describe('Dashboard Controller Tests', () => {
  let testUser;
  let testQuiz;
  let testReports;
  let authToken;

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Quiz.deleteMany({});
    await Report.deleteMany({});
    await cacheService.flushAll();

    // Create test user
    testUser = await global.testUtils.createTestUser({
      name: 'Dashboard Test User',
      email: 'dashboard@example.com',
      role: 'premium',
      level: 5,
      xp: 500
    });

    // Create test quiz
    testQuiz = await Quiz.create({
      title: 'Dashboard Test Quiz',
      category: 'General',
      duration: 30,
      totalMarks: 10,
      passingMarks: 6,
      questions: [
        {
          questionText: 'What is 2+2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: '4',
          marks: 1
        }
      ],
      createdBy: { _id: testUser._id, name: testUser.name }
    });

    // Create test reports
    testReports = await Report.create([
      {
        username: testUser.name,
        quizTitle: 'Dashboard Test Quiz',
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

  describe('GET /api/dashboard/:userId', () => {
    it('should get dashboard data for user', async () => {
      const response = await request(app)
        .get(`/api/dashboard/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalQuizzes');
      expect(response.body).toHaveProperty('completedQuizzes');
      expect(response.body).toHaveProperty('averageScore');
      expect(response.body).toHaveProperty('currentStreak');
      expect(response.body).toHaveProperty('weeklyProgress');
      expect(response.body).toHaveProperty('categoryPerformance');
      expect(response.body).toHaveProperty('userLevel');
      expect(response.body).toHaveProperty('userXP');
    });

    it('should cache dashboard data', async () => {
      // First request
      const response1 = await request(app)
        .get(`/api/dashboard/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request should be cached
      const response2 = await request(app)
        .get(`/api/dashboard/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response2.body._cached).toBe(true);
      expect(response2.body._cacheKey).toBeDefined();
    });

    it('should handle different time ranges', async () => {
      const timeRanges = ['week', 'month', 'year'];
      
      for (const timeRange of timeRanges) {
        const response = await request(app)
          .get(`/api/dashboard/${testUser._id}?timeRange=${timeRange}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('totalQuizzes');
        expect(response.body).toHaveProperty('weeklyProgress');
      }
    });

    it('should return 404 for non-existent user', async () => {
      const fakeUserId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
      
      await request(app)
        .get(`/api/dashboard/${fakeUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/dashboard/${testUser._id}`)
        .expect(401);
    });
  });

  describe('GET /api/dashboard/:userId/leaderboard', () => {
    it('should get user leaderboard position', async () => {
      const response = await request(app)
        .get(`/api/dashboard/${testUser._id}/leaderboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('position');
      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('percentile');
      expect(typeof response.body.position).toBe('number');
      expect(typeof response.body.totalUsers).toBe('number');
      expect(typeof response.body.percentile).toBe('number');
    });

    it('should cache leaderboard data', async () => {
      // First request
      await request(app)
        .get(`/api/dashboard/${testUser._id}/leaderboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request should be cached
      const response = await request(app)
        .get(`/api/dashboard/${testUser._id}/leaderboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body._cached).toBe(true);
    });
  });

  describe('GET /api/dashboard/:userId/achievements', () => {
    it('should get user achievements', async () => {
      const response = await request(app)
        .get(`/api/dashboard/${testUser._id}/achievements`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      // Should have some achievements based on user data
    });

    it('should cache achievements data', async () => {
      // First request
      await request(app)
        .get(`/api/dashboard/${testUser._id}/achievements`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request should be cached
      const response = await request(app)
        .get(`/api/dashboard/${testUser._id}/achievements`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body._cached).toBe(true);
    });
  });

  describe('Caching Behavior', () => {
    it('should have different cache keys for different users', async () => {
      // Create another user
      const anotherUser = await global.testUtils.createTestUser({
        name: 'Another Dashboard User',
        email: 'another@example.com',
        role: 'premium'
      });

      const jwt = (await import('jsonwebtoken')).default;
      const anotherToken = jwt.sign(
        { id: anotherUser._id, email: anotherUser.email, role: anotherUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Get dashboard for first user
      const response1 = await request(app)
        .get(`/api/dashboard/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Get dashboard for second user
      const response2 = await request(app)
        .get(`/api/dashboard/${anotherUser._id}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .expect(200);

      expect(response1.body._cacheKey).not.toBe(response2.body._cacheKey);
    });

    it('should have different cache keys for different time ranges', async () => {
      // Get dashboard for week
      const response1 = await request(app)
        .get(`/api/dashboard/${testUser._id}?timeRange=week`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Get dashboard for month
      const response2 = await request(app)
        .get(`/api/dashboard/${testUser._id}?timeRange=month`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response1.body._cacheKey).not.toBe(response2.body._cacheKey);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalFindById = User.findById;
      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/dashboard/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal Server Error');

      // Restore original function
      User.findById = originalFindById;
    });

    it('should handle invalid user ID format', async () => {
      await request(app)
        .get('/api/dashboard/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
    });
  });
});
