import request from 'supertest';
import app from '../../server.js';
import User from '../../models/User.js';

describe('API Integration Tests', () => {
  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({});
  });

  describe('Health Check', () => {
    it('should return server status', async () => {
      const response = await request(app)
        .get('/ping')
        .expect(200);

      expect(response.text).toBe('Server is awake');
    });
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.level).toBe(1);
      expect(response.body.user.xp).toBe(0);
    });

    it('should return error for duplicate email', async () => {
      // First, create a user
      await User.create({
        name: 'Existing User',
        email: 'test@example.com',
        password: 'password123',
        level: 1,
        xp: 0,
        unlockedThemes: ['default']
      });

      const userData = {
        name: 'New User',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should return error for missing required fields', async () => {
      const userData = {
        name: 'Test User'
        // Missing email and password
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        level: 1,
        xp: 0,
        unlockedThemes: ['default']
      });
    });

    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('should return error for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return error for invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/users/register')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      // Make multiple requests quickly to trigger rate limiting
      const promises = Array(15).fill().map(() =>
        request(app)
          .post('/api/users/register')
          .send(userData)
      );

      const responses = await Promise.all(promises);
      
      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
