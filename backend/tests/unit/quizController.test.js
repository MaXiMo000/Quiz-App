import request from 'supertest';
import app from '../../server.js';
import Quiz from '../../models/Quiz.js';
import User from '../../models/User.js';
import cacheService from '../../services/cacheService.js';

describe('Quiz Controller Tests', () => {
  let testUser;
  let testQuiz;
  let authToken;

  beforeEach(async () => {
    // Clean up test data
    await Quiz.deleteMany({});
    await User.deleteMany({});
    await cacheService.flushAll();

    // Create test user
    testUser = await global.testUtils.createTestUser({
      name: 'Test User',
      email: 'test@example.com',
      role: 'premium'
    });

    // Create test quiz
    testQuiz = await Quiz.create({
      title: 'Test Quiz',
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

    // Generate auth token
    const jwt = (await import('jsonwebtoken')).default;
    authToken = jwt.sign(
      { id: testUser._id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/quizzes', () => {
    it('should get quizzes for premium user', async () => {
      const response = await request(app)
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('title');
    });

    it('should cache quiz data', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request should be cached
      const response2 = await request(app)
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response2.body._cached).toBe(true);
      expect(response2.body._cacheKey).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/quizzes')
        .expect(401);
    });
  });

  describe('POST /api/quizzes', () => {
    it('should create a new quiz for premium user', async () => {
      const quizData = {
        title: 'New Test Quiz',
        category: 'Science'
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(quizData)
        .expect(201);

      expect(response.body.title).toBe(quizData.title);
      expect(response.body.category).toBe(quizData.category);
      expect(response.body.createdBy._id).toBe(testUser._id.toString());
    });

    it('should not allow regular users to create quizzes', async () => {
      // Create regular user
      const regularUser = await global.testUtils.createTestUser({
        role: 'user'
      });

      const jwt = (await import('jsonwebtoken')).default;
      const regularToken = jwt.sign(
        { id: regularUser._id, email: regularUser.email, role: regularUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const quizData = {
        title: 'New Test Quiz',
        category: 'Science'
      };

      await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(quizData)
        .expect(403);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('required');
    });
  });

  describe('DELETE /api/quizzes', () => {
    it('should delete a quiz by title', async () => {
      const response = await request(app)
        .delete('/api/quizzes')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ title: 'Test Quiz' })
        .expect(200);

      expect(response.body.message).toBe('Quiz deleted successfully!');

      // Verify quiz is deleted
      const deletedQuiz = await Quiz.findOne({ title: 'Test Quiz' });
      expect(deletedQuiz).toBeNull();
    });

    it('should return 404 for non-existent quiz', async () => {
      await request(app)
        .delete('/api/quizzes')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ title: 'Non-existent Quiz' })
        .expect(404);
    });
  });

  describe('Caching Behavior', () => {
    it('should invalidate cache when quiz is created', async () => {
      // Get initial quizzes
      await request(app)
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Create new quiz
      await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Cache Test Quiz',
          category: 'Test'
        })
        .expect(201);

      // Get quizzes again - should not be cached
      const response = await request(app)
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body._cached).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalFind = Quiz.find;
      Quiz.find = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal Server Error');

      // Restore original function
      Quiz.find = originalFind;
    });
  });
});
