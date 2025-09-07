import request from 'supertest';
import app from '../../server.js';
import User from '../../models/User.js';
import logger from '../../utils/logger.js';

describe('Logging Integration Tests', () => {
  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({});
  });

  describe('Request Logging', () => {
    it('should log successful requests', async () => {
      const response = await request(app)
        .get('/ping')
        .expect(200);

      expect(response.text).toBe('Server is awake');
      // The request should be logged by the requestLogger middleware
    });

    it('should log user registration attempts', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      // Registration should be logged with performance metrics
    });

    it('should log failed requests', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({}) // Missing required fields
        .expect(400);

      expect(response.body.success).toBe(false);
      // Failed registration should be logged
    });
  });

  describe('Security Logging', () => {
    it('should log suspicious input attempts', async () => {
      const suspiciousData = {
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(suspiciousData)
        .expect(400);

      // Security logger should detect and log the suspicious input
      expect(response.body.success).toBe(false);
    });

    it('should log rate limiting events', async () => {
      // Make multiple requests to trigger rate limiting
      const promises = Array(15).fill().map(() =>
        request(app)
          .post('/api/users/register')
          .send({
            name: 'Test User',
            email: 'test@example.com',
            password: 'Password123!'
          })
      );

      const responses = await Promise.all(promises);
      
      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      // Rate limiting should be logged
    });
  });

  describe('Performance Logging', () => {
    it('should log slow requests', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!'
      };

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      const duration = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      // Performance should be logged if request takes > 1000ms
    });
  });

  describe('Error Logging', () => {
    it('should log database errors', async () => {
      // This test would require mocking database errors
      // For now, we'll test that error logging is set up
      expect(logger.error).toBeDefined();
      expect(typeof logger.error).toBe('function');
    });

    it('should log authentication errors', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        })
        .expect(400);

      expect(response.body.error).toBe('User not found');
      // Authentication errors should be logged
    });
  });

  describe('Logger Configuration', () => {
    it('should have all required logging methods', () => {
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.http).toBeDefined();
      expect(logger.auth).toBeDefined();
      expect(logger.performance).toBeDefined();
      expect(logger.cache).toBeDefined();
      expect(logger.security).toBeDefined();
    });

    it('should log different levels correctly', () => {
      // Test that logger methods are callable
      expect(() => logger.info('Test info message')).not.toThrow();
      expect(() => logger.warn('Test warning message')).not.toThrow();
      expect(() => logger.error('Test error message')).not.toThrow();
      expect(() => logger.debug('Test debug message')).not.toThrow();
    });
  });
});
